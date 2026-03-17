import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, XCircle } from "lucide-react";
import { formatDateTime, getStatusColor } from "@/lib/utils";
import { LiveRunProgress } from "@/components/runs/LiveRunProgress";

export default async function RunDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const [{ data: run }, { data: results }] = await Promise.all([
    supabase
      .from("bulk_runs")
      .select("*, businesses(name)")
      .eq("id", params.id)
      .single(),
    supabase
      .from("bulk_run_results")
      .select("*, citation_accounts(profile_url)")
      .eq("bulk_run_id", params.id)
      .order("created_at"),
  ]);

  if (!run) notFound();

  const isActive = run.status === "running" || run.status === "pending";

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/runs" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {(run as any).businesses?.name ?? "Unknown"} — Bulk Run
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {run.started_at
              ? `Started ${formatDateTime(run.started_at)}`
              : `Created ${formatDateTime(run.created_at)}`}
            {run.completed_at && ` · Completed ${formatDateTime(run.completed_at)}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isActive && (
            <form action={`/api/runs/${run.id}`} method="DELETE">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
              >
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

      <LiveRunProgress initialRun={run as any} initialResults={results as any ?? []} />
    </div>
  );
}
