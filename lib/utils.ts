import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function parseCsvSites(csv: string): Array<{ name: string; signup_url: string }> {
  const lines = csv.trim().split("\n");
  const results: Array<{ name: string; signup_url: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Skip header row if present
    if (i === 0 && (line.toLowerCase().includes("name") || line.toLowerCase().includes("site"))) {
      continue;
    }

    const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length >= 2 && parts[0] && parts[1]) {
      results.push({ name: parts[0], signup_url: parts[1] });
    }
  }

  return results;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: "text-green-600 bg-green-50",
    ok: "text-green-600 bg-green-50",
    success: "text-green-600 bg-green-50",
    completed: "text-green-600 bg-green-50",
    pending: "text-yellow-600 bg-yellow-50",
    running: "text-blue-600 bg-blue-50",
    learning: "text-blue-600 bg-blue-50",
    repairing: "text-orange-600 bg-orange-50",
    failed: "text-red-600 bg-red-50",
    broken: "text-red-600 bg-red-50",
    removed: "text-red-600 bg-red-50",
    flagged: "text-red-600 bg-red-50",
    blocked: "text-gray-600 bg-gray-50",
    skipped: "text-gray-600 bg-gray-50",
    unknown: "text-gray-600 bg-gray-50",
    cancelled: "text-gray-600 bg-gray-50",
  };
  return map[status] ?? "text-gray-600 bg-gray-50";
}
