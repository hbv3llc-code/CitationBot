/**
 * CitationBot Automation Worker
 *
 * Processes bulk run jobs from the database queue.
 * Run with: npm run worker
 *
 * The worker polls for pending bulk_run_result rows, processes them in batches
 * up to the run's configured concurrency, and saves results back to the database.
 */

import { createClient } from "@supabase/supabase-js";
import { runSignup, checkProfileHealth } from "./engine";
import { waitForVerificationEmail } from "./email-verifier";
import { decrypt, generatePassword, encrypt } from "@/lib/crypto";
import { extractDomain } from "@/lib/utils";
import type { Business, SiteAdapter, BusinessFields, Proxy } from "@/types";

// Use service role for the worker (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS ?? "5000", 10);

// ============================================================
// MAIN LOOP
// ============================================================

async function run(): Promise<void> {
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
  // Find runs that are pending or running and have pending results
  const { data: runs } = await supabase
    .from("bulk_runs")
    .select("*")
    .in("status", ["pending", "running"])
    .order("created_at");

  if (!runs || runs.length === 0) return;

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
    await supabase
      .from("bulk_runs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", run.id);
  }

  // Load business + active description + backlinks
  const [{ data: business }, { data: descriptions }, { data: backlinks }, { data: proxies }] =
    await Promise.all([
      supabase.from("businesses").select("*").eq("id", run.business_id).single(),
      supabase
        .from("business_descriptions")
        .select("*")
        .eq("business_id", run.business_id)
        .eq("approved", true),
      supabase.from("backlink_pool").select("*").eq("business_id", run.business_id),
      supabase
        .from("proxy_pool")
        .select("*")
        .eq("is_active", true)
        .eq("is_flagged", false)
        .order("last_used_at", { ascending: true, nullsFirst: true }),
    ]);

  if (!business) {
    console.error(`[worker] Business not found for run ${run.id}`);
    await supabase
      .from("bulk_runs")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", run.id);
    return;
  }

  // Pick pending results up to concurrency limit
  const { data: pendingResults } = await supabase
    .from("bulk_run_results")
    .select("*")
    .eq("bulk_run_id", run.id)
    .eq("status", "pending")
    .limit(run.concurrency);

  if (!pendingResults || pendingResults.length === 0) {
    // Check if all done
    await maybeCompleteRun(run.id);
    return;
  }

  // Process up to concurrency jobs in parallel
  await Promise.all(
    pendingResults.map((result) =>
      processJob(result, business, descriptions ?? [], backlinks ?? [], proxies ?? [])
    )
  );

  await maybeCompleteRun(run.id);
}

async function processJob(
  result: { id: string; bulk_run_id: string; site_id: string | null; site_name: string; signup_url: string },
  business: Business,
  descriptions: Array<{ id: string; content: string }>,
  backlinks: Array<{ url: string; anchor_text: string }>,
  proxies: Proxy[]
): Promise<void> {
  console.log(`[worker] Processing: ${result.site_name} (run=${result.bulk_run_id})`);

  // Mark result as running
  await supabase
    .from("bulk_run_results")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", result.id);

  try {
    // Check if site is blocked
    if (result.site_id) {
      const { data: site } = await supabase
        .from("sites")
        .select("is_blocked, adapter_status")
        .eq("id", result.site_id)
        .single();

      if (site?.is_blocked) {
        await finishResult(result.id, result.bulk_run_id, "blocked", "Site is on Do Not Run list");
        return;
      }

      // Check if already has an account for this business + site
      const { data: existing } = await supabase
        .from("citation_accounts")
        .select("id")
        .eq("business_id", business.id)
        .eq("site_id", result.site_id)
        .single();

      if (existing) {
        await finishResult(result.id, result.bulk_run_id, "skipped", "Account already exists");
        return;
      }

      // Check if adapter exists
      if (site?.adapter_status !== "active") {
        await finishResult(result.id, result.bulk_run_id, "failed", "No active adapter for this site");
        return;
      }
    } else {
      await finishResult(result.id, result.bulk_run_id, "failed", "Site not found in database");
      return;
    }

    // Load active adapter
    const { data: adapter } = await supabase
      .from("site_adapters")
      .select("*")
      .eq("site_id", result.site_id)
      .eq("is_active", true)
      .single();

    if (!adapter) {
      await finishResult(result.id, result.bulk_run_id, "failed", "Adapter not found");
      return;
    }

    // Pick a description (round-robin through approved ones, fallback to empty)
    const description = descriptions[Math.floor(Math.random() * Math.max(descriptions.length, 1))];

    // Pick a backlink (round-robin)
    const backlink = backlinks[Math.floor(Math.random() * Math.max(backlinks.length, 1))];

    // Generate unique password
    const password = generatePassword(20);
    const encryptedPassword = encrypt(password);

    // Build business fields
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

    // Pick proxy (least recently used, unflagged)
    const proxy = proxies.length > 0 ? proxies[0] : undefined;

    // Run signup automation
    const automationResult = await runSignup(result.signup_url, adapter.instructions, fields, {
      proxy,
      headless: true,
    });

    if (!automationResult.success) {
      await finishResult(result.id, result.bulk_run_id, "failed", automationResult.error ?? "Signup failed");
      return;
    }

    // Handle email verification if site requires it
    const { data: site } = await supabase
      .from("sites")
      .select("requires_email_verification, base_domain")
      .eq("id", result.site_id!)
      .single();

    if (site?.requires_email_verification && business.gmail_refresh_token) {
      const refreshToken = decrypt(business.gmail_refresh_token);
      const emailResult = await waitForVerificationEmail(refreshToken, site.base_domain);
      if (emailResult.verificationUrl) {
        // Click the verification link
        const { default: playwright } = await import("playwright");
        const browser = await playwright.chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(emailResult.verificationUrl, { waitUntil: "domcontentloaded" });
        await browser.close();
      }
    }

    // Save citation account
    const { data: account } = await supabase
      .from("citation_accounts")
      .insert({
        business_id: business.id,
        site_id: result.site_id,
        profile_url: automationResult.profileUrl,
        email_used: business.email,
        encrypted_password: encryptedPassword,
        account_status: site?.requires_email_verification ? "pending_verification" : "active",
        description_id: description?.id ?? null,
        next_monitor_at: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          return d.toISOString();
        })(),
      })
      .select()
      .single();

    // Mark proxy as used
    if (proxy) {
      await supabase
        .from("proxy_pool")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", proxy.id);
    }

    await supabase
      .from("bulk_run_results")
      .update({
        status: "success",
        citation_account_id: account?.id ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", result.id);

    // Update run counters
    await supabase.rpc("increment_run_counters", {
      run_id: result.bulk_run_id,
      completed_delta: 1,
      successful_delta: 1,
    });

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
  await supabase
    .from("bulk_run_results")
    .update({ status, failure_reason: reason, completed_at: new Date().toISOString() })
    .eq("id", resultId);

  await supabase.rpc("increment_run_counters", {
    run_id: runId,
    completed_delta: 1,
    successful_delta: 0,
    ...(status === "failed" ? { failed_delta: 1 } : { skipped_delta: 1 }),
  });
}

async function maybeCompleteRun(runId: string): Promise<void> {
  const { data: run } = await supabase
    .from("bulk_runs")
    .select("total_sites, completed_sites")
    .eq("id", runId)
    .single();

  if (!run) return;

  if (run.completed_sites >= run.total_sites) {
    await supabase
      .from("bulk_runs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", runId);
    console.log(`[worker] Run ${runId} completed`);
  }
}

// ============================================================
// MONITORING
// ============================================================

async function processDueMonitoringChecks(): Promise<void> {
  const { data: accounts } = await supabase
    .from("citation_accounts")
    .select("*, sites(base_domain, name), businesses(name)")
    .eq("account_status", "active")
    .not("profile_url", "is", null)
    .lte("next_monitor_at", new Date().toISOString())
    .limit(10);

  if (!accounts || accounts.length === 0) return;

  console.log(`[worker] Checking ${accounts.length} profiles`);

  for (const account of accounts) {
    if (!account.profile_url) continue;

    const result = await checkProfileHealth(account.profile_url);

    await supabase.from("monitoring_checks").insert({
      citation_account_id: account.id,
      status: result.status,
      details: result.details ?? null,
    });

    if (result.status === "removed") {
      await supabase
        .from("citation_accounts")
        .update({ account_status: "removed" })
        .eq("id", account.id);
      console.log(`[worker] ALERT: Profile removed — ${account.businesses?.name} on ${account.sites?.name}`);
    }

    const intervalDays = account.monitor_interval_days ?? 30;
    const nextCheck = new Date();
    nextCheck.setDate(nextCheck.getDate() + intervalDays);

    await supabase
      .from("citation_accounts")
      .update({
        last_monitored_at: new Date().toISOString(),
        next_monitor_at: nextCheck.toISOString(),
      })
      .eq("id", account.id);
  }
}

// ============================================================
// HELPERS
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Entry point
if (require.main === module) {
  run().catch(console.error);
}

export { processJob, processDueMonitoringChecks };
