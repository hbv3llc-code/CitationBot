# CitationBot Setup Guide

## Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google Cloud Console](https://console.cloud.google.com) project with Gmail API enabled
- An [Anthropic API key](https://console.anthropic.com)

---

## 1. Install dependencies

```bash
npm install
npx playwright install chromium
```

---

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in every value in `.env.local`:

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role) |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000/api/auth/google/callback` |
| `ENCRYPTION_KEY` | Generate: `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` (dev) |

---

## 3. Set up Supabase database

Run both migrations in the Supabase SQL editor:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_worker_helpers.sql`

Or with the Supabase CLI:
```bash
supabase link --project-ref your-project-ref
supabase db push
```

---

## 4. Enable Supabase Realtime

In Supabase Dashboard → Database → Replication, enable Realtime for:
- `bulk_runs`
- `bulk_run_results`

This powers the live progress bar on bulk run pages.

---

## 5. Set up Google OAuth

In Google Cloud Console:
1. Create an OAuth 2.0 Client ID (Web application)
2. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
3. Enable the **Gmail API** in APIs & Services → Library
4. Set the OAuth consent screen scopes: `gmail.readonly`

---

## 6. Run the app

**Development:**
```bash
npm run dev
```

**Worker** (in a separate terminal):
```bash
npm run worker
```

The worker processes bulk run jobs and scheduled monitoring checks. It polls the
database every 5 seconds (configurable via `WORKER_POLL_INTERVAL_MS`).

---

## 7. Install the Chrome Extension (for Teaching Mode)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Copy the extension ID shown in Chrome
5. Add it to `.env.local`: `NEXT_PUBLIC_CHROME_EXTENSION_ID=your-id`

---

## First use walkthrough

1. Create an account at `http://localhost:3000/signup`
2. Add your first business (Businesses → Add Business)
3. Connect Gmail (from the business detail page)
4. Generate AI descriptions and approve your favourites
5. Add citation sites (Sites → Add Site) or import via CSV on a Bulk Run
6. For each site, run a Teaching Session to create its adapter
7. Start a Bulk Run (Runs → New Run) — upload a CSV of sites

---

## Security notes

- All account passwords are unique per site and AES-256 encrypted
- Gmail OAuth is read-only — CitationBot cannot send, delete or modify emails
- Passwords are never written to Google Sheets
- The `ENCRYPTION_KEY` must be kept secret — losing it means existing encrypted passwords are unreadable
