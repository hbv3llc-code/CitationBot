import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Building2, Globe, Play, AlertCircle, CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: businessCount },
    { count: siteCount },
    { count: accountCount },
    { count: alertCount },
    { data: recentRuns },
  ] = await Promise.all([
    supabase.from("businesses").select("*", { count: "exact", head: true }),
    supabase.from("sites").select("*", { count: "exact", head: true }).eq("is_blocked", false),
    supabase.from("citation_accounts").select("*", { count: "exact", head: true }).eq("account_status", "active"),
    supabase
      .from("monitoring_checks")
      .select("*", { count: "exact", head: true })
      .in("status", ["removed", "flagged", "changed"]),
    supabase
      .from("bulk_runs")
      .select("id, status, total_sites, successful_sites, failed_sites, created_at, businesses(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    { label: "Businesses", value: businessCount ?? 0, icon: Building2, href: "/businesses", color: "text-blue-600 bg-blue-50" },
    { label: "Citation Sites", value: siteCount ?? 0, icon: Globe, href: "/sites", color: "text-indigo-600 bg-indigo-50" },
    { label: "Active Accounts", value: accountCount ?? 0, icon: CheckCircle2, href: "/monitoring", color: "text-green-600 bg-green-50" },
    { label: "Alerts", value: alertCount ?? 0, icon: AlertCircle, href: "/monitoring", color: "text-red-600 bg-red-50" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your citation building activity</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
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

      {/* Quick actions */}
      {(businessCount ?? 0) === 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-1">Get started</h2>
          <p className="text-sm text-gray-600 mb-4">
            Add your first business to begin building citations.
          </p>
          <Link
            href="/businesses/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Building2 className="w-4 h-4" />
            Add Business
          </Link>
        </div>
      )}

      {/* Recent bulk runs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Bulk Runs</h2>
          <Link href="/runs" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {recentRuns && recentRuns.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentRuns.map((run: { id: string; businesses?: { name: string } | null; total_sites: number; created_at: string; successful_sites: number; failed_sites: number; status: string }) => (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {run.businesses?.name ?? "Unknown business"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {run.total_sites} sites &middot; {new Date(run.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-600">{run.successful_sites} ok</span>
                  {run.failed_sites > 0 && (
                    <span className="text-red-500">{run.failed_sites} failed</span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    run.status === "completed" ? "bg-green-50 text-green-700" :
                    run.status === "running" ? "bg-blue-50 text-blue-700" :
                    run.status === "failed" ? "bg-red-50 text-red-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {run.status}
                  </span>
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
