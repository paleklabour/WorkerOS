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
- `supabase/functions/` — Deno Edge Functions (`create-user`, `ocr-document`). A third
  function, `line-webhook`, is deployed and ACTIVE on the live Supabase project but its
  source is *not* in this folder/repo — it was deployed from somewhere else. Pull it
  down (`supabase functions download line-webhook`) before editing it, or its logic
  only exists in the cloud.
- `legacy/` — the old Google Apps Script backend, kept only until the
  Supabase migration is verified end-to-end. See `legacy/README.md` and
  `DEVELOPMENT.md` before touching anything in there.

## Two backends (transitional state) — migration is live now

1. **Google Apps Script + Sheets** (`legacy/Code.gs`, `legacy/apps-script/`) —
   the original backend, kept only for reference. No longer what the deployed
   app talks to. See `legacy/SETUP_INSTRUCTIONS.md`.
2. **Supabase** (`supabase/migrations/`, `supabase-client.js`, `supabase/functions/`) —
   the live backend. Migrations are applied, the `worker-documents` storage
   bucket exists, all three Edge Functions are deployed and ACTIVE, `index.html`
   points at the real project, and the first admin account
   (auth user ↔ `profiles` row, role `admin`) is linked — login works. Data
   tables (`customers`/`workers`/`jobs`/`banks`/`line_groups`) are intentionally
   empty; legacy Google Sheets data was not migrated (decided 2026-08). See
   `DEPLOY_SUPABASE.md` for the full status and what's still unverified
   (which GitHub Pages branch actually deploys, Edge Function secrets).

`index.html` has `window.SUPABASE_URL` / `window.SUPABASE_ANON_KEY` pointed
at the real project, so opening the app via `server.ps1` talks to Supabase,
not Google Sheets.

The old "Google Sheets Cloud Sync" section on the Settings/backup page
(`syncRowToGoogleSheets` / `testGoogleSheetsConnection` / `syncAllToGoogleSheets`
in `app.js`, formerly "Section 3" in `index.html`) was dead code left over
from before the Supabase migration — it's been removed entirely from both
`app.js` and `index.html`, and the following section (Line Groups) was
renumbered from 4 to 3 (2026-08).

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

## AI autofill on document uploads (standing default)

Every file-attachment point in the app (worker docs, customer docs, expense
slips, job appointment docs, bulk import) should call the OCR-capable upload
path (`uploadDocumentFile` in `app.js`, which hits the `ocr-document` Edge
Function) **immediately on file select**, not deferred until after a parent
record is saved — an empty `customerId`/`workerId` at that point is fine, the
Storage path just falls back to a generic folder. Apply the parsed result to
the live form inputs right away so the user can review/correct it before
saving (see `applyGeminiDataToWorkerForm` / `applyGeminiDataToCustomerForm`),
and to the record directly when attaching via a folder view where there's no
live form to fill (see `applyOcrDataToWorker` / `applyOcrDataToCustomer`).

When adding a new document type: add it to `ALLOWED_DOC_TYPES` in
`supabase/functions/ocr-document/index.ts` with its own prompt/schema branch,
*unless* the document genuinely has no structured fields worth extracting
(e.g. a photo, or a generic "other" catch-all) — skip AI for those rather
than forcing a schema, but still wire the upload itself through the same
immediate-upload path for consistency. Don't leave a new doc type only
reachable through the deferred/no-AI pattern "temporarily" — that's how the
customer add-form and several worker/customer doc types drifted out of sync
before (fixed 2026-09-11).

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
