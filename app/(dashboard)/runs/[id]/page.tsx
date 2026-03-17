import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Clock, SkipForward, ExternalLink } from "lucide-react";
import { getStatusColor, formatDateTime } from "@/lib/utils";
import type { BulkRunResult } from "@/types";

const ResultIcon = ({ status }: { status: string }) => {
  if (status === "success") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-500" />;
  if (status === "skipped" || status === "blocked") return <SkipForward className="w-4 h-4 text-gray-400" />;
  return <Clock className="w-4 h-4 text-blue-400" />;
};

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

  const pct = run.total_sites > 0 ? Math.round((run.completed_sites / run.total_sites) * 100) : 0;
  const failures = results?.filter((r: BulkRunResult) => r.status === "failed") ?? [];

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/runs" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Run — {(run as any).businesses?.name ?? "Unknown"}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Started {run.started_at ? formatDateTime(run.started_at) : formatDateTime(run.created_at)}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(run.status)}`}>
          {run.status}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Sites", value: run.total_sites, color: "text-gray-900" },
          { label: "Successful", value: run.successful_sites, color: "text-green-600" },
          { label: "Failed", value: run.failed_sites, color: "text-red-500" },
          { label: "Skipped", value: run.skipped_sites, color: "text-gray-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {run.status === "running" && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Progress</span>
            <span className="text-gray-900 font-medium">{run.completed_sites} / {run.total_sites}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Failed sites — teach failures */}
      {failures.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-1">{failures.length} sites need teaching</h3>
          <p className="text-sm text-yellow-700 mb-3">
            These sites couldn&apos;t be automated. Use the CitationBot Chrome extension to teach them.
          </p>
          <div className="space-y-1">
            {failures.map((result: any) => (
              <div key={result.id} className="flex items-center justify-between text-sm">
                <span className="text-yellow-800">{result.site_name}</span>
                <Link href={`/sites/${result.site_id}/teach`}
                  className="text-xs text-yellow-700 font-medium hover:underline">
                  Start Teaching Session →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All results */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900 text-sm">All Sites</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {results?.map((result: any) => (
            <div key={result.id} className="flex items-center gap-3 px-4 py-3">
              <ResultIcon status={result.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{result.site_name}</p>
                {result.failure_reason && (
                  <p className="text-xs text-red-500 truncate">{result.failure_reason}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {result.citation_accounts?.profile_url && (
                  <a href={result.citation_accounts.profile_url} target="_blank" rel="noopener"
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    Profile <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(result.status)}`}>
                  {result.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
