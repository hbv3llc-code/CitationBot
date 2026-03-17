"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Proxy } from "@/types";

export function ProxySettingsForm({ proxies }: { proxies: Partial<Proxy>[] }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ host: "", port: "", username: "", password: "", proxy_type: "residential" as const });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("proxy_pool").insert({
      user_id: user.id,
      host: form.host,
      port: parseInt(form.port),
      username: form.username || null,
      proxy_type: form.proxy_type,
    });

    setForm({ host: "", port: "", username: "", password: "", proxy_type: "residential" });
    setAdding(false);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    await supabase.from("proxy_pool").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div>
      {proxies.length > 0 ? (
        <div className="space-y-2 mb-4">
          {proxies.map((proxy) => (
            <div key={proxy.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                {proxy.is_flagged ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                ) : proxy.is_active ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-gray-300" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{proxy.host}:{proxy.port}</p>
                  <p className="text-xs text-gray-400">{proxy.proxy_type} {proxy.username ? `· ${proxy.username}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {proxy.fail_count && proxy.fail_count > 0 && (
                  <span className="text-xs text-red-500">{proxy.fail_count} fails</span>
                )}
                <button onClick={() => handleDelete(proxy.id!)}
                  className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic mb-4">No proxies added. Signups will use your server&apos;s IP.</p>
      )}

      {adding ? (
        <form onSubmit={handleAdd} className="space-y-3 p-4 border border-gray-200 rounded-lg">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Host *</label>
              <input required value={form.host} onChange={(e) => setForm((p) => ({ ...p, host: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" placeholder="proxy.example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Port *</label>
              <input required type="number" value={form.port} onChange={(e) => setForm((p) => ({ ...p, port: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" placeholder="8080" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
              <input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={form.proxy_type} onChange={(e) => setForm((p) => ({ ...p, proxy_type: e.target.value as typeof form.proxy_type }))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
                <option value="residential">Residential</option>
                <option value="datacenter">Datacenter</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Adding..." : "Add Proxy"}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <Plus className="w-4 h-4" /> Add Proxy
        </button>
      )}
    </div>
  );
}
