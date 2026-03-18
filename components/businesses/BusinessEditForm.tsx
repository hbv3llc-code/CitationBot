"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Business, BacklinkEntry } from "@/types";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export function BusinessEditForm({
  business,
  initialBacklinks,
}: {
  business: Business;
  initialBacklinks: BacklinkEntry[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [categories, setCategories] = useState<string[]>(business.service_categories ?? []);
  const [backlinks, setBacklinks] = useState(
    initialBacklinks.length > 0
      ? initialBacklinks.map((b) => ({ id: b.id, url: b.url, anchor_text: b.anchor_text }))
      : [{ id: "", url: "", anchor_text: "" }]
  );

  const [form, setForm] = useState({
    name: business.name,
    owner_name: business.owner_name,
    address_street: business.address_street,
    address_city: business.address_city,
    address_state: business.address_state,
    address_zip: business.address_zip,
    phone: business.phone,
    email: business.email,
    website: business.website,
    founding_year: business.founding_year?.toString() ?? "",
  });

  type BacklinkItem = { id: string; url: string; anchor_text: string };

  function update(field: string, value: string) {
    setForm((prev: typeof form) => ({ ...prev, [field]: value }));
  }

  function addCategory() {
    const cat = categoryInput.trim();
    if (cat && !categories.includes(cat)) {
      setCategories((prev: string[]) => [...prev, cat]);
      setCategoryInput("");
    }
  }

  function updateBacklink(index: number, field: "url" | "anchor_text", value: string) {
    setBacklinks((prev: BacklinkItem[]) => prev.map((b: BacklinkItem, i: number) => (i === index ? { ...b, [field]: value } : b)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Update business
    const res = await fetch(`/api/businesses/${business.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        founding_year: form.founding_year ? parseInt(form.founding_year) : null,
        service_categories: categories,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to update");
      setLoading(false);
      return;
    }

    // Sync backlinks: delete all existing, re-insert
    await supabase.from("backlink_pool").delete().eq("business_id", business.id);

    const validBacklinks = backlinks.filter((b: BacklinkItem) => b.url && b.anchor_text);
    if (validBacklinks.length > 0) {
      await supabase.from("backlink_pool").insert(
        validBacklinks.map(({ url, anchor_text }: { url: string; anchor_text: string }) => ({
          business_id: business.id,
          url,
          anchor_text,
        }))
      );
    }

    router.push(`/businesses/${business.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Business Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
            <input required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
            <input required value={form.owner_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("owner_name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("phone", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("email", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Website *</label>
            <input required type="url" value={form.website} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("website", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Founding Year</label>
            <input type="number" min="1900" max={new Date().getFullYear()} value={form.founding_year}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("founding_year", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Address</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
            <input value={form.address_street} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("address_street", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input value={form.address_city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("address_city", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <select value={form.address_state} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => update("address_state", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">Select state</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
            <input value={form.address_zip} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("address_zip", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>
      </div>

      {/* Service categories */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Service Categories</h2>
        <div className="flex gap-2">
          <input value={categoryInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategoryInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Add a service category" />
          <button type="button" onClick={addCategory}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            Add
          </button>
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat: string) => (
              <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-sm">
                {cat}
                <button type="button" onClick={() => setCategories((p: string[]) => p.filter((c: string) => c !== cat))}
                  className="hover:text-primary/60">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Backlinks */}
      <div id="backlinks" className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Backlink Pool</h2>
            <p className="text-xs text-gray-400 mt-0.5">URLs used on sites that allow profile links</p>
          </div>
          <button type="button"
            onClick={() => setBacklinks((p: BacklinkItem[]) => [...p, { id: "", url: "", anchor_text: "" }])}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Link
          </button>
        </div>
        <div className="space-y-3">
          {backlinks.map((bl: BacklinkItem, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input value={bl.url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateBacklink(i, "url", e.target.value)}
                  type="url" placeholder="https://..."
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input value={bl.anchor_text} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateBacklink(i, "anchor_text", e.target.value)}
                  placeholder="Anchor text"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              {backlinks.length > 1 && (
                <button type="button"
                  onClick={() => setBacklinks((p: BacklinkItem[]) => p.filter((_: BacklinkItem, idx: number) => idx !== i))}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link href={`/businesses/${business.id}`}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Cancel
        </Link>
        <button type="submit" disabled={loading}
          className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
