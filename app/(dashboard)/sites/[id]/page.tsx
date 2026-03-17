import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Globe, CheckCircle2, AlertCircle, Wrench,
  ExternalLink, Play, Ban, ChevronRight
} from "lucide-react";
import { formatDate, formatDateTime, getStatusColor } from "@/lib/utils";
import { BlockSiteButton } from "@/components/sites/BlockSiteButton";
import { RepairAdapterButton } from "@/components/sites/RepairAdapterButton";

export default async function SiteDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const [{ data: site }, { data: adapters }, { data: accounts }] = await Promise.all([
    supabase.from("sites").select("*").eq("id", params.id).single(),
    supabase
      .from("site_adapters")
      .select("*")
      .eq("site_id", params.id)
      .order("version", { ascending: false }),
    supabase
      .from("citation_accounts")
      .select("*, businesses(name)")
      .eq("site_id", params.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!site) notFound();

  const activeAdapter = adapters?.find((a) => a.is_active);

  const statusConfig = {
    active: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 border-green-200" },
    broken: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-200" },
    repairing: { icon: Wrench, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
    learning: { icon: Wrench, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
    unknown: { icon: AlertCircle, color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
  };
  const sc = statusConfig[site.adapter_status as keyof typeof statusConfig] ?? statusConfig.unknown;
  const StatusIcon = sc.icon;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/sites" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
            {site.is_blocked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                <Ban className="w-3 h-3" /> Blocked
              </span>
            )}
          </div>
          <a href={site.signup_url} target="_blank" rel="noopener"
            className="text-sm text-gray-400 hover:text-primary flex items-center gap-1 mt-0.5">
            {site.base_domain} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex gap-2">
          <Link href={`/sites/${site.id}/edit`}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Edit
          </Link>
          <BlockSiteButton siteId={site.id} isBlocked={site.is_blocked} siteName={site.name} />
          {!site.is_blocked && (
            <Link href={`/sites/${site.id}/teach`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Play className="w-4 h-4" /> Teach Site
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left — adapter status + history */}
        <div className="col-span-2 space-y-4">

          {/* Adapter status card */}
          <div className={`rounded-xl border p-5 ${sc.bg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-5 h-5 ${sc.color}`} />
                <div>
                  <p className={`font-semibold ${sc.color}`}>
                    {site.adapter_status === "active" && "Adapter Active"}
                    {site.adapter_status === "broken" && "Adapter Broken"}
                    {site.adapter_status === "repairing" && "Auto-Repair in Progress"}
                    {site.adapter_status === "learning" && "Teaching in Progress"}
                    {site.adapter_status === "unknown" && "No Adapter Yet"}
                  </p>
                  {site.last_adapter_check_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Last checked {formatDate(site.last_adapter_check_at)}
                    </p>
                  )}
                </div>
              </div>

              {site.adapter_status === "broken" && (
                <RepairAdapterButton siteId={site.id} />
              )}
            </div>

            {site.adapter_status === "unknown" && (
              <p className="text-sm text-gray-500 mt-3">
                CitationBot doesn&apos;t know how to fill forms on this site yet.{" "}
                <Link href={`/sites/${site.id}/teach`} className="text-primary hover:underline font-medium">
                  Start a teaching session
                </Link>{" "}
                to automate it.
              </p>
            )}

            {site.adapter_status === "broken" && (
              <p className="text-sm text-red-700 mt-3">
                The site&apos;s layout has changed and the saved adapter no longer works.
                Try auto-repair or start a new teaching session.
              </p>
            )}
          </div>

          {/* Adapter version history */}
          {adapters && adapters.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Adapter History</h2>
              <div className="space-y-2">
                {adapters.map((adapter) => (
                  <div key={adapter.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${adapter.is_active ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
                    <div>
                      <p className={`text-sm font-medium ${adapter.is_active ? "text-green-700" : "text-gray-600"}`}>
                        Version {adapter.version}
                        {adapter.is_active && <span className="ml-2 text-xs">(active)</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Taught by {adapter.taught_by} · {formatDate(adapter.created_at)}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {adapter.instructions?.steps?.length ?? 0} steps ·{" "}
                      {adapter.instructions?.field_mappings?.length ?? 0} fields
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Citation accounts on this site */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900">
                Citation Accounts ({accounts?.length ?? 0})
              </h2>
            </div>
            {accounts && accounts.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {accounts.map((account: any) => (
                  <div key={account.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {account.businesses?.name ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400">{account.email_used}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {account.profile_url && (
                        <a href={account.profile_url} target="_blank" rel="noopener"
                          className="text-xs text-primary hover:underline flex items-center gap-1">
                          Profile <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(account.account_status)}`}>
                        {account.account_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-400">No accounts yet for this site.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Site Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Domain</dt>
                <dd className="text-gray-900">{site.base_domain}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Backlinks</dt>
                <dd className={site.allows_backlinks ? "text-green-600" : "text-gray-400"}>
                  {site.allows_backlinks ? "Yes" : "No"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Email verify</dt>
                <dd className={site.requires_email_verification ? "text-gray-700" : "text-gray-400"}>
                  {site.requires_email_verification ? "Required" : "Not required"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Added</dt>
                <dd className="text-gray-600">{formatDate(site.created_at)}</dd>
              </div>
            </dl>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <Link href={`/sites/${site.id}/teach`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Play className="w-4 h-4 text-primary" />
                Start Teaching Session
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </Link>
            <Link href={`/runs/new`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Globe className="w-4 h-4 text-gray-400" />
                Add to Bulk Run
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
