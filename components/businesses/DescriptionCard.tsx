"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Trash2, Loader2 } from "lucide-react";
import type { BusinessDescription } from "@/types";

export function DescriptionCard({ description }: { description: BusinessDescription }) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function toggleApproved() {
    setLoading(true);
    await fetch(`/api/descriptions/${description.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: !description.approved }),
    });
    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this description?")) return;
    setDeleting(true);
    await fetch(`/api/descriptions/${description.id}`, { method: "DELETE" });
    setDeleting(false);
    router.refresh();
  }

  return (
    <div
      className={`p-3 rounded-lg border text-sm group ${
        description.approved
          ? "border-green-200 bg-green-50"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={toggleApproved}
          disabled={loading}
          title={description.approved ? "Click to unapprove" : "Click to approve"}
          className="mt-0.5 flex-shrink-0 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : description.approved ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 hover:text-green-700" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-gray-300 hover:border-primary transition-colors" />
          )}
        </button>
        <p className="flex-1 text-gray-700 leading-relaxed">{description.content}</p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-shrink-0 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
          title="Delete description"
        >
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      {description.approved && (
        <p className="mt-1.5 ml-6 text-xs text-green-600 font-medium">
          Approved — will be used in citation signups
        </p>
      )}
    </div>
  );
}
