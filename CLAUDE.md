# WorkerOS

Migrant worker (Myanmar/Laos/Cambodia) management system: customer/employer
records, worker records, document OCR, Kanban job tracking, combined
invoicing. Thai-language UI and code comments throughout.

## Stack

Vanilla HTML/CSS/JS SPA, no build step, no package manager.

- `index.html` — page structure/modals
- `styles.css` — all styling (CSS variables for theming; avoid inline styles)
- `app.js` — all client logic, state, API calls
- `server.ps1` — local dev server (`http://localhost:3000`), also proxies
  file uploads to a local `uploads/` folder to avoid localStorage quota limits
- `bundle-gas.ps1` — bundles the local files into `apps-script/` for
  copy-pasting into the Google Apps Script editor

## Two backends (transitional state)

1. **Google Apps Script + Sheets** (`Code.gs`, `apps-script/`) — the original,
   currently-live backend. Data lives in a Google Sheet with tabs: Users,
   Customers, Workers, Jobs, Banks, Line_Groups, Line_Logs. Also handles
   Gemini OCR and LINE OA webhook/notifications. See `SETUP_INSTRUCTIONS.md`.
2. **Supabase** (`schema.sql`, `supabase-client.js`, `supabase/functions/`) —
   in-progress migration target. Postgres schema + two Deno Edge Functions
   (`create-user`, `ocr-document`). See `DEPLOY_SUPABASE.md` for what's
   still unfinished: no LINE webhook equivalent yet, connection-test/settings
   UI still assumes the old GAS backend in places, and it hasn't been
   exercised against a real Supabase project yet.

`window.SUPABASE_URL` / `window.SUPABASE_ANON_KEY` in `index.html` hold a
real project's publishable (anon) key — safe for client exposure by design,
but never put a `service_role` key or the Gemini key in frontend code; those
belong in Apps Script Script Properties or `supabase secrets`, never in
`app.js`/`index.html`.

## Business rule worth knowing

"1 job type = 1 job ticket": selecting multiple job types when filing work
creates one independent job per type, linked by `batchId`. A worker cannot
have two open jobs of the same type simultaneously (open = status in
`รอดำเนินการ` / `กำลังดำเนินการ` / `รอเอกสารเพิ่มเติม`) — see
`JOB_OPEN_STATUSES`/`findOpenJobConflict` in `app.js`.

## Running locally

```powershell
.\server.ps1
```
Serves the current directory at http://localhost:3000 (no hot reload needed —
caching is disabled; just refresh the browser after editing).

## Provenance

Imported 2026-08-17 from an Antigravity-generated export
(`WorkerOS-updated.zip`, which supersedes an earlier `WorkerOS-supabase.zip`
snapshot). No prior git history existed.
