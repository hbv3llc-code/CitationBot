import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Globe, Building2, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { GenerateDescriptionsButton } from "@/components/businesses/GenerateDescriptionsButton";
import { ConnectGmailButton } from "@/components/businesses/ConnectGmailButton";
import { DescriptionCard } from "@/components/businesses/DescriptionCard";
import { formatPhone } from "@/lib/utils";

export default async function BusinessDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const [{ data: business }, { data: descriptions }, { data: backlinks }, { data: accounts }] =
    await Promise.all([
      supabase.from("businesses").select("*").eq("id", params.id).single(),
      supabase.from("business_descriptions").select("*").eq("business_id", params.id).order("created_at"),
      supabase.from("backlink_pool").select("*").eq("business_id", params.id),
      supabase
        .from("citation_accounts")
        .select("*, sites(name)")
        .eq("business_id", params.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  if (!business) notFound();

  const approvedDescriptions = descriptions?.filter((d) => d.approved) ?? [];

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/businesses" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{business.owner_name}</p>
        </div>
        <Link href={`/businesses/${business.id}/edit`}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column — business details */}
        <div className="col-span-2 space-y-4">
          {/* Profile summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Business Profile</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex"><dt className="w-32 text-gray-400 flex-shrink-0">Phone</dt><dd className="text-gray-900">{formatPhone(business.phone)}</dd></div>
              <div className="flex"><dt className="w-32 text-gray-400 flex-shrink-0">Email</dt><dd className="text-gray-900">{business.email}</dd></div>
              <div className="flex"><dt className="w-32 text-gray-400 flex-shrink-0">Website</dt>
                <dd><a href={business.website} target="_blank" rel="noopener" className="text-primary hover:underline flex items-center gap-1">
                  {business.website.replace(/^https?:\/\//, "")} <ExternalLink className="w-3 h-3" />
                </a></dd>
              </div>
              <div className="flex"><dt className="w-32 text-gray-400 flex-shrink-0">Address</dt>
                <dd className="text-gray-900">{business.address_street}, {business.address_city}, {business.address_state} {business.address_zip}</dd>
              </div>
              {business.founding_year && (
                <div className="flex"><dt className="w-32 text-gray-400 flex-shrink-0">Founded</dt><dd className="text-gray-900">{business.founding_year}</dd></div>
              )}
              <div className="flex"><dt className="w-32 text-gray-400 flex-shrink-0">Services</dt>
                <dd className="text-gray-900">{business.service_categories.join(", ") || "—"}</dd>
              </div>
            </dl>
          </div>

          {/* AI Descriptions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">AI Descriptions</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {approvedDescriptions.length} approved &middot; {descriptions?.length ?? 0} total
                </p>
              </div>
              <GenerateDescriptionsButton businessId={business.id} />
            </div>

            {descriptions && descriptions.length > 0 ? (
              <div className="space-y-3">
                {approvedDescriptions.length === 0 && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-700">
                    Click the circle on a description to approve it. Approved descriptions are used in citation signups.
                  </div>
                )}
                {descriptions.map((desc) => (
                  <DescriptionCard key={desc.id} description={desc} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No descriptions yet. Generate some above.</p>
            )}
          </div>

          {/* Recent citation accounts */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Citation Accounts</h2>
              <Link href={`/runs?business_id=${business.id}`}
                className="text-xs text-primary hover:underline">View all runs</Link>
            </div>
            {accounts && accounts.length > 0 ? (
              <div className="space-y-2">
                {accounts.map((account: any) => (
                  <div key={account.id} className="flex items-center justify-between text-sm py-1.5">
                    <span className="text-gray-900">{account.sites?.name ?? "Unknown site"}</span>
                    <div className="flex items-center gap-3">
                      {account.profile_url && (
                        <a href={account.profile_url} target="_blank" rel="noopener"
                          className="text-primary hover:underline flex items-center gap-1 text-xs">
                          Profile <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        account.account_status === "active" ? "bg-green-50 text-green-700" :
                        account.account_status === "flagged" ? "bg-red-50 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{account.account_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No accounts yet. Run a bulk discovery to create them.</p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Gmail connection */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Gmail Connection</h2>
            {business.gmail_connected_at ? (
              <div>
                <div className="flex items-center gap-2 text-green-600 text-sm mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                  Connected
                </div>
                <p className="text-xs text-gray-400">
                  CitationBot can automatically click email verification links.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 text-yellow-600 text-sm mb-3">
                  <AlertCircle className="w-4 h-4" />
                  Not connected
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Connect Gmail to automate email verification during signups.
                </p>
                <ConnectGmailButton businessId={business.id} />
              </div>
            )}
          </div>

          {/* Google Sheet */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Google Sheet Ledger</h2>
            {business.google_sheet_url ? (
              <a href={business.google_sheet_url} target="_blank" rel="noopener"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> Open Ledger
              </a>
            ) : (
              <p className="text-sm text-gray-400 italic">
                Sheet will be created after first successful citation signup.
              </p>
            )}
          </div>

          {/* Backlinks */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Backlinks</h2>
              <Link href={`/businesses/${business.id}/edit#backlinks`}
                className="text-xs text-primary hover:underline">Edit</Link>
            </div>
            {backlinks && backlinks.length > 0 ? (
              <div className="space-y-2">
                {backlinks.map((bl) => (
                  <div key={bl.id} className="text-xs">
                    <p className="text-gray-900 font-medium">{bl.anchor_text}</p>
                    <p className="text-gray-400 truncate">{bl.url}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No backlinks added.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
