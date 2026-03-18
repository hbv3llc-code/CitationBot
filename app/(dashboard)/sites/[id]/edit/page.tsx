"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function EditSitePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    signup_url: "",
    allows_backlinks: false,
    requires_email_verification: true,
  });

  useEffect(() => {
    fetch(`/api/sites/${params.id}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setForm({
            name: data.name,
            signup_url: data.signup_url,
            allows_backlinks: data.allows_backlinks,
            requires_email_verification: data.requires_email_verification,
          });
        }
        setLoading(false);
      });
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/sites/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save");
    } else {
      router.push(`/sites/${params.id}`);
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/sites/${params.id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Site</h1>
          <p className="text-gray-500 text-sm mt-0.5">Update site details and feature flags</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Site Name *
            </label>
            <input
              required
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: typeof form) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Signup URL *
            </label>
            <input
              required
              type="url"
              value={form.signup_url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: typeof form) => ({ ...p, signup_url: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="mt-1 text-xs text-gray-400">
              Must point directly to a registration form — not a homepage or login page.
            </p>
          </div>

          <div className="space-y-3 pt-2 border-t border-gray-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requires_email_verification}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((p: typeof form) => ({ ...p, requires_email_verification: e.target.checked }))
                }
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">Requires email verification</p>
                <p className="text-xs text-gray-400">
                  CitationBot will watch Gmail for verification emails and click them automatically
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allows_backlinks}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((p: typeof form) => ({ ...p, allows_backlinks: e.target.checked }))
                }
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">Allows backlinks</p>
                <p className="text-xs text-gray-400">
                  Profile includes a website URL field — CitationBot will fill it from your backlink pool
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href={`/sites/${params.id}`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
