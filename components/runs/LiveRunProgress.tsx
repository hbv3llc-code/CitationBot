"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle, Clock, SkipForward, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getStatusColor } from "@/lib/utils";
import type { BulkRun, BulkRunResult } from "@/types";

interface Props {
  initialRun: BulkRun & { businesses?: { name: string } };
  initialResults: (BulkRunResult & { citation_accounts?: { profile_url: string | null } })[];
}

const ResultIcon = ({ status }: { status: string }) => {
  if (status === "success") return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
  if (status === "skipped" || status === "blocked") return <SkipForward className="w-4 h-4 text-gray-400 flex-shrink-0" />;
  if (status === "running") return <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />;
  return <Clock className="w-4 h-4 text-gray-300 flex-shrink-0" />;
};

export function LiveRunProgress({ initialRun, initialResults }: Props) {
  const [run, setRun] = useState(initialRun);
  const [results, setResults] = useState(initialResults);
  const supabase = createClient();

  const isLive = run.status === "running" || run.status === "pending";

  const refetch = useCallback(async () => {
    const [{ data: updatedRun }, { data: updatedResults }] = await Promise.all([
      supabase
        .from("bulk_runs")
        .select("*, businesses(name)")
        .eq("id", run.id)
        .single(),
      supabase
        .from("bulk_run_results")
        .select("*, citation_accounts(profile_url)")
        .eq("bulk_run_id", run.id)
        .order("created_at"),
    ]);
    if (updatedRun) setRun(updatedRun as any);
    if (updatedResults) setResults(updatedResults as any);
  }, [run.id, supabase]);

  useEffect(() => {
    if (!isLive) return;

    // Subscribe to bulk_runs changes for this run
    const runChannel = supabase
      .channel(`run:${run.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bulk_runs", filter: `id=eq.${run.id}` },
        (payload) => {
          setRun((prev) => ({ ...prev, ...(payload.new as Partial<BulkRun>) }));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bulk_run_results", filter: `bulk_run_id=eq.${run.id}` },
        () => {
          // Refetch results on any result change
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(runChannel);
    };
  }, [run.id, isLive, supabase, refetch]);

  const pct = run.total_sites > 0 ? Math.round((run.completed_sites / run.total_sites) * 100) : 0;
  const failures = results.filter((r) => r.status === "failed");

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
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
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center gap-2">
            {isLive && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
            <span className="text-gray-600 font-medium">
              {run.status === "completed" ? "Complete" :
               run.status === "cancelled" ? "Cancelled" :
               run.status === "failed" ? "Failed" :
               `Running... ${run.completed_sites} / ${run.total_sites}`}
            </span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
            {run.status}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              run.status === "completed" ? "bg-green-500" :
              run.status === "failed" ? "bg-red-400" :
              "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{pct}% complete</span>
          {run.started_at && (
            <span>Started {new Date(run.started_at).toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {/* Teach failures prompt */}
      {failures.length > 0 && run.status === "completed" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="font-semibold text-yellow-900 mb-1">
            {failures.length} {failures.length === 1 ? "site needs" : "sites need"} teaching
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            These sites couldn&apos;t be automated. Teach CitationBot once and they&apos;ll work for every
            business you add. Start with high-value directories first.
          </p>
          <div className="space-y-1.5">
            {failures.map((result) => (
              <div key={result.id} className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-yellow-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{result.site_name}</p>
                  {result.failure_reason && (
                    <p className="text-xs text-gray-400 truncate max-w-sm">{result.failure_reason}</p>
                  )}
                </div>
                {result.site_id && (
                  <Link
                    href={`/sites/${result.site_id}/teach`}
                    className="text-xs px-2.5 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors font-medium"
                  >
                    Teach →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All results */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">All Sites ({results.length})</h2>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              Live
            </span>
          )}
        </div>
        <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
          {results.map((result) => (
            <div key={result.id} className="flex items-center gap-3 px-4 py-2.5">
              <ResultIcon status={result.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{result.site_name}</p>
                {result.failure_reason && (
                  <p className="text-xs text-red-400 truncate">{result.failure_reason}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {result.citation_accounts?.profile_url && (
                  <a href={result.citation_accounts.profile_url} target="_blank" rel="noopener"
                    className="text-xs text-primary hover:underline flex items-center gap-0.5">
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
