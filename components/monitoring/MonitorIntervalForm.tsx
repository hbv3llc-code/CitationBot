"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

const PRESET_INTERVALS = [
  { days: 7, label: "Weekly" },
  { days: 14, label: "Every 2 weeks" },
  { days: 30, label: "Monthly" },
  { days: 60, label: "Every 2 months" },
  { days: 90, label: "Quarterly" },
];

export function MonitorIntervalForm({
  accountId,
  currentInterval,
  nextMonitorAt,
}: {
  accountId: string;
  currentInterval: number;
  nextMonitorAt: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function setInterval(days: number) {
    setSaving(true);
    setSaved(false);

    const nextCheck = new Date();
    nextCheck.setDate(nextCheck.getDate() + days);

    await fetch(`/api/monitoring/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monitor_interval_days: days,
        next_monitor_at: nextCheck.toISOString(),
      }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESET_INTERVALS.map((preset) => (
          <button
            key={preset.days}
            onClick={() => setInterval(preset.days)}
            disabled={saving}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
              currentInterval === preset.days
                ? "bg-primary text-white border-primary"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        {saving ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : saved ? (
          <Check className="w-3 h-3 text-green-500" />
        ) : null}
        <span>
          {nextMonitorAt
            ? `Next check: ${formatDate(nextMonitorAt)}`
            : "Not yet scheduled"}
        </span>
      </div>
    </div>
  );
}
