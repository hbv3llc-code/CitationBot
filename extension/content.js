/**
 * CitationBot Chrome Extension — Content Script
 *
 * Injected into every page. When a teaching session is active for the current
 * page, it activates the teaching overlay that helps the user identify and
 * confirm form field mappings.
 */

(function () {
  "use strict";

  // Signal to the dashboard that extension is installed
  window.__CITATIONBOT_EXTENSION_INSTALLED = true;

  let session = null;
  let overlay = null;
  let highlightedElement = null;
  let pendingFieldKey = null;

  const FIELD_LABELS = {
    name: "Business Name",
    owner_name: "Owner Name",
    address_street: "Street Address",
    address_city: "City",
    address_state: "State",
    address_zip: "ZIP Code",
    phone: "Phone Number",
    email: "Email Address",
    website: "Website URL",
    founding_year: "Year Founded",
    description: "Business Description",
    backlink_url: "Backlink URL",
    backlink_anchor: "Backlink Anchor Text",
  };

  // Check for active session when page loads
  chrome.runtime.sendMessage({ type: "GET_TEACHING_SESSION" }, (response) => {
    if (response?.session?.active) {
      session = response.session;
      activateTeachingMode();
    }
  });

  function activateTeachingMode() {
    createOverlay();
    attachHoverListeners();
    showNextFieldPrompt();
  }

  // ============================================================
  // OVERLAY UI
  // ============================================================

  function createOverlay() {
    overlay = document.createElement("div");
    overlay.id = "__citationbot_overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      width: 320px;
      background: #fff;
      border: 2px solid #0ea5e9;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
    `;

    overlay.innerHTML = `
      <div style="padding: 14px 16px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between;">
        <div style="font-weight: 700; color: #0284c7; font-size: 14px;">🤖 CitationBot</div>
        <div style="font-size: 11px; color: #6b7280; font-weight: 500;">Teaching Mode</div>
      </div>

      <div id="__cb_content" style="padding: 14px 16px;">
        <p id="__cb_instruction" style="color: #374151; margin: 0 0 12px; line-height: 1.5;"></p>
        <div id="__cb_field_select" style="display: none; margin-bottom: 12px;">
          <label style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Field Type</label>
          <select id="__cb_field_key" style="width: 100%; padding: 7px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; color: #111827;">
            <option value="">Select field...</option>
            ${Object.entries(FIELD_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}
          </select>
        </div>
        <div id="__cb_preview" style="display: none; margin-bottom: 12px; padding: 8px 10px; background: #f0f9ff; border-radius: 6px; border: 1px solid #bae6fd;">
          <p style="margin: 0; font-size: 11px; font-weight: 600; color: #0284c7; margin-bottom: 3px;">Will fill with:</p>
          <p id="__cb_preview_value" style="margin: 0; color: #0c4a6e; font-family: monospace; font-size: 12px; word-break: break-all;"></p>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="__cb_confirm" style="display: none; padding: 7px 14px; background: #0ea5e9; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
            Confirm Mapping
          </button>
          <button id="__cb_skip" style="display: none; padding: 7px 14px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-size: 12px;">
            Skip Field
          </button>
          <button id="__cb_save" style="display: none; padding: 7px 14px; background: #16a34a; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
            Save & Finish
          </button>
        </div>
      </div>

      <div id="__cb_mapped" style="padding: 0 16px 12px; display: none;">
        <p style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Mapped Fields</p>
        <div id="__cb_mapped_list" style="space-y: 4px;"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Button handlers
    document.getElementById("__cb_confirm").addEventListener("click", confirmMapping);
    document.getElementById("__cb_skip").addEventListener("click", skipField);
    document.getElementById("__cb_save").addEventListener("click", saveAndFinish);

    document.getElementById("__cb_field_key").addEventListener("change", (e) => {
      const key = e.target.value;
      if (key) {
        pendingFieldKey = key;
        updatePreview(key);
      }
    });
  }

  function showNextFieldPrompt() {
    const remainingFields = Object.keys(FIELD_LABELS).filter(
      (k) => !session.mappings?.find((m) => m.field_key === k)
    );

    if (remainingFields.length === 0) {
      showSavePrompt();
      return;
    }

    const instruction = document.getElementById("__cb_instruction");
    const fieldSelect = document.getElementById("__cb_field_select");
    const confirmBtn = document.getElementById("__cb_confirm");
    const skipBtn = document.getElementById("__cb_skip");

    instruction.textContent = "Click on a form field on the page, then select what type of data it holds.";
    fieldSelect.style.display = "block";
    confirmBtn.style.display = "none";
    skipBtn.style.display = "none";

    updateMappedList();
  }

  function showSavePrompt() {
    const instruction = document.getElementById("__cb_instruction");
    const fieldSelect = document.getElementById("__cb_field_select");
    const confirmBtn = document.getElementById("__cb_confirm");
    const skipBtn = document.getElementById("__cb_skip");
    const saveBtn = document.getElementById("__cb_save");
    const preview = document.getElementById("__cb_preview");

    instruction.textContent = `All fields mapped! ${session.mappings?.length ?? 0} fields confirmed. Save to lock in this adapter.`;
    fieldSelect.style.display = "none";
    confirmBtn.style.display = "none";
    skipBtn.style.display = "none";
    saveBtn.style.display = "inline-block";
    preview.style.display = "none";

    removeElementHighlight();
    updateMappedList();
  }

  function updatePreview(fieldKey) {
    chrome.runtime.sendMessage({ type: "GET_FIELD_VALUE", field_key: fieldKey }, (response) => {
      const preview = document.getElementById("__cb_preview");
      const previewValue = document.getElementById("__cb_preview_value");
      if (response?.value) {
        preview.style.display = "block";
        previewValue.textContent = response.value;
      } else {
        preview.style.display = "none";
      }
    });
  }

  function updateMappedList() {
    const mappings = session.mappings ?? [];
    const container = document.getElementById("__cb_mapped");
    const list = document.getElementById("__cb_mapped_list");

    if (mappings.length === 0) {
      container.style.display = "none";
      return;
    }

    container.style.display = "block";
    list.innerHTML = mappings.map((m) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0; font-size: 12px;">
        <span style="color: #16a34a; font-weight: 600;">✓ ${FIELD_LABELS[m.field_key] ?? m.field_key}</span>
        <span style="color: #9ca3af; font-family: monospace; font-size: 10px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.selector}</span>
      </div>
    `).join("");
  }

  // ============================================================
  // ELEMENT INTERACTION
  // ============================================================

  function attachHoverListeners() {
    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("click", handleClick, true);
  }

  function handleMouseOver(e) {
    const el = e.target;
    if (el.closest("#__citationbot_overlay")) return;
    if (!isInteractiveField(el)) return;

    highlightElement(el);
  }

  function handleClick(e) {
    const el = e.target;
    if (el.closest("#__citationbot_overlay")) return;
    if (!isInteractiveField(el)) return;

    e.preventDefault();
    e.stopPropagation();

    highlightedElement = el;

    const confirmBtn = document.getElementById("__cb_confirm");
    const skipBtn = document.getElementById("__cb_skip");
    const fieldSelect = document.getElementById("__cb_field_select");

    confirmBtn.style.display = pendingFieldKey ? "inline-block" : "none";
    skipBtn.style.display = "inline-block";
    fieldSelect.style.display = "block";

    const instruction = document.getElementById("__cb_instruction");
    instruction.textContent = `Selected: ${getElementDescription(el)}. Choose the field type and confirm.`;
  }

  function isInteractiveField(el) {
    const tag = el.tagName.toLowerCase();
    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      el.getAttribute("contenteditable") === "true"
    );
  }

  function getElementDescription(el) {
    return (
      el.name ||
      el.id ||
      el.getAttribute("placeholder") ||
      el.getAttribute("aria-label") ||
      el.tagName.toLowerCase()
    );
  }

  function highlightElement(el) {
    removeElementHighlight();
    el.__cb_originalOutline = el.style.outline;
    el.style.outline = "2px solid #0ea5e9";
    el.style.outlineOffset = "2px";
  }

  function removeElementHighlight() {
    if (highlightedElement) {
      highlightedElement.style.outline = highlightedElement.__cb_originalOutline ?? "";
      highlightedElement.style.outlineOffset = "";
    }
  }

  function getSelector(el) {
    // Try to build a reliable CSS selector
    if (el.id) return `#${CSS.escape(el.id)}`;
    if (el.name) return `${el.tagName.toLowerCase()}[name="${el.name}"]`;
    if (el.getAttribute("data-testid")) return `[data-testid="${el.getAttribute("data-testid")}"]`;

    // Build path-based selector
    const parts = [];
    let current = el;
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.className) {
        const classes = Array.from(current.classList)
          .filter((c) => !c.match(/^(hover|focus|active|disabled)/))
          .slice(0, 2);
        if (classes.length > 0) selector += "." + classes.join(".");
      }
      parts.unshift(selector);
      current = current.parentElement;
      if (parts.length >= 4) break;
    }
    return parts.join(" > ");
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  function confirmMapping() {
    if (!highlightedElement || !pendingFieldKey) return;

    const selector = getSelector(highlightedElement);
    const mapping = {
      field_key: pendingFieldKey,
      selector,
      label: FIELD_LABELS[pendingFieldKey] ?? pendingFieldKey,
    };

    chrome.runtime.sendMessage({ type: "FIELD_MAPPED", mapping }, (response) => {
      if (response?.mappings) {
        session.mappings = response.mappings;
      }

      // Fill the field with the real value for visual confirmation
      chrome.runtime.sendMessage({ type: "GET_FIELD_VALUE", field_key: pendingFieldKey }, (res) => {
        if (res?.value && highlightedElement) {
          highlightedElement.value = res.value;
          highlightedElement.dispatchEvent(new Event("input", { bubbles: true }));
          highlightedElement.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

      pendingFieldKey = null;
      removeElementHighlight();
      highlightedElement = null;

      // Reset field select
      document.getElementById("__cb_field_key").value = "";
      document.getElementById("__cb_preview").style.display = "none";
      document.getElementById("__cb_confirm").style.display = "none";
      document.getElementById("__cb_skip").style.display = "none";

      showNextFieldPrompt();
    });
  }

  function skipField() {
    pendingFieldKey = null;
    removeElementHighlight();
    highlightedElement = null;
    document.getElementById("__cb_field_key").value = "";
    document.getElementById("__cb_preview").style.display = "none";
    document.getElementById("__cb_confirm").style.display = "none";
    document.getElementById("__cb_skip").style.display = "none";

    const instruction = document.getElementById("__cb_instruction");
    instruction.textContent = "Field skipped. Click another form element.";
  }

  function saveAndFinish() {
    const saveBtn = document.getElementById("__cb_save");
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    chrome.runtime.sendMessage({ type: "SAVE_ADAPTER" }, (response) => {
      if (response?.success) {
        document.getElementById("__cb_instruction").textContent =
          "✅ Adapter saved! This site is now fully automated.";
        saveBtn.style.display = "none";

        // Remove teaching UI after a moment
        setTimeout(() => {
          if (overlay) {
            overlay.remove();
            overlay = null;
          }
          document.removeEventListener("mouseover", handleMouseOver, true);
          document.removeEventListener("click", handleClick, true);
        }, 3000);
      } else {
        saveBtn.textContent = "Save & Finish";
        saveBtn.disabled = false;
        document.getElementById("__cb_instruction").textContent =
          `Error: ${response?.error ?? "Failed to save"}`;
      }
    });
  }
})();
