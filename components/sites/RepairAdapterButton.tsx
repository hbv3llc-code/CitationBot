"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";

export function RepairAdapterButton({ siteId }: { siteId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleRepair() {
    setLoading(true);
    setResult(null);

    const res = await fetch(`/api/sites/${siteId}/adapter`, { method: "PUT" });
    const data = await res.json();

    setLoading(false);
    setResult(data.message ?? (data.error ? `Error: ${data.error}` : "Done"));
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRepair}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
      >
        <Wand2 className="w-4 h-4" />
        {loading ? "Repairing..." : "Auto-Repair"}
      </button>
      {result && <p className="text-xs text-gray-500">{result}</p>}
    </div>
  );
}
