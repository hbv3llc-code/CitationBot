"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export function GenerateDescriptionsButton({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    await fetch("/api/descriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: businessId, count: 5 }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
    >
      <Sparkles className="w-3.5 h-3.5" />
      {loading ? "Generating..." : "Generate Descriptions"}
    </button>
  );
}
