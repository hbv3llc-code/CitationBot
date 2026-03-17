/**
 * CitationBot Chrome Extension — Background Service Worker
 *
 * Handles:
 * - Messages from the teaching session dashboard (via externally_connectable)
 * - Communication between popup <-> content script
 * - Storing the active teaching session state
 */

// Current teaching session state
let teachingSession = null;

// ============================================================
// Message handling from the CitationBot dashboard
// ============================================================

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === "START_TEACHING_SESSION") {
    teachingSession = {
      siteId: message.siteId,
      siteName: message.siteName,
      signupUrl: message.signupUrl,
      businessFields: message.businessFields,
      dashboardUrl: sender.url,
      mappings: [],
      active: true,
    };

    chrome.storage.session.set({ teachingSession });
    sendResponse({ success: true });

    // Open the signup page in a new tab
    chrome.tabs.create({ url: message.signupUrl }, (tab) => {
      teachingSession.tabId = tab.id;
      chrome.storage.session.set({ teachingSession });
    });
  }

  if (message.type === "GET_SESSION_STATUS") {
    sendResponse({ session: teachingSession });
  }

  if (message.type === "END_TEACHING_SESSION") {
    teachingSession = null;
    chrome.storage.session.remove("teachingSession");
    sendResponse({ success: true });
  }

  return true; // Keep message channel open for async response
});

// ============================================================
// Message handling from content script
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_TEACHING_SESSION") {
    chrome.storage.session.get("teachingSession", (result) => {
      sendResponse({ session: result.teachingSession ?? null });
    });
    return true;
  }

  if (message.type === "FIELD_MAPPED") {
    // Content script reports a confirmed field mapping
    chrome.storage.session.get("teachingSession", (result) => {
      const session = result.teachingSession;
      if (!session) return;

      // Update or add mapping
      const existing = session.mappings.findIndex((m) => m.field_key === message.mapping.field_key);
      if (existing >= 0) {
        session.mappings[existing] = message.mapping;
      } else {
        session.mappings.push(message.mapping);
      }

      chrome.storage.session.set({ teachingSession: session });
      sendResponse({ mappings: session.mappings });
    });
    return true;
  }

  if (message.type === "SAVE_ADAPTER") {
    // Content script requests saving the adapter to the dashboard
    chrome.storage.session.get("teachingSession", async (result) => {
      const session = result.teachingSession;
      if (!session) {
        sendResponse({ success: false, error: "No active session" });
        return;
      }

      const appUrl = getAppUrl(session.dashboardUrl);

      try {
        const instructions = buildInstructions(session.mappings);
        const response = await fetch(`${appUrl}/api/sites/${session.siteId}/adapter`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ instructions, taught_by: "user" }),
        });

        const data = await response.json();

        if (response.ok) {
          // Clear session
          teachingSession = null;
          chrome.storage.session.remove("teachingSession");
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: data.error });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true;
  }

  if (message.type === "GET_FIELD_VALUE") {
    // Content script wants the value for a given field key (to fill the field live)
    chrome.storage.session.get("teachingSession", (result) => {
      const session = result.teachingSession;
      if (!session) { sendResponse({ value: "" }); return; }

      const value = session.businessFields?.[message.field_key] ?? "";
      sendResponse({ value });
    });
    return true;
  }
});

// ============================================================
// Helpers
// ============================================================

function buildInstructions(mappings) {
  return {
    steps: [
      { type: "navigate", description: "Go to signup page" },
      ...mappings.map((m) => ({
        type: "fill",
        selector: m.selector,
        field_key: m.field_key,
        description: `Fill ${m.label}`,
      })),
      {
        type: "click",
        selector: 'button[type="submit"], input[type="submit"], button:contains("Register"), button:contains("Sign Up")',
        description: "Submit the form",
      },
    ],
    field_mappings: mappings.map((m) => ({
      field_key: m.field_key,
      selector: m.selector,
    })),
  };
}

function getAppUrl(dashboardUrl) {
  if (!dashboardUrl) return "http://localhost:3000";
  try {
    const url = new URL(dashboardUrl);
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}
