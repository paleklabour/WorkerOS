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
   (Edge Function secrets). **GitHub Pages serves branch `supabase-migration`,
   not `main`** — every push to `origin/supabase-migration` goes live within
   ~20s. `main` is an unrelated older history (the July Apps Script version),
   don't merge into it.

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

Every file-attachment point in the app (worker docs, customer docs, expense and payment
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

Exception (owner's request 2026-10-08): job-close documents (`job-close-doc`,
`submitCloseJob` / `addJobCloseDocs`) are attach-only — no AI read, no
auto-filing into the worker folder. Same for the "เอกสารอื่นๆ" slots
(`worker-other` / `cust-other`, owner's request 2026-10-08): attach only, no AI
classify/move. Worker docs: AI reads only work permit / passport / pink card /
receipt (`OCR_DOC_TYPES` in `supabase-client.js`, 2026-10-08) — Myanmar ID,
visa, insurance are attach-only. Customer docs, slips, job appointments and
bulk-import classification (`worker-auto`) still use AI.

Bulk import (2026-10-08): pick the employer first (matching is limited to that
employer's workers), files are matched by file name *and* folder path
(`<uid>_<TITLE>_<NAME>_EXP_...` worker folders, `OLD/` folders skipped), the
office's file-name abbreviations map to doc types (`WORKER_DOC_TYPES`), and
unmatched files do **not** create new workers unless "สร้างคนงานใหม่จากไฟล์ที่
จับคู่ไม่ได้" is ticked (owner's request).

Owner's rules (2026-10-09):
- Section 1.3 of the worker form (pink card no / Thai name / insurance no) is filled
  only from a THAI pink card (Thai script, บัตรประจำตัวคนซึ่งไม่มีสัญชาติไทย). A Myanmar
  national ID is also pink but in Burmese script: attach only (`enforcePinkCardRule` in
  ocr-document drops 1.3 fields when `scriptLanguage` is burmese). Section 1.3 is filled
  **only** from a pink card read; nothing else (WP, receipt, e-WorkPermit QR, insurance
  doc) writes those fields, and the pink card writes nothing outside 1.3. Not found = leave blank.
- Bulk import has a per-file "AI อ่าน" checkbox (`row.aiRead`, default from
  `bulkAiDefault()`); unticked = attach only (`attachDocumentToWorker(..., { noAi: true })`).
- Worker document file names are the office abbreviation only (owner, 2026-10-09):
  WP / WP_FB / CI / PASSPORT / VISA / PinkCard / REC / REC1900 / WP22 / AP / REQ / NTID /
  MED / INS / INF / OTHER, plus _2, _3 for duplicates in a slot (`workerDocCode`,
  `uniqueWorkerDocName`). The original file name is the hint for the finer code.
- OCR may only set `workerUid` if it is exactly 13 digits.
- `uploadFile` in `supabase-client.js` sniffs the real file type from the bytes
  (`sniffFileMime`) — Drive had JPEGs named `.pdf` that wouldn't open.
- Every new worker, whatever the path, shows "รอแจ้งเข้า" until it's verified in
  e-WorkPermit (the e-WorkPermit paste import sets `skipNotifyEntry` when the row says
  "Already Informed"/"แจ้งเข้าแล้ว"), an Admin clicks "ผ่าน", or the worker has a job
  with status "ปิดงานแล้ว" (rule from 2026-10-08, the owner confirmed keeping it). Don't
  auto-clear it anywhere else (the pending_register→active transition used to).
- No-AI reading of government PDFs (owner, 2026-10-13 — Gemini prepaid credits ran out; owner
  declined the free-AI option): `callOcr` in `supabase-client.js` first runs `parseGovPdf` —
  pdf.js text + regex, no AI, no cost. Learned formats: DOE receipt (ใบเสร็จรับเงิน
  กรมการจัดหางาน → name, RA/uid, receipt/bill no, amount, email, paid date) and
  "ทะเบียนใบอนุญาตทำงานของคนต่างด้าว" in 3 layouts — label:value (มติ 2565 `WP-RN-65`/`ET-67`,
  มติ 2568 `bt_*.pdf`) and the e-WorkPermit printout whose labels and values are separated
  (`parseWpRegisterValueBlock`, fixed ":"-separated value order, odd Thai glyph encoding).
  A hit skips Gemini entirely; the e-WorkPermit QR lookup (`ewp-qrcheck`) still merges on top.
  Scans/photos still need AI or manual entry. When AI can't read, fill the worker from the
  non-expired WP (owner rule).
- Upload wait UI (owner chose iOS style #1, 2026-10-13): `uploadDocumentFile` overlays the
  attach box/tile/button the user used (`beginUploadUi`, host found from the last
  change/drop/paste/click) with an iOS spinner + stage text ("AI กำลังอ่านเอกสาร…" →
  "กำลังอัปโหลด…", from `options.onStage` in `uploadFile`), then a green tick "แนบแล้ว".
  Upload messages (progress when no host, results, AI-rejected, failures, avatar
  uploads) use a centered frosted capsule `showUploadPill(kind, title, sub)` (owner chose
  style #3, placed mid-screen) instead of `showToast`.
- Document folders have an image editor (`openImageEditor`: crop / rotate 90° + fine angle / brightness /
  contrast), images only, saving replaces the original (no copy kept).

## Search-to-select fields (standing rule)

Any input where the user searches to pick **one existing record** (employer,
worker, agent, etc.) from a set that can grow long must use the
`registerSearchSelect()` combobox in `app.js` — a dropdown of matches that
appears while typing (reuses the `.search-box` / `.search-suggest-dropdown`
CSS already used by the plain-text search boxes' `registerSearchSuggest()`),
never a free-text field or a long `<select>` you have to scroll. Register new
instances inside `setupAllSearchSelects()` (called once from `initApp()`).

If the field already has a real `<select>` that other code reads/writes
`.value` on (validation, an existing `onchange`), keep that `<select>` as the
hidden source of truth (`class="hidden"`, drop `required` — add/keep an
explicit check in the save function instead, e.g. `saveJob`/`saveWorker`) and
point `getValue`/`setValue` at it, so nothing else has to change. See
`job-customer-id` / `worker-employer-id` for that pattern, and
`invoice-free-cust-search` / `invoice-free-worker-search` (Quick Invoice) for
one backed by a plain JS variable instead of a `<select>`.

Don't use this pattern for:
- A small fixed set of options (status, nationality, gender) — keep a plain
  `<select>`.
- Picking **multiple** records at once where the user needs to see everything
  already picked while still browsing more — use the checklist pattern
  instead (search input + always-visible checkbox list + removable chips),
  see `job-worker-search`/`job-worker-checklist` (picking workers for a job).

## Money-in model: receipts vs payments

`receipts` = one actual money-in (one transfer/cash amount, one slip set, one
`RC-` number). `payments` = how that money is applied to invoices
(`payments.receipt_id`). Whatever isn't applied yet is the customer's deposit
or credit (`customerCredit()`), and it can be applied to later invoices
(`applyCustomerCredit`). Bank and cash balances count money-in
(`moneyInEntries()`), while revenue and invoice status count `payments`. Old
`payments` rows with no `receipt_id` are their own money-in and carry their own
`receipt_no`. The bank printed on an invoice is only a suggestion to the
customer; the real account is the one picked when recording the money. Schema:
`supabase/migrations/20261002032303_receipts_and_customer_credit.sql`.

Billing note (`customers.billing_note`, staff-only, never printed): besides the customer
form, finance and ops roles add/edit it right in the invoice and combine-bills screens
(`renderBillingNoteBox` → `set_customer_billing_note()` RPC, owner 2026-10-13) — needed
because Account Managers are read-only on customers.

## Roles & permissions (standing rule, confirmed 2026-10-02)

`admin` = Admin/GM (everything), `account_manager` (billing, payments,
deposits, voiding receipts, expenses, banks, standard prices/costs, agent
commissions; read-only on customers/workers/jobs), `operation_manager`
(customers, workers, documents, jobs, assigning jobs; no finance, no
commissions), `staff` (customers/workers/docs, opens jobs, edits only jobs
they opened or are assigned to via `jobs.assigned_to`), `client`. Front end:
change permissions only in `PERMS` in `app.js` and check with `can('…')` /
`canEditJob(j)` — static HTML controls get `needs-<perm>` classes, hidden by
`body.perm-no-<perm>`. The database enforces the same rules with RLS helpers
`is_internal()` / `can_finance()` / `can_ops()` (migration
`20261002042034_roles_gm_am_om_staff.sql`) — update both sides together.
The bell is per role (`buildNotificationGroups`); missing worker documents
must not alert anyone.

User photos (2026-10-13): `profiles.avatar_url`. Admin sets anyone's photo in the user
form (saved via `updateUserProfile`); every user changes their own by clicking their
avatar in the sidebar (`changeMyAvatar` → `set_my_avatar()` RPC, own row only). Images
are center-cropped to 256px JPEG before upload to Storage `avatars/<userId>/`.
Render with `userAvatarHtml(u)` (falls back to the name's first letter). The profile
card sits at the bottom of the sidebar, above the logout button.

Single session per account (owner, 2026-10-13): logging in calls `claimSingleSession()`
(random id in localStorage `mw_session_id` → `claim_session()` RPC +
`signOut({scope:'others'})`); open pages poll `my_active_session()` every 20 s and on
tab focus (`startSessionGuard` / `checkSingleSession`) and log out if another device
claimed it later. Tabs in the same browser share the id.

Collapsible headers fold with an animation (height + opacity, `setCollapsed(h, on, true)` on click;
restored/auto-expanded states skip it). Pie toggles also on: completed jobs by type
(`donetypes`), employer provinces (`custprov`), receivables aging (`aging`), revenue vs
gov fees (`govsplit`).

"ปฏิทินของฉัน" (2026-10-13): calendar icon in the top bar (`topbar-calendar-btn`, hidden for clients) opens view `calendar`, personal day notes for internal users
only (one per day, ≤ 200 chars), table `calendar_notes` with own-row + `is_internal()`
RLS, loaded on opening the page (`openCalendarView`), not part of `loadData`.

"View as user" (Admin, 2026-10-13): eye button in the users table → `startViewAs(id)`
swaps `currentUser` id/role/customer_id in memory so menus, buttons, home page and
bell follow that user; data stays admin-loaded (not exact) and `callCloudAPI` /
uploads refuse writes while `isViewingAs()`. Not persisted (`currentUser.toJSON`
returns the real account), amber bar "กลับเป็น Admin" → `stopViewAs()`.

## Themes: light / pink / dark (standing rule)

The moon button in the top bar opens a theme menu (`setTheme()`): light (default),
`pink` or `dark` on `<html data-theme>`, saved per account in `profiles.theme` (via `set_my_theme()` RPC; localStorage `mw_theme` only avoids a flash before login). When adding CSS, don't hard-code light-only colors.
Use existing variables (`--gray-card`, `--text-dark`, …), or write
`var(--dk-card, #ffffff)` / `--dk-subtle` / `--dk-line` / `--dk-head` /
`--dk-muted` / `--dk-ok|bad|warn(-bg)`. Light mode leaves `--dk-*` undefined,
so it uses the fallback; pink and dark define them at the end of `styles.css`.
Printed sheets (`.invoice-sheet`, `.delivery-label-sheet`) always stay
white-paper.

## iOS look & widget boards (standing rule, 2026-10)

The UI follows iOS (owner's request): SF Pro/Sukhumvit fonts, light theme
"Layered" (grouped gray bg, two-layer shadows), floating sidebar, tab groups
with a sliding thumb (`attachTabSlider`), every `<select>` opens an iOS menu on
mouse devices (`openIosSelect` — the native `<select>` still holds the value),
charts animate via `setupChartMagicMove` ("magic move": every pie/bar regrows from 0 each time it comes into view — tab/page switch or scroll — and flows old→new on re-render; owner 2026-10-13). Keep new UI consistent with that.
Smallest UI font is 11.5px; don't add smaller sizes (printed sheets excepted).

Table action columns (owner, 2026-10-13): on mouse devices the "จัดการ" column
(`th`/`td.actions-col` in a `.data-table`) is removed from the layout and the row's
buttons float over the row's right edge on hover, Gmail-style (pinned to the visible
edge of a horizontally scrolled table via `setupRowActionsOverlay`). Not applied in the
client portal or `.prices-table`; touch devices keep the normal column. A new table's
action column just needs `class="actions-col"` on both the `th` and the `td`. Wide
tables get a floating bottom scrollbar (`setupFloatingHScroll`).

Button descriptions (tooltips) — standing rule (2026-10-08): every button's
description is a plain `title="..."` attribute; `setupIosTooltips()` in `app.js`
turns every `[title]` (including ones `app.js` renders later) into the iOS
tooltip (`.ios-tooltip`). Don't build another tooltip system or a custom one per
button (it also strips ancestor `title`s and SVG `<title>`s while showing, so the browser's own
black tooltip never appears alongside it). Icon-only buttons (✕, edit, delete, download …) must have a `title`.
Wording pattern: verb + what it acts on, short — "ลบคนงาน", "แก้ไขใบงาน",
"ดาวน์โหลดไฟล์", "ปิดหน้าต่าง" — not a bare "ลบ" / "แก้ไข".

Table/pie toggles (`toggleChartView`) remember the last choice per section (localStorage
`mw_chart_view_<prefix>`, default pie), and the pie button
comes first (owner, 2026-10-13) — add new prefixes to `CHART_FIRST_PREFIXES`. The
finance "สัดส่วนความคืบหน้าและการชำระเงิน" panel is two pies (`renderPieChartInto`).

Dashboard overview, finance overview, completed-jobs and jobs-summary cards sit
in a 12-column widget grid with a fixed order/size from `WIDGET_BOARDS` in
`app.js`. The "แก้ไขหน้า" (reorder/resize per account) feature was removed at
the owner's request (2026-10-12); `profiles.ui_layout` / `set_my_ui_layout()`
still exist in the DB but the app no longer reads or writes them. A new
card/panel on those pages must be registered in `WIDGET_BOARDS` (id, kind
`pill`/`block`, size) or it won't be part of the grid.

## Large-file shrink tool (2026-10-13)

Backup page (Admin) → "ไฟล์ขนาดใหญ่ผิดปกติ": `admin_large_files(min_bytes)` RPC lists Storage
objects over a threshold (default over 5 MB — owner: up to 5 MB is fine) with `backed_up` (has a Drive copy). "ย่อ" re-renders
PDFs at ~150 dpi JPEG via pdf.js + pdf-lib (`shrinkPdfBlob`) or downsizes images
(`shrinkImageBlob`) in the browser and overwrites the same Storage path
(`replaceStorageFile`, links unchanged). Only for files already backed up to Drive
(drive-backup never re-uploads changed content, so the Drive copy stays the original),
and only kept if ≥ 20% smaller. Free plan Storage is 1 GB — was 1.42 GB on 2026-10-13.
New uploads shrink automatically too: `uploadDocumentFile` runs `autoShrinkDataUrl` first
(PDF or image over 5 MB, kept only if ≥ 20% smaller) before AI read and upload.

## Google Drive backup (2026-10-08)

`supabase/functions/drive-backup` copies Storage files + a daily JSON of all
tables one-way into the owner's personal Gmail Drive (`WorkerOS Backup/นายจ้าง/
<company (tax id)>/คนงาน/<uid_name>/` — files are not split by doc type; worker and
job-close files keep the same file name as in the app (`WP.pdf`, `PinkCard_2.jpg`,
" (หมดอายุ)" added when expired), so renaming in the app renames in Drive (owner, 2026-10-12); `การเงิน/` slips by month; `ข้อมูลระบบ/` 30 days; files
removed from WorkerOS move to `ถูกลบ/`). Supabase stays the source of truth.
Admin sees "เปิดใน Google Drive" buttons in the worker/customer folder (folder button in the
footer, plus a "Drive" button in the preview bar) once that item has been backed up — matched by
Storage path via `getDriveBackupIndex` / `driveFileLink` (2026-10-12). The preview-bar "Drive" button
opens the whole worker/employer Drive folder, not the single file (owner, 2026-10-13;
`driveFolderButtonHtml`, falls back to the file link only if the folder isn't tracked).
Incremental, tracked in `drive_backup_files` / `drive_backup_folders`, runs hourly
via pg_cron (`20261008090100_drive_backup_cron.sql`, apply only after the function
and its secrets exist). Customer folders are shared read-only to `customers.email`
when `customers.drive_share` is ticked. Needs secrets GOOGLE_CLIENT_ID /
GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN (scope `drive.file`, OAuth app
published "In production" or the refresh token expires after 7 days) and
DRIVE_BACKUP_CRON_SECRET (same value in Vault `drive_backup_cron_secret`).

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

## Inactive employers (2026-10-05)

Admin can deactivate an employer (`customers.status` = `active`/`inactive`,
`toggleCustomerActive`). Workers of inactive employers are moved out of the
global `workers` array into `hiddenWorkers` (`applyInactiveEmployers()`), so
every page that reads `workers` skips them automatically. Use `allWorkers()`
only where the full list is truly needed (localStorage cache, backup, the
employer's own worker counts). Call `applyInactiveEmployers()` after changing
any customer's status.

## No-charge jobs (2026-10-06)

A job the company deliberately doesn't bill gets `payment_status` =
`ไม่เรียกเก็บเงิน` plus `no_charge_reason/by/at` (no 0-baht invoice). Only
Admin/Account Manager can set or undo it (`markJobNoCharge` /
`unmarkJobNoCharge`; DB trigger `guard_job_no_charge`). Use
`jobAwaitingBill(j)` — not `!getJobInvoice(j)` — anywhere you mean "still
needs a bill". No-charge jobs carry no agent commission.

## Cache-busting on deploy (2026-10-06)

GitHub Pages serves everything with `Cache-Control: max-age=600`, so after a
push browsers can keep the old `app.js`/`styles.css` for ~10 minutes (and mix
them with a newer `index.html`). `index.html` loads them as
`styles.css?v=…` / `supabase-client.js?v=…` / `app.js?v=…` — bump that `v`
value (all three together) in any commit that changes those files.

## Voided invoices (2026-10-06)

Voided invoices are hidden everywhere (billing "all", CSV export, reports,
portal); only Admin sees them via the "บิลที่ยกเลิก" filter. Owner's policy:
keep voided invoices as evidence — `deleteVoidInvoice` (Admin) is only for
invoices issued by mistake; `restoreVoidInvoice` (Admin) un-voids one voided by
mistake after checking none of its jobs were re-billed or set no-charge.
Document numbers (`next_doc_no`) only count up and
are never reused, so a deleted invoice leaves a gap.
