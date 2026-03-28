import { auth } from "@/lib/auth";
import { db, sites } from "@/lib/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Globe, Plus, CheckCircle2, AlertCircle, Ban, Wrench } from "lucide-react";
import type { Site } from "@/types";
import { getStatusColor } from "@/lib/utils";

const adapterStatusIcon = {
  active: CheckCircle2,
  broken: AlertCircle,
  repairing: Wrench,
  learning: Wrench,
  unknown: AlertCircle,
};

export default async function SitesPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const data = await db
    .select()
    .from(sites)
    .where(eq(sites.user_id, userId))
    .orderBy(sites.name);

  const activeSites = data.filter((s) => !s.is_blocked);
  const adapterActive = activeSites.filter((s) => s.adapter_status === "active").length;
  const adapterBroken = activeSites.filter((s) => s.adapter_status === "broken").length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Citation Sites</h1>
          <p className="text-gray-500 mt-1">
            {activeSites.length} active sites &middot; {adapterActive} with working adapters
            {adapterBroken > 0 && ` · ${adapterBroken} broken`}
          </p>
        </div>
        <Link href="/sites/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Add Site
        </Link>
      </div>

      {data.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Site</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Adapter</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Features</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((site) => {
                const StatusIcon = adapterStatusIcon[site.adapter_status] ?? AlertCircle;
                return (
                  <tr key={site.id} className={`hover:bg-gray-50 transition-colors ${site.is_blocked ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">{site.name}</p>
                          <p className="text-xs text-gray-400">{site.base_domain}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(site.adapter_status)}`}>
                        <StatusIcon className="w-3 h-3" />
                        {site.adapter_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 space-x-2">
                      {site.requires_email_verification && <span>Email verify</span>}
                    </td>
                    <td className="px-4 py-3">
                      {site.is_blocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          <Ban className="w-3 h-3" /> Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/sites/${site.id}`} className="text-xs text-primary hover:underline">View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
          <Globe className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-gray-900 font-medium mb-1">No sites yet</h3>
          <p className="text-sm text-gray-500 mb-6">Add citation sites manually or import them via CSV during a bulk run.</p>
          <Link href="/sites/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Add Site
          </Link>
        </div>
      )}
    </div>
  );
}
