"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2 } from "lucide-react";

export function BlockSiteButton({
  siteId,
  isBlocked,
  siteName,
}: {
  siteId: string;
  isBlocked: boolean;
  siteName: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    if (!isBlocked) {
      const reason = window.prompt(
        `Block "${siteName}"?\n\nEnter a reason (optional):`
      );
      if (reason === null) return; // cancelled
    }

    setLoading(true);
    await fetch(`/api/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_blocked: !isBlocked,
        blocked_reason: isBlocked ? null : "Manually blocked",
      }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
        isBlocked
          ? "border-green-300 text-green-700 hover:bg-green-50"
          : "border-gray-300 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {isBlocked ? (
        <>
          <CheckCircle2 className="w-4 h-4" /> Unblock
        </>
      ) : (
        <>
          <Ban className="w-4 h-4" /> Block Site
        </>
      )}
    </button>
  );
}
