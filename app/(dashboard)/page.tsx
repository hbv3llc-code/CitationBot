import { auth } from "@/lib/auth";
import { db, businesses, sites, citationAccounts, monitoringChecks, bulkRuns } from "@/lib/db";
import { eq, and, inArray, desc, count } from "drizzle-orm";
import Link from "next/link";
import { Building2, Globe, Play, AlertCircle, CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [
    [{ value: businessCount }],
    [{ value: siteCount }],
    [{ value: accountCount }],
    [{ value: alertCount }],
    recentRuns,
  ] = await Promise.all([
    db.select({ value: count() }).from(businesses).where(eq(businesses.user_id, userId)),
    db.select({ value: count() }).from(sites).where(and(eq(sites.user_id, userId), eq(sites.is_blocked, false))),
    db.select({ value: count() }).from(citationAccounts)
      .innerJoin(businesses, and(eq(citationAccounts.business_id, businesses.id), eq(businesses.user_id, userId)))
      .where(eq(citationAccounts.account_status, "active")),
    db.select({ value: count() }).from(monitoringChecks)
      .innerJoin(citationAccounts, eq(monitoringChecks.citation_account_id, citationAccounts.id))
      .innerJoin(businesses, and(eq(citationAccounts.business_id, businesses.id), eq(businesses.user_id, userId)))
      .where(inArray(monitoringChecks.status, ["removed", "flagged", "changed"])),
    db.select({
      id: bulkRuns.id,
      status: bulkRuns.status,
      total_sites: bulkRuns.total_sites,
      successful_sites: bulkRuns.successful_sites,
      failed_sites: bulkRuns.failed_sites,
      created_at: bulkRuns.created_at,
      business_name: businesses.name,
    })
      .from(bulkRuns)
      .leftJoin(businesses, eq(bulkRuns.business_id, businesses.id))
      .where(eq(bulkRuns.user_id, userId))
      .orderBy(desc(bulkRuns.created_at))
      .limit(5),
  ]);

  const stats = [
    { label: "Businesses", value: businessCount, icon: Building2, href: "/businesses", color: "text-blue-600 bg-blue-50" },
    { label: "Citation Sites", value: siteCount, icon: Globe, href: "/sites", color: "text-indigo-600 bg-indigo-50" },
    { label: "Active Accounts", value: accountCount, icon: CheckCircle2, href: "/monitoring", color: "text-green-600 bg-green-50" },
    { label: "Alerts", value: alertCount, icon: AlertCircle, href: "/monitoring", color: "text-red-600 bg-red-50" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your citation building activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {businessCount === 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-1">Get started</h2>
          <p className="text-sm text-gray-600 mb-4">Add your first business to begin building citations.</p>
          <Link href="/businesses/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Building2 className="w-4 h-4" />
            Add Business
          </Link>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Bulk Runs</h2>
          <Link href="/runs" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {recentRuns.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentRuns.map((run) => (
              <Link key={run.id} href={`/runs/${run.id}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{run.business_name ?? "Unknown business"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {run.total_sites} sites &middot; {new Date(run.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-600">{run.successful_sites} ok</span>
                  {run.failed_sites > 0 && <span className="text-red-500">{run.failed_sites} failed</span>}
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    run.status === "completed" ? "bg-green-50 text-green-700" :
                    run.status === "running" ? "bg-blue-50 text-blue-700" :
                    run.status === "failed" ? "bg-red-50 text-red-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{run.status}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <Play className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No bulk runs yet</p>
            <Link href="/runs" className="mt-2 inline-block text-sm text-primary hover:underline">
              Start your first run
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
