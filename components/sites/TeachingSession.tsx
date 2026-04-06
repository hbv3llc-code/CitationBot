"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, ChevronRight, Loader2, ExternalLink } from "lucide-react";
import type { Site } from "@/types";

declare global {
  interface Window {
    __CITATIONBOT_EXTENSION_INSTALLED?: boolean;
    __CITATIONBOT_EXTENSION_ID?: string;
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: object,
          callback?: (response: unknown) => void
        ) => void;
      };
    };
  }
}

type Step = "select_business" | "install_extension" | "open_site" | "waiting_extension" | "map_fields" | "confirm" | "done";

interface FieldMapping {
  field_key: string;
  selector: string;
  label: string;
}

const FIELD_OPTIONS = [
  { key: "name", label: "Business Name" },
  { key: "owner_name", label: "Owner Name" },
  { key: "address_street", label: "Street Address" },
  { key: "address_city", label: "City" },
  { key: "address_state", label: "State" },
  { key: "address_zip", label: "ZIP Code" },
  { key: "phone", label: "Phone Number" },
  { key: "email", label: "Email Address" },
  { key: "website", label: "Website URL" },
  { key: "founding_year", label: "Year Founded" },
  { key: "description", label: "Business Description" },
  { key: "backlink_url", label: "Backlink URL" },
  { key: "backlink_anchor", label: "Backlink Anchor Text" },
];

export function TeachingSession({
  site,
  businesses,
}: {
  site: Site;
  businesses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select_business");
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [currentField, setCurrentField] = useState("");
  const [selectorInput, setSelectorInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const extensionInstalled =
    typeof window !== "undefined" &&
    window.__CITATIONBOT_EXTENSION_INSTALLED === true;

  // Poll for adapter completion when waiting for extension
  useEffect(() => {
    if (step !== "waiting_extension") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/sites/${site.id}`);
      const data = await res.json();
      if (data?.data?.adapter_status === "active") {
        if (pollRef.current) clearInterval(pollRef.current);
        setStep("done");
      }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, site.id]);

  async function startExtensionSession() {
    setExtensionError(null);
    const extensionId = window.__CITATIONBOT_EXTENSION_ID;
    if (!extensionId || !window.chrome?.runtime) {
      setExtensionError("Extension not reachable. Try reloading the page.");
      return;
    }

    // Fetch full business data
    const res = await fetch(`/api/businesses/${selectedBusiness}`);
    const { data: business } = await res.json();
    if (!business) {
      setExtensionError("Could not load business data.");
      return;
    }

    const businessFields = {
      name: business.name ?? "",
      owner_name: business.owner_name ?? "",
      address_street: business.address_street ?? "",
      address_city: business.address_city ?? "",
      address_state: business.address_state ?? "",
      address_zip: business.address_zip ?? "",
      address_country: business.address_country ?? "US",
      phone: business.phone ?? "",
      email: business.email ?? "",
      website: business.website ?? "",
      founding_year: business.founding_year?.toString() ?? "",
      description: "",
      backlink_url: "",
      backlink_anchor: "",
    };

    window.chrome.runtime.sendMessage(
      extensionId,
      {
        type: "START_TEACHING_SESSION",
        siteId: site.id,
        siteName: site.name,
        signupUrl: site.signup_url,
        businessFields,
      },
      (response) => {
        const r = response as { success?: boolean; error?: string } | null;
        if (r?.success) {
          setStep("waiting_extension");
        } else {
          setExtensionError(r?.error ?? "Failed to start extension session.");
        }
      }
    );
  }

  function addFieldMapping() {
    if (!currentField || !selectorInput.trim()) return;
    const fieldDef = FIELD_OPTIONS.find((f) => f.key === currentField);
    if (!fieldDef) return;
    setFieldMappings((prev: FieldMapping[]) => {
      const filtered = prev.filter((m: FieldMapping) => m.field_key !== currentField);
      return [...filtered, { field_key: currentField, selector: selectorInput.trim(), label: fieldDef.label }];
    });
    setCurrentField("");
    setSelectorInput("");
  }

  function removeMapping(field_key: string) {
    setFieldMappings((prev: FieldMapping[]) => prev.filter((m: FieldMapping) => m.field_key !== field_key));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const instructions = {
      steps: [
        { type: "navigate", description: "Go to signup page" },
        ...fieldMappings.map((m: FieldMapping) => ({
          type: "fill", selector: m.selector, field_key: m.field_key, description: `Fill ${m.label}`,
        })),
        { type: "click", selector: "button[type=submit], input[type=submit]", description: "Submit form" },
      ],
      field_mappings: fieldMappings.map((m: FieldMapping) => ({ field_key: m.field_key, selector: m.selector })),
    };
    const res = await fetch(`/api/sites/${site.id}/adapter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructions, taught_by: "user" }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) setError(data.error ?? "Failed to save adapter");
    else setStep("done");
  }

  const visibleSteps: Step[] = ["select_business", "install_extension", "open_site", "map_fields", "confirm"];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {visibleSteps.map((s, i, arr) => {
          const currentIndex = step === "waiting_extension" ? 2 : arr.indexOf(step as Step);
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                currentIndex === i ? "bg-primary text-white" :
                currentIndex > i ? "bg-green-500 text-white" :
                "bg-gray-200 text-gray-400"
              }`}>
                {currentIndex > i ? "✓" : i + 1}
              </div>
              {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Select business */}
      {step === "select_business" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Step 1 — Select Business</h2>
          <p className="text-sm text-gray-500 mb-4">
            CitationBot will fill the form using this business&apos;s data as you map each field.
          </p>
          {businesses.length === 0 ? (
            <p className="text-sm text-gray-400">
              No businesses yet.{" "}
              <a href="/businesses/new" className="text-primary hover:underline">Add one first.</a>
            </p>
          ) : (
            <>
              <select
                value={selectedBusiness}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedBusiness(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
              >
                <option value="">Select a business...</option>
                {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button
                onClick={() => setStep("install_extension")}
                disabled={!selectedBusiness}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Continue
              </button>
            </>
          )}
        </div>
      )}

      {/* Step 2: Install extension */}
      {step === "install_extension" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Step 2 — Install Chrome Extension</h2>
          <p className="text-sm text-gray-500 mb-4">
            The CitationBot extension activates in your browser during teaching sessions.
          </p>
          {extensionInstalled ? (
            <div className="flex items-center gap-2 text-green-600 text-sm mb-4">
              <CheckCircle2 className="w-4 h-4" /> Extension detected — you&apos;re all set
            </div>
          ) : (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Extension not detected</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Load the CitationBot extension from the <code className="bg-yellow-100 px-1 rounded">extension/</code> folder
                    in Chrome via <strong>chrome://extensions</strong> → Developer mode → Load unpacked.
                    Then reload this page.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep("select_business")}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Back
            </button>
            <button onClick={() => setStep("open_site")}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              {extensionInstalled ? "Continue" : "Skip (manual mapping)"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Open site / Start extension session */}
      {step === "open_site" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Step 3 — Start Teaching Session</h2>

          {extensionInstalled ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Click below to open {site.name}&apos;s signup page with the teaching overlay active.
                Map each form field in the overlay, then click Save &amp; Finish.
              </p>
              {extensionError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {extensionError}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep("install_extension")}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button
                  onClick={startExtensionSession}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open {site.name} with Teaching Overlay
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Open {site.name}&apos;s signup page and map fields manually using CSS selectors.
              </p>
              <a href={site.signup_url} target="_blank" rel="noopener"
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-4">
                <ExternalLink className="w-4 h-4" /> Open {site.name} signup page
              </a>
              <div className="flex gap-3">
                <button onClick={() => setStep("install_extension")}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button onClick={() => setStep("map_fields")}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  Map Fields Manually
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Waiting for extension to complete */}
      {step === "waiting_extension" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <h2 className="font-semibold text-gray-900 mb-2">Teaching Session Active</h2>
          <p className="text-sm text-gray-500 mb-2">
            Map the form fields in the CitationBot overlay on the {site.name} signup page.
            Click <strong>Save &amp; Finish</strong> in the overlay when done.
          </p>
          <p className="text-xs text-gray-400">This page will update automatically when complete.</p>
        </div>
      )}

      {/* Step 4: Map fields manually */}
      {step === "map_fields" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Step 4 — Map Form Fields</h2>
            <p className="text-sm text-gray-500 mb-4">
              For each field on the signup form, provide its CSS selector and the business data it maps to.
              Use DevTools (right-click → Inspect) to find selectors.
            </p>
            <div className="flex gap-2 mb-4">
              <select value={currentField} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurrentField(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Select field...</option>
                {FIELD_OPTIONS.filter((f) => !fieldMappings.find((m: FieldMapping) => m.field_key === f.key))
                  .map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
              <input
                value={selectorInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectorInput(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); addFieldMapping(); } }}
                placeholder='e.g. input[name="business_name"]'
                className="flex-[2] px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button type="button" onClick={addFieldMapping}
                disabled={!currentField || !selectorInput.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                Add
              </button>
            </div>
            {fieldMappings.length > 0 ? (
              <div className="space-y-2 mb-4">
                {fieldMappings.map((m: FieldMapping) => (
                  <div key={m.field_key} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.label}</p>
                        <p className="text-xs text-gray-500 font-mono">{m.selector}</p>
                      </div>
                    </div>
                    <button onClick={() => removeMapping(m.field_key)}
                      className="text-gray-400 hover:text-red-500 text-xs transition-colors">Remove</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg mb-4">
                No fields mapped yet. Add at least 3 fields to proceed.
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep("open_site")}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Back
              </button>
              <button onClick={() => setStep("confirm")} disabled={fieldMappings.length < 3}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                Review & Save ({fieldMappings.length} fields mapped)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Confirm */}
      {step === "confirm" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Step 5 — Confirm & Lock Adapter</h2>
          <p className="text-sm text-gray-500 mb-4">
            Review your field mappings. Once saved, CitationBot will use these instructions for every
            future signup on {site.name}.
          </p>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}
          <div className="space-y-2 mb-6">
            {fieldMappings.map((m: FieldMapping) => (
              <div key={m.field_key} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                <span className="font-medium text-gray-900">{m.label}</span>
                <span className="text-gray-500 font-mono text-xs">{m.selector}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("map_fields")}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Back & Edit
            </button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving..." : "Lock Adapter & Finish"}
            </button>
          </div>
        </div>
      )}

      {/* Done */}
      {step === "done" && (
        <div className="bg-white rounded-xl border border-green-200 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {site.name} is now fully automated
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            CitationBot has locked the adapter. Every future run will sign up automatically on {site.name}.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={() => router.push(`/sites/${site.id}`)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Back to Site
            </button>
            <button onClick={() => router.push("/runs/new")}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Start a Bulk Run
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
