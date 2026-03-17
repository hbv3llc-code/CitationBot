"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewSitePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    signup_url: "",
    allows_backlinks: false,
    requires_email_verification: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to add site");
      setLoading(false);
    } else {
      router.push(`/sites/${data.data.id}`);
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/sites" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Site</h1>
          <p className="text-gray-500 text-sm mt-0.5">Add a citation directory to your site list</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Yelp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Signup URL *</label>
            <input
              required
              type="url"
              value={form.signup_url}
              onChange={(e) => setForm((p) => ({ ...p, signup_url: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="https://biz.yelp.com/signup"
            />
            <p className="mt-1 text-xs text-gray-400">
              Must point directly to a registration or signup form — not a homepage or login page.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requires_email_verification}
                onChange={(e) => setForm((p) => ({ ...p, requires_email_verification: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">Requires email verification</p>
                <p className="text-xs text-gray-400">CitationBot will watch for and click the confirmation email</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allows_backlinks}
                onChange={(e) => setForm((p) => ({ ...p, allows_backlinks: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">Allows backlinks</p>
                <p className="text-xs text-gray-400">Profile includes a field for a website URL with anchor text</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/sites"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving..." : "Add Site"}
          </button>
        </div>
      </form>
    </div>
  );
}
