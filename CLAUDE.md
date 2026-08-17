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
- `supabase/migrations/` — versioned Postgres schema, apply with `supabase db push`
- `supabase/functions/` — Deno Edge Functions (`create-user`, `ocr-document`)
- `legacy/` — the old Google Apps Script backend, kept only until the
  Supabase migration is verified end-to-end. See `legacy/README.md` and
  `DEVELOPMENT.md` before touching anything in there.

## Two backends (transitional state)

1. **Google Apps Script + Sheets** (`legacy/Code.gs`, `legacy/apps-script/`) —
   the original backend. The production URL in `README.md` still points at a
   deployment of this code. Data lives in a Google Sheet with tabs: Users,
   Customers, Workers, Jobs, Banks, Line_Groups, Line_Logs. Also handles
   Gemini OCR and LINE OA webhook/notifications. See `legacy/SETUP_INSTRUCTIONS.md`.
2. **Supabase** (`supabase/migrations/`, `supabase-client.js`, `supabase/functions/`) —
   in-progress migration target, and where all new work happens. Postgres
   schema + two Deno Edge Functions (`create-user`, `ocr-document`). See
   `DEPLOY_SUPABASE.md` for what's still unfinished: no LINE webhook
   equivalent yet, connection-test/settings UI still assumes the old GAS
   backend in places (dead code — see below), and it hasn't been exercised
   against the real Supabase project yet.

`index.html` already has `window.SUPABASE_URL` / `window.SUPABASE_ANON_KEY`
pointed at the real project, so opening the app via `server.ps1` right now
talks to Supabase, not Google Sheets — and Supabase is still empty, so login
will fail until migrations + data + auth users are in place (see
`DEPLOY_SUPABASE.md`).

`app.js` also still contains `syncRowToGoogleSheets` / `testGoogleSheetsConnection`
/ `syncAllToGoogleSheets` (the "Google Sheets Cloud Sync" section on the
backup page) — this is dead code left over from before the Supabase
migration; `getApiUrl()` now always returns `window.SUPABASE_URL`, so these
buttons don't do anything useful anymore. Safe to delete when convenient.

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

## Workflow

See `DEVELOPMENT.md` for branching convention, how to add a schema migration,
and how deploys work (GitHub Pages for the frontend, `supabase db push` /
`supabase functions deploy` for the backend).

## Provenance

Imported 2026-08-17 from an Antigravity-generated export
(`WorkerOS-updated.zip`, which supersedes an earlier `WorkerOS-supabase.zip`
snapshot). No prior git history existed. Restructured 2026-08-17 to version
schema via `supabase/migrations/` and isolate the legacy GAS backend under
`legacy/`, ahead of setting up GitHub + GitHub Pages.
