import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Activity, AlertCircle, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { getStatusColor, formatDate } from "@/lib/utils";

export default async function MonitoringPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: recentChecks }] = await Promise.all([
    supabase
      .from("citation_accounts")
      .select("*, businesses(name), sites(name)")
      .order("next_monitor_at", { ascending: true })
      .limit(50),
    supabase
      .from("monitoring_checks")
      .select("*, citation_accounts(businesses(name), sites(name))")
      .in("status", ["removed", "flagged", "changed", "error"])
      .order("checked_at", { ascending: false })
      .limit(20),
  ]);

  const alerts = recentChecks ?? [];
  const activeAccounts = accounts?.filter((a) => a.account_status === "active") ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Health</h1>
          <p className="text-gray-500 mt-1">
            {activeAccounts.length} active citation accounts monitored automatically
          </p>
        </div>
        {/* Trigger a manual health check */}
        <form action="/api/monitoring/run" method="POST">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Run Checks Now
          </button>
        </form>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-red-900">{alerts.length} Alerts Need Attention</h2>
          </div>
          <div className="space-y-2">
            {alerts.map((check: any) => (
              <div key={check.id} className="flex items-start justify-between bg-white rounded-lg p-3 border border-red-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {check.citation_accounts?.businesses?.name} — {check.citation_accounts?.sites?.name}
                  </p>
                  {check.details && (
                    <p className="text-xs text-gray-500 mt-0.5">{check.details}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(check.checked_at)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-3 ${getStatusColor(check.status)}`}>
                  {check.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All accounts */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900">All Citation Accounts</h2>
        </div>
        {accounts && accounts.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Business</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Site</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Checked</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Next Check</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map((account: any) => (
                <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {account.businesses?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {account.sites?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(account.account_status)}`}>
                      {account.account_status === "active" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {account.account_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {account.last_monitored_at ? formatDate(account.last_monitored_at) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {account.next_monitor_at ? formatDate(account.next_monitor_at) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {account.profile_url && (
                      <a href={account.profile_url} target="_blank" rel="noopener"
                        className="text-xs text-primary hover:underline flex items-center gap-1 justify-end">
                        Profile <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center">
            <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No citation accounts yet.</p>
            <p className="text-xs text-gray-400 mt-1">Accounts appear here after successful bulk runs.</p>
          </div>
        )}
      </div>
    </div>
  );
}
