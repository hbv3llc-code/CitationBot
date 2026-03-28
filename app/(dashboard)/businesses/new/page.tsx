"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GoogleCategoryInput } from "@/components/businesses/GoogleCategoryInput";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export default function NewBusinessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "", owner_name: "", address_street: "", address_city: "",
    address_state: "", address_zip: "", phone: "", email: "", website: "", founding_year: "",
  });

  function update(field: string, value: string) {
    setForm((prev: typeof form) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        founding_year: form.founding_year ? parseInt(form.founding_year) : null,
        address_country: "US",
        service_categories: categories,
      }),
    });

    const { data, error: msg } = await res.json();
    if (!res.ok || !data) {
      setError(msg ?? "Failed to create business");
      setLoading(false);
      return;
    }

    router.push(`/businesses/${data.id}`);
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/businesses" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Business</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fill in the business profile used for all citations</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Business Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
              <input required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Acme Plumbing Co." />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
              <input required value={form.owner_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("owner_name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="John Smith" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("phone", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="(555) 123-4567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("email", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="info@acmeplumbing.com" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Website *</label>
              <input required type="url" value={form.website} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("website", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="https://acmeplumbing.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Founding Year</label>
              <input type="number" min="1900" max={new Date().getFullYear()} value={form.founding_year}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("founding_year", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="2005" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Address</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input value={form.address_street} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("address_street", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="123 Main St" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input value={form.address_city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("address_city", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Springfield" />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="62701" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Service Categories</h2>
          <GoogleCategoryInput categories={categories} onChange={setCategories} />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/businesses"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {loading ? "Saving..." : "Save Business"}
          </button>
        </div>
      </form>
    </div>
  );
}
