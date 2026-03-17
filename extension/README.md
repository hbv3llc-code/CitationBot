# CitationBot Chrome Extension

This directory contains the Chrome extension for CitationBot's Teaching Mode.

## Setup (Development)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this `extension/` directory

The extension ID shown in Chrome (e.g. `abcdefghijklmnopqrstuvwxyz123456`) should be added
to your `.env.local`:

```
NEXT_PUBLIC_CHROME_EXTENSION_ID=your-extension-id-here
```

## How it Works

1. The CitationBot dashboard starts a teaching session via `chrome.runtime.sendMessage`
   using the extension's `externally_connectable` API.
2. The extension opens the citation site's signup page in a new tab.
3. The content script injects a floating overlay onto the page.
4. The user clicks each form field and selects what type of business data it holds.
5. CitationBot fills each field with real business data so the user can verify it.
6. When all fields are mapped, the user clicks **Save & Finish**.
7. The extension POSTs the adapter instructions to `/api/sites/:id/adapter`.
8. CitationBot locks the adapter — the site is now fully automated forever.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (permissions, scripts, icons) |
| `background.js` | Service worker — manages session state, handles dashboard ↔ extension messaging |
| `content.js` | Injected into all pages — teaching overlay UI, field click detection |
| `popup.html/js` | Extension popup — shows session status |

## Building for Production

Icons must be real PNG files at `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`.
The production extension ID from the Chrome Web Store must be used in manifest's
`externally_connectable` section and in the dashboard `.env`.
