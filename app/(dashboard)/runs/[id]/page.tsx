import { auth } from "@/lib/auth";
import { db, bulkRuns, businesses, bulkRunResults, citationAccounts } from "@/lib/db";
import { eq, and, asc, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, XCircle } from "lucide-react";
import { formatDateTime, getStatusColor } from "@/lib/utils";
import { LiveRunProgress } from "@/components/runs/LiveRunProgress";
import type { BulkRun, BulkRunResult } from "@/types";

export default async function RunDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = session!.user!.id!;

  const [runRow] = await db
    .select({
      id: bulkRuns.id,
      user_id: bulkRuns.user_id,
      business_id: bulkRuns.business_id,
      status: bulkRuns.status,
      total_sites: bulkRuns.total_sites,
      completed_sites: bulkRuns.completed_sites,
      successful_sites: bulkRuns.successful_sites,
      failed_sites: bulkRuns.failed_sites,
      skipped_sites: bulkRuns.skipped_sites,
      concurrency: bulkRuns.concurrency,
      started_at: bulkRuns.started_at,
      completed_at: bulkRuns.completed_at,
      created_at: bulkRuns.created_at,
      business_name: businesses.name,
    })
    .from(bulkRuns)
    .leftJoin(businesses, eq(bulkRuns.business_id, businesses.id))
    .where(and(eq(bulkRuns.id, params.id), eq(bulkRuns.user_id, userId)))
    .limit(1);

  if (!runRow) notFound();

  const rawResults = await db
    .select()
    .from(bulkRunResults)
    .where(eq(bulkRunResults.bulk_run_id, params.id))
    .orderBy(asc(bulkRunResults.created_at));

  const accountIds = rawResults.map((r) => r.citation_account_id).filter((id): id is string => id !== null);
  const accountMap: Record<string, string | null> = {};
  if (accountIds.length > 0) {
    const accs = await db
      .select({ id: citationAccounts.id, profile_url: citationAccounts.profile_url })
      .from(citationAccounts)
      .where(inArray(citationAccounts.id, accountIds));
    accs.forEach((a) => { accountMap[a.id] = a.profile_url; });
  }

  const results = rawResults.map((r) => ({
    ...r,
    started_at: r.started_at?.toString() ?? null,
    completed_at: r.completed_at?.toString() ?? null,
    created_at: r.created_at.toString(),
    citation_accounts: r.citation_account_id
      ? { profile_url: accountMap[r.citation_account_id] ?? null }
      : null,
  }));

  const { business_name, ...runData } = runRow;
  const run = {
    ...runData,
    started_at: runData.started_at?.toString() ?? null,
    completed_at: runData.completed_at?.toString() ?? null,
    created_at: runData.created_at.toString(),
    businesses: { name: business_name ?? "" },
  };

  const isActive = run.status === "running" || run.status === "pending";

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/runs" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {run.businesses.name} — Bulk Run
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {run.started_at ? `Started ${formatDateTime(run.started_at)}` : `Created ${formatDateTime(run.created_at)}`}
            {run.completed_at && ` · Completed ${formatDateTime(run.completed_at)}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isActive && (
            <form action={`/api/runs/${run.id}`} method="DELETE">
              <button type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                <XCircle className="w-4 h-4" />
                Cancel Run
              </button>
            </form>
          )}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(run.status)}`}>
            {run.status}
          </span>
        </div>
      </div>

      <LiveRunProgress
        initialRun={run as BulkRun & { businesses?: { name: string } }}
        initialResults={results as (BulkRunResult & { citation_accounts?: { profile_url: string | null } })[]}
      />
    </div>
  );
}
