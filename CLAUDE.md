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
  function, `line-webhook` (LINE group bot — the LINE feature was removed from the app 2026-10-15 at the owner's
  request; the function and the empty `line_groups` table still exist in Supabase until deleted there), is deployed and ACTIVE on the live Supabase project but its
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
  Attaching files never changes an existing worker's status (owner, 2026-10-15): `attachDocumentToWorker` moves
  pending_register → active (WP + receipt) only with `opts.newWorker`, i.e. workers bulk import created in that same run
  (`createBulkNewWorkers` → `created.newIds`). Otherwise the hidden "รอแจ้งเข้า" badge popped up after a bulk attach.
  Exception (owner, 2026-10-15): workers Claude imports as the initial master-data load get `skip_notify_entry = true`
  (no badge); the rule above is for workers users key in themselves. The DB can't tell who created a worker (no
  `created_by`), so Claude sets the flag on the workers it creates as part of each import.
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
- Document folder layout (owner chose "clean" version 2026-10-15, worker + employer folders): one top row (round
  photo, name, "แชร์" menu with all link/Drive actions, ✕), tools row (tabs, search, ZIP icon), list left / preview right.
  Group heads are plain grey text with a small +; empty doc types collapse into dashed "+ type" chips at the end
  (`fvEmptyChips`); expired files fold away (`.fv-expired.is-folded`, drop target kept); expiry = colored dot + date.
  Preview bar = labelled buttons แก้ไขรูป / ตั้งเป็นรูปคนงาน / ลบ / ดาวน์โหลด / พิมพ์ + ••• (open in tab, share file)
  (`fvBarHtml` / `fvActButton` / `fvMenuItem` / `toggleFvMenu`); "ดาวน์โหลดเอกสารทุกไฟล์" is a text button.
  "เปิดใน Google Drive" lives only in the "แชร์" menu (removed from ••• as a duplicate, owner 2026-10-15); the broken
  "คัดลอกลิงก์เปิดแฟ้มนี้" (localhost link) was removed — "ลิงก์แชร์ทั้งโฟลเดอร์" is the folder link.
  Files dragged in from the computer drop onto a doc group / its + / an empty "+ type" chip (each carries
  `data-paste-target`, same as Ctrl+V); groups get a dashed outline while dragging (`fvFileDrag`, `.is-file-drag`).
  Worker folder files can be dragged onto another doc group / its + / an empty "+ type" chip to move them to that
  type (owner 2026-10-18, `moveWorkerFileToDocType`): same Storage link, renamed to the new type's code
  (`workerDocFileName` + `uniqueWorkerDocName`), no AI. Dropping elsewhere in the list still means "not expired".

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
The bell is per role (`buildNotificationGroups`); clicking a job item opens a read-only job summary pop-up
(`openJobQuickView`, iOS grouped-list style — owner picked design #3 on 2026-10-19: centered head with job no / type /
status pill, worker card (click = open worker folder), grouped rows label-left value-right (`.jq-*` in `styles.css`),
inside a `.modal-backdrop` so other windows can stack on it; buttons by permission — edit / close job / bill), other items open the
thing to act on (bill, receipt, commission payout, calendar day); clicking a group header opens that page filtered to just
that group's items (`openBellGroup` → `bellFilter`, bar "แสดงทั้งหมด" clears it; leaving the page clears it too). Dismissed
ids use `legacyAction` so earlier dismissals survive (owner 2026-10-15). Pop-ups stack: opening a window from another
keeps the first one open behind it (the newest `.modal-backdrop` is raised above the open ones, z restored on close),
and the job summary re-renders when a window opened from it closes. Don't close the parent before opening a child. missing worker documents
must not alert anyone, and neither do expiring/expired worker documents — no bell item for any role (owner, 2026-10-14).

Worker side panel + right-click menu (owner 2026-10-15, picked design #3 "แผงเลื่อนออกด้านขวา" with a dark header):
double-clicking a worker row (workers table, renewal tab, missing-docs) slides in a read-only panel from the right
(`openWorkerQuickView(id, mode, tab)`, `<aside id="worker-quick-modal" class="worker-panel">`, open = `.is-open`) — not the
edit form (that opens from "แก้ไขข้อมูล"). Double-click on any `.clickable-row` / `.kanban-card` opens on the second
mouse-down (`mousedown` with `detail === 2` runs the row's `ondblclick`; `handleRowDblClick` skips the dblclick that follows),
and the panel slides in over 0.22 s, out over 0.15 s; a click outside closes it at once, except a click on a double-clickable row (200 ms wait, cancelled by the second mouse-down) (owner 2026-10-19: wanted it faster). It is NOT a `.modal-backdrop`: the table stays usable, double-clicking another row
switches the panel, windows opened from it stack above (panel z 950 < modals 1000), it re-renders when such a window
closes, and `switchView` / Esc / ✕ / a click outside it close it. Header colour = `color-mix(var(--gold-primary) 55%, #0b1020)` so it is dark in
every theme. Tabs ข้อมูล / เอกสาร / ใบงาน (+ การเงิน for `can('finance')`). `mode 'renewal'` makes "ใบงานใหม่"
(`openNewJobForWorker`) the main button. Accounting (Account Manager = finance without ops): panel opens on the การเงิน tab
(jobs with bill status, awaiting-bill estimate `jobBillEstimate`, owing invoices, employer credit, billing note, and — owner 2026-10-19 — the worker's expenses: `expenses` linked via `job_ids` to this worker's jobs, an expense covering several jobs counts only this worker's equal share `expenseShareForJobs`, plus totals charged / cost / difference; the expenses page search also matches worker name / 13-digit id via `expenseWorkers`), personal
details are hidden, footer = ออกบิล / ออกบิลรวม / รับเงิน / เปิดแฟ้ม. Billing table rows: double-click opens the bill
(`openStoredInvoice`) or, for unbilled / no-charge jobs, the job summary. Jobs page: double-clicking a job row or Kanban card opens the job summary (`openJobQuickView`) — it used to open the worker folder.
Right-click on any element with `data-ctx="worker:<id>"` / `"job:<id>"` / `"invoice:<id>"` (worker rows, job rows, Kanban
cards, billing rows) opens `openCtxMenu` (a fixed `.fv-menu.ctx-menu`) with items from `workerCtxItems` / `jobCtxItems` /
`invoiceCtxItems`, filtered by permission (finance items: view money, issue/combine bill, receive money, no-charge, copy
bill no / balance; Admin: restore/delete void bills). Status changes go through `moveJobToStatus` (same checks as Kanban
drag). It's a shortcut only — every item also exists as a normal button. The browser's own menu stays for inputs, selected
text, touch devices and the client portal. To add right-click to another row, give it `data-ctx` and add a `kind` branch
in the `contextmenu` listener.

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

"ปฏิทินทีม" (2026-10-13, made shared 2026-10-14): calendar icon in the top bar (`topbar-calendar-btn`, hidden for clients) opens view `calendar`. Notes are
shared by all internal users (everyone sees/edits/deletes; owner's request), several per day, ≤ 200 chars,
optional time (`note_time`, empty = all day), optional multi-day range (`note_end_date`, e.g. someone on leave;
max 93 days, `calendarNoteList` = real rows, `calendarNotes` = per-day index built by `rebuildCalendarIndex`),
table `calendar_notes` with `is_internal()` RLS
(`user_id` = who wrote it, `updated_by` set by trigger — migration `20261014030000_team_calendar_notes.sql`),
loaded in the background right after `loadData` succeeds, on opening the page and on tab refocus (`loadCalendarNotes`).
Adding/editing a note is a pop-up (`#cal-note-modal`, owner 2026-10-15): double-click a day (single click only selects it and shows its notes in the side panel; double-click is counted in the pointerup handler, 400 ms), or press and drag across days for a
multi-day note (`calDrag`, pointer events on `#cal-grid`, range highlighted `.is-dragsel`), or "+ เพิ่มโน้ต" in the side
panel; the mouse wheel over the calendar changes month (accumulated delta, 260 ms lock).
The bell warns every internal user 2 days ahead (owner, 2026-10-14): group `calnote` = notes dated today / tomorrow /
the day after (counted), group `holiday` = government holidays in that window (info only).
Every bell item and group header has a ✕ to dismiss it (owner, 2026-10-14): stored per account in this browser
(localStorage `mw_bell_dismissed_<userId>`, id = group|action|text, auto-forgotten after 60 days), removed from the
badge count; "แสดงการแจ้งเตือนที่ปิดไว้ (N)" at the bottom of the panel brings them all back.
Thai government holidays are hard-coded in `THAI_HOLIDAYS` in `app.js` (from Google's Thai holiday calendar);
2027 Buddhist holidays + Royal Ploughing Day weren't announced yet on 2026-10-14 — add them when announced.

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
Kanban (jobs board): colors come from classes (`.kanban-card`, `.kc-*` in `styles.css`), no inline colors in
`renderJobsKanban`; dark theme tones it down (dim columns, solid dark cards, neutral counts, muted badges, closed-unpaid
= red left bar instead of a red card) — owner 2026-10-15 found it too glaring.
Dark theme = iOS "Liquid Glass" (owner, 2026-10-14): the block at the very end of `styles.css` makes `--gray-card` translucent
(`rgba(34,38,52,.62)`) with `backdrop-filter` on sidebar/cards/tables/modals over a fixed glow background, blue accent
`#3d7bff`, glass pills for selected items. `--dk-card` stays solid (`#1b1f2c`) for things that must hide what is behind them
(row-action overlay, popups). Light and pink themes are unchanged.
Then "calm mode" on top (owner, 2026-10-14, data-heavy screens felt busy): glass only on chrome (sidebar, modals, popups);
data cards/tables are solid `#171b26`, glow dimmed; only alerts keep color (red/orange) — dashboard info pills and
`.badge-success`/`.badge-gold` are neutral grey; secondary text (ID lines, small) muted. Keep new dark-mode UI to that rule.
Dark radii: buttons, single-line fields, selects, menu items, segmented tabs = capsules (999px); cards 22px, modals 26px, sidebar 26px.
Light theme got the same treatment (owner, 2026-10-14): block `:root:not([data-theme])` at the end of `styles.css` (light = no
`data-theme` attribute) — glass sidebar/modals over a faint glow, accent `#2d6cf6`, calm colors, capsule radii. Printed
sheets in light pin the old navy `#2d4fa3`. Light was then toned down (bg `#e7eaf0`, cards `#f8f9fb`, owner: too glaring).
Pink got the same treatment too (pink glass, accent `#d6457a`). In every theme the calm-mode grey badges exclude
`.job-type-badge` — job-type headings in the jobs table keep their strong navy/gold (owner, 2026-10-14).
Pink then softened to dusty rose (accent `#b8607f`, bg `#f3eef0`). Pie charts (owner 2026-10-15): one fixed
color set for every theme (`CHART_COLORS` in `app.js` — not theme vars; `chartColor()` maps the old semantic hexes to it) and
drawn as a tilted 3D donut (`renderPieChartInto`: side wall = the same `<circle>`s stacked 1px apart in a darker
`color-mix`, shine overlay is an `<ellipse>` so magic move only animates the circles). Login /
reset-password: no card box at all (form floats on the theme glow), 150px logo with no tile/frame (owner, 2026-10-14).
All of that lives in ONE section at the end of `styles.css` ("ระบบธีม (รวมไว้ที่เดียว …)"): per-theme variables
(`--glass-*`, `--pill-on`, `--calm-*`, `--glow-*` …) + shared rules written once, plus every per-component
`[data-theme]` rule (logos, scrollbars, inline-style overrides, print sheets…) — no `data-theme` selector anywhere else (2026-10-15). Glow is a single fixed
`body::before` layer (never `background-attachment: fixed` — it repaints on scroll); blur only on things that float over
content (modals/popups), not the sidebar. Wheel scrolling inside a popup/list never
scrolls the page behind (owner 2026-10-15): `overscroll-behavior-y: contain` only on vertically scrolling popups/lists
(last block of `styles.css`) — never on `.table-container` / `.panel-content` (that blocked page scrolling over tables) —
and the page is locked while a `.modal-backdrop` / `.ui-dialog-backdrop` is open (`html:has(...)`, `scrollbar-gutter: stable`).

## iOS look & widget boards (standing rule, 2026-10)

The UI follows iOS (owner's request): SF Pro/Sukhumvit fonts, light theme
"Layered" (grouped gray bg, two-layer shadows), floating sidebar, tab groups
with a sliding thumb (`attachTabSlider`), every `<select>` opens an iOS menu on
mouse devices (`openIosSelect` — the native `<select>` still holds the value),
charts animate via `setupChartMagicMove` ("magic move": every pie/bar regrows from 0 each time it comes into view — tab/page switch or scroll — and flows old→new on re-render; owner 2026-10-13). Keep new UI consistent with that.
Toolbars above tables (`.table-actions`): search box + filter dropdowns sit together on the left, action buttons
(`.btn-add`, `.action-buttons-group`, last `.btn`) are pushed right with `margin-left: auto` — no `space-between`
(owner 2026-10-15: dropdowns ended up far from the search box). Every search box gets a ✕ clear button (`attachSearchClear`, `SEARCH_CLEAR_SEL` — `.search-box` inputs or
placeholder containing "ค้นหา"; clicking it empties the field and fires input/change). Search fields with an inline
`oninput="render…()"` run it 0.2 s after typing stops (`SEARCH_DEBOUNCE_MS`, wrapped in `attachSearchClear`). Smallest UI font is 12.5px (raised from 11.5px on 2026-10-15, owner: many spots were too small — all 11–12.5px
screen sizes went up ~1px); don't add smaller sizes (printed sheets excepted). Document folder text/icons are larger
(names 14.5–18px, 20px icons) and file actions are labelled buttons (`fvActButton`), not hidden in •••.
Data-heavy windows use `.modal-content.large` (up to 1180px / 95vw) — but never cap `.modal-sheet` (invoice / receipt
preview stays near full screen, up to 1640px with on-screen zoom; owner 2026-10-15 wanted it back after it was squeezed to 900px), the
document folder fills 1440px / 94vh (owner 2026-10-15: windows that can be bigger should be). The date picker
(`.ios-calendar`) is a glass popup like the others. Every `<input type="date">` is shown and typed as ว/ด/ป: `proxyDate` (in
`setupIosDatePickers`) hides the native field — it still holds YYYY-MM-DD, so ids/onchange/`.value` code is unchanged —
and puts a d/m/Y text box with the calendar button in front (instance `value` setter keeps it in sync, accepts พ.ศ.,
MutationObserver covers date fields rendered later; owner 2026-10-15). Every `.data-table` sits in a `.table-container` (rounded);
the users table is sorted by role, most permissions first (`ROLE_LABELS` order).
Document expiry (work permit / passport / folder files): show the date and a status color/label only —
never a day count like "อีก N วัน" / "หมดอายุแล้ว N วัน" (owner, 2026-10-14).

Table action columns (owner, 2026-10-13): on mouse devices the "จัดการ" column
(`th`/`td.actions-col` in a `.data-table`) is removed from the layout and the row's
buttons float over the row's right edge, Gmail-style (pinned to the visible
edge of a horizontally scrolled table via `setupRowActionsOverlay`) — only when the mouse is
moved to the far right of the row where the buttons sit (`.actions-edge-hover`), not on hovering
anywhere in the row (owner, 2026-10-14). Not applied in the
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
" (หมดอายุ)" added when expired), so renaming in the app renames in Drive (owner, 2026-10-12); job-close + appointment docs go in a subfolder of the worker folder, one per job opening (same `batch_id` = one folder "ใบงาน <date opened> <types + …>", a later opening = a new folder; owner 2026-10-19); `การเงิน/` slips by month; `ข้อมูลระบบ/` 30 days; files
removed from WorkerOS move to `ถูกลบ/`). Supabase stays the source of truth.
Every internal role (Admin, Account/Operation Manager, Staff — `can('driveView')`, RLS `is_internal()`, owner 2026-10-14; not clients) sees "เปิดใน Google Drive" in the worker/customer folder's "แชร์" menu (only there — the duplicate in
the preview bar's ••• menu was removed 2026-10-15) once that folder has been backed up — it opens the whole
worker/employer Drive folder (`updateFolderDriveButton` / `driveFolderLink`).
Incremental, tracked in `drive_backup_files` / `drive_backup_folders`, runs every 3 min
via pg_cron (job `drive-backup-hourly`, `*/3 * * * *` since 2026-10-19 so job-close files reach the customer's Drive
within minutes; never closer than 3 min — a run takes ~2 min and has no lock; `20261008090100_drive_backup_cron.sql`, apply only after the function
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

Client portal worker pop-up (`openClientWorkerView`, owner 2026-10-19) adds "ประวัติงานและค่าบริการ" (`clientWorkerHistoryRows`):
that worker's jobs with date / status / billed fee + bill no + paid or owing, and totals billed / paid / owing counted per job
(not the whole combined bill). Unbilled jobs show no amount (estimates are internal); never show costs, commissions or expenses.

## Inactive employers (2026-10-05)

Admin can deactivate an employer (`customers.status` = `active`/`inactive`,
`toggleCustomerActive`). Workers of inactive employers are moved out of the
global `workers` array into `hiddenWorkers` (`applyInactiveEmployers()`), so
every page that reads `workers` skips them automatically. Use `allWorkers()`
only where the full list is truly needed (localStorage cache, backup, the
employer's own worker counts). Call `applyInactiveEmployers()` after changing
any customer's status.

Job billing columns are written only by billing code (2026-10-19): `saveJob` in `supabase-client.js` drops
`JOB_BILLING_COLS` (invoice_id, payment_status/method, paid_at/by, fee, gov_fee, commission_*, no_charge_*) when updating an
existing job unless the call passes `{ jobData, billing: true }`. Many paths save the whole job object (remark, Kanban move,
docs…), so a page holding pre-bill data used to reset a billed job to "ยังไม่ออกบิล" / fee 0 (LOR CHAN, INV-2569-0010).
Any new code that issues/edits/voids bills, receives money, sets no-charge, changes prices or pays commission must pass
`billing: true`. New jobs (insert) keep every column.

## WP renewal rounds (owner, 2026-10-20)

Renewal is separate from jobs: table `renewals` (1 row = 1 round for 1 worker, one `active` per worker; migration
`20261020062529_renewals.sql`, RLS read `is_internal()`, write `can_ops()`). The renewals page has tabs ถึงรอบ (permit ≤ 60
days or expired, no active round) / กำลังดำเนินการ / เสร็จแล้ว / ทั้งหมด (ตามกลุ่ม = the old cohort list, `renderRenewalGroups`);
`renderRenewalCases` draws the first three. Staff start rounds themselves (`startRenewals`, never automatic). Fixed steps
(`RENEWAL_STEPS`): ตรวจสุขภาพ (tick, no file) → ใบคำขอ → ใบเสร็จ (issued together but attached separately) → ใบแทน (`WP_R`) → ใบนัดหมาย (date
only, no file) → Smart card; optional ทำเล่ม (`with_book`, suggested by `renewalSuggestBook`; many workers keep their book).
Billing: starting a round creates hidden billing job(s) "ต่ออายุใบอนุญาตทำงาน" (+ "ต่อเล่ม CI/Passport") with
`batchId = 'renewal-<id>'` (`createRenewalJobs`) — they show on the billing page as awaiting bill (standard prices, deposits /
credit, agent commission, portal all unchanged) but `renderJobs` hides them (`isRenewalJob`); closing a round closes them,
cancelling deletes the unbilled ones. Their billing-page rows are teal (`.is-renewal-row` + "งานต่ออายุ" tag); the billing page and the combine-bills window have
tabs ใบงานทั่วไป / งานต่ออายุ (`billingKind` / `combineKind`) and a bill never mixes the two (owner).
UI: ถึงรอบ is grouped province → employer (`renewalGroupByProvince`, province filter `renewalProvince`, start button on the
left, fixed column widths shared by every employer table); กำลังดำเนินการ = owner-picked design A (`renewalActiveHtml`): employer
groups, one row per worker with a segmented progress bar (`renewalBarHtml`, segment click = open that step), next-step
button; ticking rows shows a floating dark bar (`.rn-selbar`) to mark ตรวจสุขภาพ / set one appointment date for all selected
(`renewalBulkStep` → `moveRenewalsToStage`; file steps one row at a time).
Client portal tab "ต่ออายุ" (`renderClientRenewalTab`, owner 2026-10-20): the employer ticks due workers (≤ 60 days) and sends a
request → the round starts at once via RPC `client_start_renewals` (creates the round + hidden billing jobs, `opened_by_client`,
`client_note`; migration `20261020072944_renewals_client_portal.sql`); staff rows show a purple "ลูกค้าเปิดงาน" tag + the note.
The employer can cancel (`client_cancel_renewal`) only before ตรวจสุขภาพ and before any bill / no-charge. Clients read only
their own rounds (RLS); renewal jobs are hidden from the portal "งานที่แจ้ง" tab. File steps go through `attachDocumentToWorker` into
the normal worker doc slots; ใบแทน / card / new passport then ask for the new expiry (`askRenewalNewExpiry`) and set it on
the worker and the file, so the old file folds into "expired" by the usual rule. Card (+ book if any) closes the round.
Still to build: old→new worker-data preview, deposit shortcut in the start dialog, bell/calendar for appointments, client portal renewal progress.

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
