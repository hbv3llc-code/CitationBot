import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ExternalLink, CheckCircle2, AlertCircle,
  RefreshCw, Calendar
} from "lucide-react";
import { formatDate, formatDateTime, getStatusColor } from "@/lib/utils";
import { MonitorIntervalForm } from "@/components/monitoring/MonitorIntervalForm";

export default async function AccountDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const [{ data: account }, { data: checks }] = await Promise.all([
    supabase
      .from("citation_accounts")
      .select("*, businesses(name, email), sites(name, base_domain, signup_url)")
      .eq("id", params.id)
      .single(),
    supabase
      .from("monitoring_checks")
      .select("*")
      .eq("citation_account_id", params.id)
      .order("checked_at", { ascending: false })
      .limit(50),
  ]);

  if (!account) notFound();

  type AccountWithJoins = typeof account & {
    businesses?: { name: string; email: string } | null;
    sites?: { name: string; base_domain: string; signup_url: string } | null;
  };
  const typedAccount = account as AccountWithJoins;

  const latestCheck = checks?.[0];
  const okCount = checks?.filter((c: { status: string }) => c.status === "ok").length ?? 0;
  const alertCount = checks?.filter((c: { status: string }) => c.status !== "ok").length ?? 0;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/monitoring" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {typedAccount.businesses?.name} — {typedAccount.sites?.name}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Citation account monitoring history</p>
        </div>
        <form action="/api/monitoring/run" method="POST">
          <input type="hidden" name="account_id" value={account.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Check Now
          </button>
        </form>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left — check history */}
        <div className="col-span-2 space-y-4">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{checks?.length ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">Total Checks</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{okCount}</p>
              <p className="text-xs text-gray-400 mt-1">Passed</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className={`text-2xl font-bold ${alertCount > 0 ? "text-red-500" : "text-gray-400"}`}>
                {alertCount}
              </p>
              <p className="text-xs text-gray-400 mt-1">Alerts</p>
            </div>
          </div>

          {/* Check history */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900 text-sm">Check History</h2>
            </div>
            {checks && checks.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {checks.map((check: { id: string; status: string; checked_at: string; details: string | null }) => (
                  <div key={check.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {check.status === "ok" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(check.status)}`}>
                          {check.status}
                        </span>
                        <span className="text-xs text-gray-400">{formatDateTime(check.checked_at)}</span>
                      </div>
                      {check.details && (
                        <p className="text-sm text-gray-500 mt-1">{check.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No checks run yet.</p>
                <p className="text-xs text-gray-300 mt-1">
                  Next check: {account.next_monitor_at ? formatDate(account.next_monitor_at) : "Not scheduled"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Account info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Account Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Status</dt>
                <dd>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(account.account_status)}`}>
                    {account.account_status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Email</dt>
                <dd className="text-gray-700 text-xs truncate max-w-32">{account.email_used}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Password</dt>
                <dd className="text-gray-400 text-xs italic">stored in CitationBot</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Created</dt>
                <dd className="text-gray-600 text-xs">{formatDate(account.created_at)}</dd>
              </div>
              {account.last_monitored_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-400">Last checked</dt>
                  <dd className="text-gray-600 text-xs">{formatDate(account.last_monitored_at)}</dd>
                </div>
              )}
            </dl>

            {account.profile_url && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <a href={account.profile_url} target="_blank" rel="noopener"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Profile
                </a>
              </div>
            )}
          </div>

          {/* Site info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Site</h2>
            <p className="text-sm font-medium text-gray-900">{typedAccount.sites?.name}</p>
            <p className="text-xs text-gray-400">{typedAccount.sites?.base_domain}</p>
            <Link href={`/sites/${account.site_id}`}
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
              View site details →
            </Link>
          </div>

          {/* Monitor schedule */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-1">Monitor Schedule</h2>
            <p className="text-xs text-gray-400 mb-3">
              How often CitationBot checks this profile
            </p>
            <MonitorIntervalForm
              accountId={account.id}
              currentInterval={account.monitor_interval_days}
              nextMonitorAt={account.next_monitor_at}
            />
          </div>

          {/* Latest alert */}
          {latestCheck && latestCheck.status !== "ok" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm font-semibold text-red-800">Latest Alert</p>
              </div>
              <p className="text-xs text-red-700 capitalize">{latestCheck.status}</p>
              {latestCheck.details && (
                <p className="text-xs text-red-600 mt-1">{latestCheck.details}</p>
              )}
              <p className="text-xs text-red-400 mt-1">{formatDateTime(latestCheck.checked_at)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
