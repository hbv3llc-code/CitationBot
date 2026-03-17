/**
 * Utilities for communicating with the CitationBot Chrome extension.
 *
 * The extension uses Chrome's `externally_connectable` API to receive messages
 * from whitelisted origins (localhost:3000 and production domain).
 */

// Extension ID is set in the Chrome Web Store developer dashboard.
// During development, find it at chrome://extensions after loading unpacked.
const EXTENSION_ID = process.env.NEXT_PUBLIC_CHROME_EXTENSION_ID ?? "";

export interface TeachingSessionParams {
  siteId: string;
  siteName: string;
  signupUrl: string;
  businessFields: Record<string, string>;
}

/**
 * Sends a message to the CitationBot extension to start a teaching session.
 * Returns true if the extension received the message, false otherwise.
 */
export async function startExtensionTeachingSession(
  params: TeachingSessionParams
): Promise<boolean> {
  if (!EXTENSION_ID || typeof chrome === "undefined" || !chrome.runtime) {
    return false;
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      { type: "START_TEACHING_SESSION", ...params },
      (response: { success?: boolean } | undefined) => {
        if (chrome.runtime.lastError) {
          resolve(false);
        } else {
          resolve(response?.success === true);
        }
      }
    );
  });
}

/**
 * Checks if the CitationBot extension is installed and accessible.
 */
export async function isExtensionInstalled(): Promise<boolean> {
  if (!EXTENSION_ID || typeof chrome === "undefined" || !chrome.runtime) {
    // Fall back to checking the window flag set by the content script
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof window !== "undefined" &&
      (window as any).__CITATIONBOT_EXTENSION_INSTALLED === true;
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      { type: "GET_SESSION_STATUS" },
      (response: unknown) => {
        resolve(!chrome.runtime.lastError && response !== undefined);
      }
    );
  });
}
