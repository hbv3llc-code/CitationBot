"use client";

import { Mail } from "lucide-react";

export function ConnectGmailButton({ businessId }: { businessId: string }) {
  return (
    <a
      href={`/api/auth/google?business_id=${businessId}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <Mail className="w-3.5 h-3.5" />
      Connect Gmail
    </a>
  );
}
