"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";

export function GenerateDescriptionsButton({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { success, error } = useToast();

  async function handleGenerate() {
    setLoading(true);
    const res = await fetch("/api/descriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: businessId, count: 5 }),
    });

    setLoading(false);

    if (res.ok) {
      success("Descriptions generated", "Click the circle on any description to approve it.");
      router.refresh();
    } else {
      const data = await res.json();
      error("Generation failed", data.error ?? "Please try again.");
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Sparkles className="w-3.5 h-3.5" />
      )}
      {loading ? "Generating..." : "Generate Descriptions"}
    </button>
  );
}
