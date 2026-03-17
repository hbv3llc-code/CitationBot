import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Settings, Shield, Globe } from "lucide-react";
import { ProxySettingsForm } from "@/components/settings/ProxySettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: proxies } = await supabase
    .from("proxy_pool")
    .select("id, host, port, username, proxy_type, is_active, is_flagged, fail_count, last_used_at")
    .order("created_at");

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage proxies, concurrency, and account preferences</p>
      </div>

      <div className="space-y-6">
        {/* Account */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Account</h2>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex">
              <dt className="w-24 text-gray-400">Email</dt>
              <dd className="text-gray-900">{user?.email}</dd>
            </div>
          </dl>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Proxy pool */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Proxy Pool</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Residential proxies protect your business domain from being flagged. CitationBot automatically
            rotates proxies and alerts you if the pool drops below a reliable level.
          </p>
          <ProxySettingsForm proxies={proxies ?? []} />
        </div>

        {/* Security info */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm">Security</h2>
          <ul className="space-y-2 text-xs text-gray-500">
            <li className="flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
              All citation account passwords are randomly generated and encrypted with AES-256. No two sites share a password.
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
              Passwords are never written to Google Sheets. The ledger shows &ldquo;stored in CitationBot&rdquo; in the password column.
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
              Gmail connections use read-only OAuth. CitationBot can only read incoming emails to find verification links.
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
              All data is stored in a private Supabase database. Dashboard access requires email and password authentication.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
