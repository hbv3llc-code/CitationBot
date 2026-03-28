import { auth } from "@/lib/auth";
import { db, citationAccounts, monitoringChecks, businesses, sites } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, CheckCircle2, AlertCircle, RefreshCw, Calendar } from "lucide-react";
import { formatDate, formatDateTime, getStatusColor } from "@/lib/utils";
import { MonitorIntervalForm } from "@/components/monitoring/MonitorIntervalForm";

export default async function AccountDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = session!.user!.id!;

  const [accountRow] = await db
    .select({
      id: citationAccounts.id,
      business_id: citationAccounts.business_id,
      site_id: citationAccounts.site_id,
      profile_url: citationAccounts.profile_url,
      email_used: citationAccounts.email_used,
      account_status: citationAccounts.account_status,
      monitor_interval_days: citationAccounts.monitor_interval_days,
      next_monitor_at: citationAccounts.next_monitor_at,
      last_monitored_at: citationAccounts.last_monitored_at,
      created_at: citationAccounts.created_at,
      business_name: businesses.name,
      business_email: businesses.email,
      site_name: sites.name,
      site_base_domain: sites.base_domain,
      site_signup_url: sites.signup_url,
    })
    .from(citationAccounts)
    .innerJoin(businesses, and(eq(citationAccounts.business_id, businesses.id), eq(businesses.user_id, userId)))
    .leftJoin(sites, eq(citationAccounts.site_id, sites.id))
    .where(eq(citationAccounts.id, params.id))
    .limit(1);

  if (!accountRow) notFound();

  const checks = await db
    .select()
    .from(monitoringChecks)
    .where(eq(monitoringChecks.citation_account_id, params.id))
    .orderBy(desc(monitoringChecks.checked_at))
    .limit(50);

  const latestCheck = checks[0];
  const okCount = checks.filter((c) => c.status === "ok").length;
  const alertCount = checks.filter((c) => c.status !== "ok").length;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/monitoring" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {accountRow.business_name} — {accountRow.site_name}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Citation account monitoring history</p>
        </div>
        <form action="/api/monitoring/run" method="POST">
          <input type="hidden" name="account_id" value={accountRow.id} />
          <button type="submit"
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Check Now
          </button>
        </form>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{checks.length}</p>
              <p className="text-xs text-gray-400 mt-1">Total Checks</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{okCount}</p>
              <p className="text-xs text-gray-400 mt-1">Passed</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className={`text-2xl font-bold ${alertCount > 0 ? "text-red-500" : "text-gray-400"}`}>{alertCount}</p>
              <p className="text-xs text-gray-400 mt-1">Alerts</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900 text-sm">Check History</h2>
            </div>
            {checks.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {checks.map((check) => (
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
                        <span className="text-xs text-gray-400">{formatDateTime(check.checked_at.toString())}</span>
                      </div>
                      {check.details && <p className="text-sm text-gray-500 mt-1">{check.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No checks run yet.</p>
                <p className="text-xs text-gray-300 mt-1">
                  Next check: {accountRow.next_monitor_at ? formatDate(accountRow.next_monitor_at.toString()) : "Not scheduled"}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Account Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Status</dt>
                <dd>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(accountRow.account_status)}`}>
                    {accountRow.account_status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Email</dt>
                <dd className="text-gray-700 text-xs truncate max-w-32">{accountRow.email_used}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Password</dt>
                <dd className="text-gray-400 text-xs italic">stored in CitationBot</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Created</dt>
                <dd className="text-gray-600 text-xs">{formatDate(accountRow.created_at.toString())}</dd>
              </div>
              {accountRow.last_monitored_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-400">Last checked</dt>
                  <dd className="text-gray-600 text-xs">{formatDate(accountRow.last_monitored_at.toString())}</dd>
                </div>
              )}
            </dl>
            {accountRow.profile_url && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <a href={accountRow.profile_url} target="_blank" rel="noopener"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Profile
                </a>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Site</h2>
            <p className="text-sm font-medium text-gray-900">{accountRow.site_name}</p>
            <p className="text-xs text-gray-400">{accountRow.site_base_domain}</p>
            <Link href={`/sites/${accountRow.site_id}`}
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
              View site details →
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-1">Monitor Schedule</h2>
            <p className="text-xs text-gray-400 mb-3">How often CitationBot checks this profile</p>
            <MonitorIntervalForm
              accountId={accountRow.id}
              currentInterval={accountRow.monitor_interval_days}
              nextMonitorAt={accountRow.next_monitor_at?.toString() ?? null}
            />
          </div>

          {latestCheck && latestCheck.status !== "ok" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm font-semibold text-red-800">Latest Alert</p>
              </div>
              <p className="text-xs text-red-700 capitalize">{latestCheck.status}</p>
              {latestCheck.details && <p className="text-xs text-red-600 mt-1">{latestCheck.details}</p>}
              <p className="text-xs text-red-400 mt-1">{formatDateTime(latestCheck.checked_at.toString())}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
