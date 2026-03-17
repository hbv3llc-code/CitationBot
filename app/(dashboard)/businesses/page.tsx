import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Building2, Plus, Mail, Globe, ExternalLink } from "lucide-react";
import type { Business } from "@/types";

export default async function BusinessesPage() {
  const supabase = await createClient();
  const { data: businesses } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
          <p className="text-gray-500 mt-1">Manage the businesses you are building citations for</p>
        </div>
        <Link
          href="/businesses/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Business
        </Link>
      </div>

      {businesses && businesses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {businesses.map((business: Business) => (
            <Link
              key={business.id}
              href={`/businesses/${business.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt={business.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 leading-tight">{business.name}</h3>
                    <p className="text-xs text-gray-400">{business.owner_name}</p>
                  </div>
                </div>
                {business.gmail_connected_at ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                    Gmail connected
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 font-medium">
                    No Gmail
                  </span>
                )}
              </div>

              <div className="space-y-1 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{business.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{business.website.replace(/^https?:\/\//, "")}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {business.address_city}, {business.address_state} &middot;{" "}
                  {business.service_categories.slice(0, 2).join(", ")}
                  {business.service_categories.length > 2 && " +more"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-gray-900 font-medium mb-1">No businesses yet</h3>
          <p className="text-sm text-gray-500 mb-6">
            Add your first business to start building citations.
          </p>
          <Link
            href="/businesses/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Business
          </Link>
        </div>
      )}
    </div>
  );
}
