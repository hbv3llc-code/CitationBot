"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseCsvSites } from "@/lib/utils";
import type { Business } from "@/types";

const supabase = createClient();

export default function NewRunPage() {
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [csvText, setCsvText] = useState("");
  const [parsedSites, setParsedSites] = useState<Array<{ name: string; signup_url: string }>>([]);
  const [concurrency, setConcurrency] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("businesses").select("*").order("name").then(({ data }: { data: Business[] | null }) => {
      if (data) setBusinesses(data);
    });
  }, [supabase]);

  function handleCsvChange(text: string) {
    setCsvText(text);
    if (text.trim()) {
      const parsed = parseCsvSites(text);
      setParsedSites(parsed);
    } else {
      setParsedSites([]);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleCsvChange(ev.target?.result as string);
    reader.readAsText(file);
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBusiness || parsedSites.length === 0) return;
    setLoading(true);
    setError(null);

    const response = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: selectedBusiness,
        sites: parsedSites,
        concurrency,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Failed to start run");
      setLoading(false);
    } else {
      router.push(`/runs/${data.run_id}`);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/runs" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Bulk Run</h1>
          <p className="text-gray-500 text-sm mt-0.5">Upload a CSV of sites to automatically create citation accounts</p>
        </div>
      </div>

      <form onSubmit={handleStart} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Business selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Business *</label>
          <select
            required
            value={selectedBusiness}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedBusiness(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select a business...</option>
            {businesses.map((b: Business) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {businesses.length === 0 && (
            <p className="mt-2 text-xs text-gray-400">
              No businesses yet.{" "}
              <Link href="/businesses/new" className="text-primary hover:underline">Add one first.</Link>
            </p>
          )}
        </div>

        {/* CSV upload */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Site List</h2>
            <p className="text-xs text-gray-400">
              CSV format: <code className="bg-gray-100 px-1 py-0.5 rounded">Site Name, Signup URL</code> (one per line)
            </p>
          </div>

          <label className="block">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 transition-colors">
              <Upload className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Drop a CSV file here or click to browse</p>
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </div>
          </label>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Or paste CSV text</label>
            <textarea
              value={csvText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleCsvChange(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder={"Yelp,https://biz.yelp.com/signup\nYellow Pages,https://ypg.com/register\nFoursquare,https://foursquare.com/business/register"}
            />
          </div>

          {parsedSites.length > 0 && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-xs font-medium text-green-700 mb-2">
                {parsedSites.length} sites ready to process
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {parsedSites.slice(0, 10).map((site: { name: string; signup_url: string }, i: number) => (
                  <div key={i} className="text-xs text-green-600 flex justify-between">
                    <span>{site.name}</span>
                    <span className="text-green-400 truncate ml-4 max-w-48">{site.signup_url}</span>
                  </div>
                ))}
                {parsedSites.length > 10 && (
                  <p className="text-xs text-green-400">+{parsedSites.length - 10} more</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Concurrency */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Concurrency</h2>
          <p className="text-xs text-gray-400 mb-4">
            Run multiple sites simultaneously. Start with 1 for maximum visibility.
          </p>
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setConcurrency(n)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  concurrency === n
                    ? "bg-primary text-white"
                    : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/runs"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !selectedBusiness || parsedSites.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Starting..." : `Start Run (${parsedSites.length} sites)`}
          </button>
        </div>
      </form>
    </div>
  );
}
