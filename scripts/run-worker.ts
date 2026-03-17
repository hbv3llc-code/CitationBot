#!/usr/bin/env tsx
/**
 * CitationBot Worker Entry Point
 * Usage: npm run worker
 */
import { processDueMonitoringChecks } from "@/lib/automation/worker";

// Re-export and start the worker loop
import { createClient } from "@supabase/supabase-js";

const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS ?? "5000", 10);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function processPendingRuns(): Promise<void> {
  const { data: runs } = await supabase
    .from("bulk_runs")
    .select("*")
    .in("status", ["pending", "running"])
    .order("created_at");

  if (!runs || runs.length === 0) return;

  // Dynamic import to avoid circular dependency
  const { processJob } = await import("../lib/automation/worker");
  for (const run of runs) {
    // Delegate to processRun via direct DB queries (simplified runner)
    const { data: pendingResults } = await supabase
      .from("bulk_run_results")
      .select("*")
      .eq("bulk_run_id", run.id)
      .eq("status", "pending")
      .limit(run.concurrency ?? 1);

    if (!pendingResults?.length) continue;

    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", run.business_id)
      .single();

    const [{ data: descriptions }, { data: backlinks }, { data: proxies }] = await Promise.all([
      supabase.from("business_descriptions").select("*").eq("business_id", run.business_id).eq("approved", true),
      supabase.from("backlink_pool").select("*").eq("business_id", run.business_id),
      supabase.from("proxy_pool").select("*").eq("is_active", true).eq("is_flagged", false),
    ]);

    if (!business) continue;

    if (run.status === "pending") {
      await supabase.from("bulk_runs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", run.id);
    }

    await Promise.all(
      pendingResults.map((r) => processJob(r, business, descriptions ?? [], backlinks ?? [], proxies ?? []))
    );

    // Check completion
    const { data: refreshed } = await supabase.from("bulk_runs").select("total_sites, completed_sites").eq("id", run.id).single();
    if (refreshed && refreshed.completed_sites >= refreshed.total_sites) {
      await supabase.from("bulk_runs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", run.id);
    }
  }
}

async function tick(): Promise<void> {
  await Promise.all([processPendingRuns(), processDueMonitoringChecks()]);
}

async function main(): Promise<void> {
  console.log("[worker] CitationBot worker started — polling every", POLL_INTERVAL_MS, "ms");
  while (true) {
    try { await tick(); } catch (e) { console.error("[worker] error:", e); }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch(console.error);
