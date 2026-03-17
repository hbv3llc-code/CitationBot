import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Play, Plus } from "lucide-react";
import { getStatusColor, formatDateTime } from "@/lib/utils";
import type { BulkRun } from "@/types";

export default async function RunsPage() {
  const supabase = await createClient();
  const { data: runs } = await supabase
    .from("bulk_runs")
    .select("*, businesses(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Discovery Runs</h1>
          <p className="text-gray-500 mt-1">Automated citation signups across multiple sites</p>
        </div>
        <Link
          href="/runs/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Run
        </Link>
      </div>

      {runs && runs.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Business</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Progress</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Results</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Started</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map((run: any) => {
                const pct = run.total_sites > 0
                  ? Math.round((run.completed_sites / run.total_sites) * 100)
                  : 0;
                return (
                  <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {run.businesses?.name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-gray-400 text-xs">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <span className="text-green-600">{run.successful_sites} ok</span>
                      {" · "}
                      <span className="text-red-500">{run.failed_sites} failed</span>
                      {" · "}
                      <span className="text-gray-400">{run.total_sites} total</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {run.started_at ? formatDateTime(run.started_at) : formatDateTime(run.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/runs/${run.id}`} className="text-xs text-primary hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
          <Play className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-gray-900 font-medium mb-1">No runs yet</h3>
          <p className="text-sm text-gray-500 mb-6">
            Start a bulk discovery run to automatically create citation accounts across multiple sites.
          </p>
          <Link
            href="/runs/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Run
          </Link>
        </div>
      )}
    </div>
  );
}
