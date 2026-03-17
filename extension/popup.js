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
  backlink_anchor: "Backlink Anchor",
};

// Load session state
chrome.storage.session.get("teachingSession", (result) => {
  const session = result.teachingSession;
  renderState(session);
});

function renderState(session) {
  const statusCard = document.getElementById("status-card");
  const statusLabel = document.getElementById("status-label");
  const statusText = document.getElementById("status-text");
  const mappingsList = document.getElementById("mappings-list");
  const actions = document.getElementById("actions");

  if (!session || !session.active) {
    statusCard.className = "status-card inactive";
    statusLabel.className = "status-label inactive";
    statusLabel.textContent = "No Active Session";
    statusText.textContent =
      "No teaching session is running. Start one from the CitationBot dashboard.";
    mappingsList.style.display = "none";
    actions.innerHTML = `
      <a class="btn btn-primary" href="#" id="go-dashboard">
        Open Dashboard
      </a>
    `;
    document.getElementById("go-dashboard")?.addEventListener("click", openDashboard);
    return;
  }

  // Active session
  statusCard.className = "status-card active";
  statusLabel.className = "status-label active";
  statusLabel.textContent = "Teaching Session Active";
  statusText.textContent = `Teaching: ${session.siteName}`;

  const mappings = session.mappings ?? [];
  if (mappings.length > 0) {
    mappingsList.style.display = "block";
    mappingsList.innerHTML = mappings
      .map(
        (m) => `
      <div class="mapping-row">
        <span class="mapping-check">✓</span>
        <span class="mapping-label">${FIELD_LABELS[m.field_key] ?? m.field_key}</span>
      </div>
    `
      )
      .join("");
  } else {
    mappingsList.style.display = "none";
  }

  actions.innerHTML = `
    <button class="btn btn-danger" id="end-session">End Session</button>
  `;

  document.getElementById("end-session")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "END_TEACHING_SESSION" }, () => {
      renderState(null);
    });
  });
}

function openDashboard() {
  chrome.tabs.create({ url: "http://localhost:3000" });
}

document.getElementById("open-dashboard")?.addEventListener("click", openDashboard);
