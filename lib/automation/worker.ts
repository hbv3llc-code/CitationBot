/**
 * CitationBot Automation Worker
 *
 * Processes bulk run jobs from the database queue.
 * Run with: npm run worker
 *
 * The worker polls for pending bulk_run_result rows, processes them in batches
 * up to the run's configured concurrency, and saves results back to the database.
 */

import {
  db,
  bulkRuns,
  bulkRunResults,
  businesses,
  businessDescriptions,
  backlinkPool,
  proxyPool,
  sites,
  siteAdapters,
  citationAccounts,
  monitoringChecks,
} from "@/lib/db";
import { eq, and, inArray, lte, isNotNull, asc, sql } from "drizzle-orm";
import { runSignup, checkProfileHealth } from "./engine";
import { waitForVerificationEmail } from "./email-verifier";
import { decrypt, generatePassword, encrypt } from "@/lib/crypto";
import type { Business, BusinessFields, Proxy } from "@/types";

const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS ?? "5000", 10);

// ============================================================
// MAIN LOOP
// ============================================================

export async function run(): Promise<void> {
  console.log("[worker] CitationBot worker started");

  while (true) {
    try {
      await tick();
    } catch (err) {
      console.error("[worker] Uncaught error in tick:", err);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

async function tick(): Promise<void> {
  await Promise.all([
    processPendingRuns(),
    processDueMonitoringChecks(),
  ]);
}

// ============================================================
// BULK RUNS
// ============================================================

async function processPendingRuns(): Promise<void> {
  const runs = await db
    .select()
    .from(bulkRuns)
    .where(inArray(bulkRuns.status, ["pending", "running"]))
    .orderBy(asc(bulkRuns.created_at));

  for (const run of runs) {
    await processRun(run);
  }
}

async function processRun(run: {
  id: string;
  business_id: string;
  concurrency: number;
  status: string;
}): Promise<void> {
  // Mark as running on first tick
  if (run.status === "pending") {
    await db
      .update(bulkRuns)
      .set({ status: "running", started_at: new Date() })
      .where(eq(bulkRuns.id, run.id));
  }

  // Load business + active descriptions + backlinks + proxies
  const [businessRows, descRows, backlinkRows, proxyRows] = await Promise.all([
    db.select().from(businesses).where(eq(businesses.id, run.business_id)).limit(1),
    db.select().from(businessDescriptions)
      .where(and(
        eq(businessDescriptions.business_id, run.business_id),
        eq(businessDescriptions.approved, true)
      )),
    db.select().from(backlinkPool)
      .where(eq(backlinkPool.business_id, run.business_id))
      .orderBy(asc(backlinkPool.created_at)),
    db.select().from(proxyPool)
      .where(and(eq(proxyPool.is_active, true), eq(proxyPool.is_flagged, false)))
      .orderBy(asc(proxyPool.last_used_at)),
  ]);

  const business = businessRows[0];

  if (!business) {
    console.error(`[worker] Business not found for run ${run.id}`);
    await db
      .update(bulkRuns)
      .set({ status: "failed", completed_at: new Date() })
      .where(eq(bulkRuns.id, run.id));
    return;
  }

  // Pick pending results up to concurrency limit
  const pendingResults = await db
    .select()
    .from(bulkRunResults)
    .where(and(
      eq(bulkRunResults.bulk_run_id, run.id),
      eq(bulkRunResults.status, "pending")
    ))
    .limit(run.concurrency);

  if (pendingResults.length === 0) {
    await maybeCompleteRun(run.id);
    return;
  }

  await Promise.all(
    pendingResults.map((result, index) =>
      processJob(result, index, business as unknown as Business, descRows, backlinkRows, proxyRows as unknown as Proxy[])
    )
  );

  await maybeCompleteRun(run.id);
}

export async function processJob(
  result: { id: string; bulk_run_id: string; site_id: string | null; site_name: string; signup_url: string },
  jobIndex: number,
  business: Business,
  descriptions: Array<{ id: string; content: string }>,
  backlinks: Array<{ url: string; anchor_text: string }>,
  proxies: Proxy[]
): Promise<void> {
  console.log(`[worker] Processing: ${result.site_name} (run=${result.bulk_run_id})`);

  // Mark result as running
  await db
    .update(bulkRunResults)
    .set({ status: "running", started_at: new Date() })
    .where(eq(bulkRunResults.id, result.id));

  try {
    if (result.site_id) {
      const [siteRow] = await db
        .select({ is_blocked: sites.is_blocked, adapter_status: sites.adapter_status })
        .from(sites)
        .where(eq(sites.id, result.site_id))
        .limit(1);

      if (siteRow?.is_blocked) {
        await finishResult(result.id, result.bulk_run_id, "blocked", "Site is on Do Not Run list");
        return;
      }

      // Check if already has an account for this business + site
      const existing = await db
        .select({ id: citationAccounts.id })
        .from(citationAccounts)
        .where(and(
          eq(citationAccounts.business_id, business.id),
          eq(citationAccounts.site_id, result.site_id)
        ))
        .limit(1);

      if (existing.length > 0) {
        await finishResult(result.id, result.bulk_run_id, "skipped", "Account already exists");
        return;
      }

      if (siteRow?.adapter_status !== "active") {
        await finishResult(result.id, result.bulk_run_id, "failed", "No active adapter for this site");
        return;
      }
    } else {
      await finishResult(result.id, result.bulk_run_id, "failed", "Site not found in database");
      return;
    }

    // Load active adapter
    const [adapter] = await db
      .select()
      .from(siteAdapters)
      .where(and(
        eq(siteAdapters.site_id, result.site_id!),
        eq(siteAdapters.is_active, true)
      ))
      .limit(1);

    if (!adapter) {
      await finishResult(result.id, result.bulk_run_id, "failed", "Adapter not found");
      return;
    }

    // Pick description and backlink
    const description = descriptions[Math.floor(Math.random() * Math.max(descriptions.length, 1))];
    const backlink = backlinks.length > 0 ? backlinks[jobIndex % backlinks.length] : undefined;

    const password = generatePassword(20);
    const encryptedPassword = encrypt(password);

    const fields: BusinessFields = {
      name: business.name,
      owner_name: business.owner_name,
      address_street: business.address_street,
      address_city: business.address_city,
      address_state: business.address_state,
      address_zip: business.address_zip,
      address_country: business.address_country,
      phone: business.phone,
      email: business.email,
      website: business.website,
      founding_year: business.founding_year?.toString() ?? "",
      description: description?.content ?? "",
      backlink_url: backlink?.url ?? "",
      backlink_anchor: backlink?.anchor_text ?? "",
    };

    const proxy = proxies.length > 0 ? proxies[0] : undefined;

    // Run signup automation
    const automationResult = await runSignup(result.signup_url, adapter.instructions as import("@/types").AdapterInstructions, fields, {
      proxy,
      headless: true,
    });

    if (!automationResult.success) {
      await finishResult(result.id, result.bulk_run_id, "failed", automationResult.error ?? "Signup failed");
      return;
    }

    // Handle email verification if site requires it
    const [siteForVerification] = await db
      .select({
        requires_email_verification: sites.requires_email_verification,
        base_domain: sites.base_domain,
      })
      .from(sites)
      .where(eq(sites.id, result.site_id!))
      .limit(1);

    if (siteForVerification?.requires_email_verification && business.gmail_refresh_token) {
      const refreshToken = decrypt(business.gmail_refresh_token);
      const emailResult = await waitForVerificationEmail(refreshToken, siteForVerification.base_domain);
      if (emailResult.verificationUrl) {
        const { default: playwright } = await import("playwright");
        const browser = await playwright.chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(emailResult.verificationUrl, { waitUntil: "domcontentloaded" });
        await browser.close();
      }
    }

    // Save citation account
    const [account] = await db
      .insert(citationAccounts)
      .values({
        business_id: business.id,
        site_id: result.site_id!,
        profile_url: automationResult.profileUrl,
        email_used: business.email,
        encrypted_password: encryptedPassword,
        account_status: siteForVerification?.requires_email_verification
          ? "pending_verification"
          : "active",
        description_id: description?.id ?? null,
        next_monitor_at: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          return d;
        })(),
      })
      .returning();

    // Mark proxy as used
    if (proxy) {
      await db
        .update(proxyPool)
        .set({ last_used_at: new Date() })
        .where(eq(proxyPool.id, proxy.id));
    }

    await db
      .update(bulkRunResults)
      .set({
        status: "success",
        citation_account_id: account?.id ?? null,
        completed_at: new Date(),
      })
      .where(eq(bulkRunResults.id, result.id));

    // Atomically increment run counters
    await db
      .update(bulkRuns)
      .set({
        completed_sites: sql`${bulkRuns.completed_sites} + 1`,
        successful_sites: sql`${bulkRuns.successful_sites} + 1`,
      })
      .where(eq(bulkRuns.id, result.bulk_run_id));

    console.log(`[worker] Success: ${result.site_name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[worker] Error on ${result.site_name}:`, message);
    await finishResult(result.id, result.bulk_run_id, "failed", message);
  }
}

async function finishResult(
  resultId: string,
  runId: string,
  status: "failed" | "skipped" | "blocked",
  reason: string
): Promise<void> {
  await db
    .update(bulkRunResults)
    .set({ status, failure_reason: reason, completed_at: new Date() })
    .where(eq(bulkRunResults.id, resultId));

  await db
    .update(bulkRuns)
    .set({
      completed_sites: sql`${bulkRuns.completed_sites} + 1`,
      ...(status === "failed"
        ? { failed_sites: sql`${bulkRuns.failed_sites} + 1` }
        : { skipped_sites: sql`${bulkRuns.skipped_sites} + 1` }),
    })
    .where(eq(bulkRuns.id, runId));
}

async function maybeCompleteRun(runId: string): Promise<void> {
  const [run] = await db
    .select({ total_sites: bulkRuns.total_sites, completed_sites: bulkRuns.completed_sites })
    .from(bulkRuns)
    .where(eq(bulkRuns.id, runId))
    .limit(1);

  if (!run) return;

  if (run.completed_sites >= run.total_sites) {
    await db
      .update(bulkRuns)
      .set({ status: "completed", completed_at: new Date() })
      .where(eq(bulkRuns.id, runId));
    console.log(`[worker] Run ${runId} completed`);
  }
}

// ============================================================
// MONITORING
// ============================================================

export async function processDueMonitoringChecks(): Promise<void> {
  const accounts = await db
    .select({
      id: citationAccounts.id,
      profile_url: citationAccounts.profile_url,
      monitor_interval_days: citationAccounts.monitor_interval_days,
      business_name: businesses.name,
      site_name: sites.name,
    })
    .from(citationAccounts)
    .innerJoin(businesses, eq(citationAccounts.business_id, businesses.id))
    .innerJoin(sites, eq(citationAccounts.site_id, sites.id))
    .where(
      and(
        eq(citationAccounts.account_status, "active"),
        isNotNull(citationAccounts.profile_url),
        lte(citationAccounts.next_monitor_at, new Date())
      )
    )
    .limit(10);

  if (accounts.length === 0) return;

  console.log(`[worker] Checking ${accounts.length} profiles`);

  for (const account of accounts) {
    if (!account.profile_url) continue;

    const result = await checkProfileHealth(account.profile_url);

    await db.insert(monitoringChecks).values({
      citation_account_id: account.id,
      status: result.status,
      details: result.details ?? null,
    });

    if (result.status === "removed") {
      await db
        .update(citationAccounts)
        .set({ account_status: "removed" })
        .where(eq(citationAccounts.id, account.id));
      console.log(`[worker] ALERT: Profile removed — ${account.business_name} on ${account.site_name}`);
    }

    const intervalDays = account.monitor_interval_days ?? 30;
    const nextCheck = new Date();
    nextCheck.setDate(nextCheck.getDate() + intervalDays);

    await db
      .update(citationAccounts)
      .set({
        last_monitored_at: new Date(),
        next_monitor_at: nextCheck,
      })
      .where(eq(citationAccounts.id, account.id));
  }
}

// ============================================================
// HELPERS
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Entry point — ESM-compatible main detection
const isMain =
  process.argv[1] &&
  (import.meta.url === `file://${process.argv[1]}` ||
    import.meta.url === `file://${process.argv[1]}.js`);

if (isMain) {
  run().catch(console.error);
}
