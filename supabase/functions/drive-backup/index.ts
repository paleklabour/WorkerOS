// supabase/functions/drive-backup/index.ts
// สำรองไฟล์เอกสาร + ข้อมูลระบบรายวันลง Google Drive (Gmail ส่วนตัวของเจ้าของระบบ) แบบทางเดียว
// Supabase ยังเป็นที่เก็บหลักที่เดียว — ฟังก์ชันนี้แค่คัดลอกไปจัดโฟลเดอร์ใน Drive:
//
//   WorkerOS Backup/
//   ├─ นายจ้าง/<ชื่อบริษัท (เลขนิติบุคคล)>/00 เอกสารนายจ้าง/<วันที่_ประเภท_เลขนิติบุคคล>.pdf
//   │                                  └─ คนงาน/<เลข13หลัก_ชื่อ>/<ชื่อไฟล์ตามในระบบ เช่น WP.pdf, PinkCard_2.jpg>  (ไม่แยกโฟลเดอร์ประเภท)
//   │                                       └─ ใบงาน <วันที่เปิดงาน> <ประเภทงาน + …>/  (เอกสารปิดงาน + ใบนัดหมาย, 1 โฟลเดอร์ต่อการเปิดงาน 1 ครั้ง)
//   ├─ รอชำระเงิน (ลูกค้ายังไม่เห็น)/<นายจ้าง>/คนงาน/<คนงาน>/ใบงาน …/  เอกสารปิดงานของใบงานที่ยังไม่ชำระ — ไม่ได้แชร์ให้ลูกค้า
//   │     จ่ายครบ / ไม่เรียกเก็บเงิน / นายจ้างเปิดสิทธิ์ → ย้ายเข้าโฟลเดอร์คนงานในรอบถัดไป (owner 2026-10-20)
//   │     เอกสารต่ออายุในแฟ้มคนงาน (ใบคำขอ/ใบเสร็จ/ใบแทน/Smart card/เล่มใหม่) ของรอบที่ยังไม่ชำระ ก็มาอยู่ที่นี่เหมือนกัน
//   ├─ การเงิน/สลิปรับเงิน/<ปี-เดือน>/  และ  การเงิน/สลิปรายจ่าย/<ปี-เดือน>/
//   ├─ ข้อมูลระบบ/<วันที่>_ข้อมูลทั้งระบบ.json  (วันละไฟล์ เก็บ 30 วัน)
//   └─ ถูกลบ/  (ไฟล์ที่ลบออกจากระบบแล้ว ย้ายมาไว้ที่นี่ ไม่ลบทิ้ง)
//
// ทำงานแบบต่อเนื่อง: แต่ละรอบสำรองเฉพาะไฟล์ใหม่/ที่เปลี่ยน (ติดตามใน drive_backup_files) จนหมดเวลา
// (~110 วินาที) แล้วรอบถัดไปทำต่อ — pg_cron เรียกทุกชั่วโมง (migration 20261008090000_drive_backup.sql)
//
// ต้องตั้ง secrets ก่อน deploy:
//   supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... GOOGLE_REFRESH_TOKEN=... DRIVE_BACKUP_CRON_SECRET=...
// Deploy: supabase functions deploy drive-backup --no-verify-jwt
//   (ตรวจสิทธิ์เอง: x-cron-secret จาก pg_cron หรือ JWT ของผู้ใช้ role admin จากปุ่มในหน้าสำรองข้อมูล)
// scope ที่ใช้คือ drive.file — แอปเห็น/แก้ได้เฉพาะไฟล์ที่ตัวเองสร้าง ไม่แตะไฟล์อื่นใน Drive

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN") || "";
const CRON_SECRET = Deno.env.get("DRIVE_BACKUP_CRON_SECRET") || "";

const BUCKET = "worker-documents";
const TIME_BUDGET_MS = 110_000;
const DATA_KEEP_DAYS = 30;
const FOLDER_MIME = "application/vnd.google-apps.folder";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// ป้ายประเภทเอกสาร — ตรงกับ WORKER_FOLDER_DOC_TYPES / CUSTOMER_DOC_TYPES ใน app.js (ตัดวงเล็บภาษาอังกฤษออก)
const WORKER_DOC_LABELS: Record<string, string> = {
  "worker-wp-doc": "ใบอนุญาตทำงาน", "worker-passport": "พาสปอร์ต", "worker-myanmar-id": "บัตรประชาชนพม่า",
  "worker-pink-card": "บัตรชมพู", "worker-receipt": "ใบเสร็จรับเงิน", "worker-medical": "ใบรับรองแพทย์",
  "worker-insurance-doc": "ประกัน", "worker-application": "ใบคำขอ", "worker-other": "เอกสารอื่นๆ",
};
const CUSTOMER_DOC_LABELS: Record<string, string> = {
  "cust-id-card": "บัตรประชาชนนายจ้าง", "cust-cert": "หนังสือรับรองบริษัท", "cust-house": "ทะเบียนบ้านบริษัท",
  "employer-house": "ทะเบียนบ้านนายจ้าง", "cust-photos": "รูปถ่ายกิจการ", "cust-commerce": "ทะเบียนพาณิชย์",
  "cust-signature": "ลายเซ็นนายจ้าง", "cust-other": "เอกสารอื่นๆ",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

// ---------- ชื่อไฟล์/โฟลเดอร์ ----------
const clean = (s: unknown) => String(s ?? "").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
const bkkDate = (d = new Date()) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);

// path ใน Storage จาก public URL ("…/object/public/worker-documents/<path>")
function storagePath(url: unknown): string | null {
  const s = String(url || "");
  const i = s.indexOf(`/${BUCKET}/`);
  if (i === -1) return null; // data: URL เก่า / ลิงก์ภายนอก — ข้าม
  return decodeURIComponent(s.slice(i + BUCKET.length + 2).split("?")[0]);
}
// วันที่อัปโหลดจากชื่อไฟล์ใน Storage ("<เวลา ms>_ชื่อ") — ไม่มีก็ใช้ค่าที่ส่งมา
function dateFromPath(path: string, fallback = ""): string {
  const m = path.split("/").pop()!.match(/^(\d{12,14})_/);
  if (m) return bkkDate(new Date(Number(m[1])));
  return fallback ? String(fallback).slice(0, 10) : "";
}
const extOf = (path: string) => (path.split("/").pop()!.match(/\.([A-Za-z0-9]{2,5})$/) || [])[1]?.toLowerCase() || "";
const withExt = (name: string, path: string) => (extOf(path) ? `${name}.${extOf(path)}` : name);
// ชื่อไฟล์ตามที่เห็นในแฟ้มของระบบ (เช่น PinkCard.pdf, WP_2.pdf — เจ้าของระบบขอ 2026-10-12) แก้ชื่อในระบบแล้วชื่อใน Drive ตามไป
// suffix (เช่น " (หมดอายุ)") แทรกก่อนนามสกุล; ไม่มีชื่อ = "" ให้ผู้เรียกใช้ชื่อแบบเดิม
const sysFileName = (name: unknown, path: string, suffix = "") => {
  const n = clean(name);
  if (!n) return "";
  const m = n.match(/^(.*?)(\.[A-Za-z0-9]{2,5})?$/)!;
  return `${m[1]}${suffix}${m[2] || (extOf(path) ? `.${extOf(path)}` : "")}`;
};
const jobNo = (j: any) =>
  `${String(j.created_at || "").slice(0, 10).replace(/-/g, "")}-${String(j.id || "").replace(/\D/g, "").slice(-6) || "000000"}`;
const money = (n: unknown) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------- Google Drive API ----------
let accessToken = "";
async function googleToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN, grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`Google token: ${data.error_description || data.error || res.status}`);
  return data.access_token;
}
async function drive(path: string, init: RequestInit = {}, upload = false): Promise<any> {
  const base = upload ? "https://www.googleapis.com/upload/drive/v3" : "https://www.googleapis.com/drive/v3";
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init.headers || {}) },
  });
  if (res.status === 204) return null;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`Drive ${init.method || "GET"} ${path.split("?")[0]}: ${data?.error?.message || res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  return data;
}
const createFolder = (name: string, parentId?: string) =>
  drive("/files?fields=id", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, ...(parentId ? { parents: [parentId] } : {}) }),
  });
async function uploadFile(name: string, parentId: string, blob: Blob, mime: string) {
  const boundary = "wos" + crypto.randomUUID().replace(/-/g, "");
  const meta = JSON.stringify({ name, parents: [parentId] });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
    `--${boundary}\r\nContent-Type: ${mime || "application/octet-stream"}\r\n\r\n`, blob, `\r\n--${boundary}--`,
  ]);
  return drive("/files?uploadType=multipart&fields=id", {
    method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body,
  }, true);
}
// เปลี่ยนชื่อ และ/หรือ ย้ายโฟลเดอร์แม่
const patchFile = (id: string, name: string | null, addParent?: string, removeParent?: string) =>
  drive(`/files/${id}?fields=id${addParent ? `&addParents=${addParent}` : ""}${removeParent ? `&removeParents=${removeParent}` : ""}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(name ? { name } : {}),
  });

// ---------- เก็บกวาดไฟล์ซ้ำ (Admin สั่งเอง: body {"cleanup": true}) ----------
// ไฟล์ใน Drive ที่แอปสร้าง แต่ไม่มีแถวใน drive_backup_files = สำเนาเกินที่อัปโหลดซ้ำ (บั๊กอ่านได้แค่ 1000 แถว, 2026-10-12)
// ย้ายไปถังขยะของ Drive (กู้คืนได้ 30 วัน) — ข้ามไฟล์ที่เพิ่งสร้างไม่ถึง 15 นาที กันชนกับรอบสำรองที่กำลังวิ่ง
async function cleanupUntracked(sb: SupabaseClient, dryRun = false) {
  const started = Date.now();
  accessToken = await googleToken();
  const { data: rows, error } = await selectAll(sb, "drive_backup_files", "drive_id", "source_key");
  if (error) throw new Error(`drive_backup_files: ${error.message}`);
  const tracked = new Set((rows || []).map((r: any) => r.drive_id));
  const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  const extra: string[] = [];
  let total = 0, pageToken = "";
  do {
    const q = encodeURIComponent(`mimeType != '${FOLDER_MIME}' and trashed = false`);
    const page = await drive(`/files?q=${q}&pageSize=1000&fields=nextPageToken,files(id,createdTime)${pageToken ? `&pageToken=${pageToken}` : ""}`);
    for (const f of page.files || []) { total++; if (!tracked.has(f.id) && f.createdTime < cutoff) extra.push(f.id); }
    pageToken = page.nextPageToken || "";
  } while (pageToken);
  let trashed = 0;
  for (const id of extra) {
    if (dryRun || Date.now() - started > TIME_BUDGET_MS) break;
    await drive(`/files/${id}?fields=id`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trashed: true }) });
    trashed++;
  }
  return { driveFiles: total, tracked: tracked.size, untracked: extra.length, trashed, left: extra.length - trashed };
}

// ---------- งานหลัก ----------
type Want = { key: string; path: string | null; parentKey: string; name: string; data?: string };
type FolderSpec = { key: string; name: string; parentKey: string | null };

// ดึงทุกแถว — PostgREST คืนได้ครั้งละไม่เกิน 1000 แถว ถ้าไม่แบ่งหน้า แถวที่เกินจะหายไป
// (เคยทำให้ไฟล์ที่เกิน 1000 ถูกอัปโหลดซ้ำทุกรอบ, 2026-10-12)
async function selectAll(sb: SupabaseClient, table: string, cols = "*", orderCol = "id") {
  const PAGE = 1000;
  const out: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select(cols).order(orderCol).range(from, from + PAGE - 1);
    if (error && from === 0) return await sb.from(table).select(cols); // ตารางไม่มีคอลัมน์ id (เช่น service_prices — แถวน้อย)
    if (error) return { data: out, error };
    out.push(...(data || []));
    if (!data || data.length < PAGE) return { data: out, error: null };
  }
}

async function runBackup(sb: SupabaseClient, trigger: string) {
  const started = Date.now();
  const outOfTime = () => Date.now() - started > TIME_BUDGET_MS;
  const stats = { uploaded: 0, updated: 0, moved_to_deleted: 0, remaining: 0 };
  accessToken = await googleToken();

  const load = async (table: string, cols = "*") => {
    const { data, error } = await selectAll(sb, table, cols);
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data || []) as any[];
  };
  const [customers, workers, jobs, receipts, payments, expenses, invoices, renewals] = await Promise.all([
    load("customers"), load("workers"), load("jobs"), load("receipts"), load("payments"), load("expenses"), load("invoices"), load("renewals"),
  ]);

  // ---------- โครงโฟลเดอร์ที่ควรมี ----------
  const folders = new Map<string, FolderSpec>();
  const addFolder = (key: string, name: string, parentKey: string | null) => folders.set(key, { key, name: clean(name) || "-", parentKey });
  addFolder("root", "WorkerOS Backup", null);
  addFolder("employers", "นายจ้าง", "root");
  addFolder("finance", "การเงิน", "root");
  addFolder("finance:receipts", "สลิปรับเงิน", "finance");
  addFolder("finance:expenses", "สลิปรายจ่าย", "finance");
  addFolder("data", "ข้อมูลระบบ", "root");
  addFolder("deleted", "ถูกลบ", "root");

  const custById = new Map(customers.map((c) => [c.id, c]));
  const ensureCustomer = (cid: string | null) => {
    const c = cid ? custById.get(cid) : null;
    const id = c ? c.id : "none";
    if (!folders.has(`customer:${id}`)) {
      addFolder(`customer:${id}`, c ? `${clean(c.company_name)}${c.tax_id ? ` (${clean(c.tax_id)})` : ""}` : "ไม่ระบุนายจ้าง", "employers");
      addFolder(`customer-docs:${id}`, "00 เอกสารนายจ้าง", `customer:${id}`);
      addFolder(`customer-workers:${id}`, "คนงาน", `customer:${id}`);
    }
    return id;
  };

  const wants: Want[] = [];
  const seen = new Set<string>();
  // fullName = ชื่อไฟล์ครบพร้อมนามสกุลแล้ว (ชื่อในระบบ) — ไม่ส่งก็ประกอบจาก name + นามสกุลของไฟล์ใน Storage
  const want = (url: unknown, parentKey: string, name: string, fullName = "") => {
    const path = storagePath(url);
    if (!path || seen.has(path)) return;
    seen.add(path);
    wants.push({ key: path, path, parentKey, name: fullName || withExt(clean(name), path) });
  };
  const today = bkkDate();

  // เอกสารนายจ้าง
  customers.forEach((c) => {
    const id = ensureCustomer(c.id);
    Object.entries(c.attachments || {}).forEach(([type, list]: [string, any]) => {
      (Array.isArray(list) ? list : [list]).forEach((f: any) => {
        const url = typeof f === "string" ? f : f?.data;
        const p = storagePath(url);
        if (!p) return;
        want(url, `customer-docs:${id}`, `${dateFromPath(p)}_${CUSTOMER_DOC_LABELS[type] || "เอกสาร"}_${c.tax_id || c.company_name}`);
      });
    });
  });

  // ลูกค้าเปิดเอกสารปิดงานได้เมื่อ: ไม่เรียกเก็บเงิน / นายจ้างเปิดสิทธิ์ดูก่อนชำระ / บิลของงานจ่ายครบ
  // (กติกาเดียวกับพอร์ทัล — clientJobDocsUnlocked ใน app.js)
  const invById = new Map(invoices.map((i) => [i.id, i]));
  const paidByInv = new Map<string, number>();
  payments.forEach((p) => { if (p.invoice_id && !p.voided) paidByInv.set(p.invoice_id, (paidByInv.get(p.invoice_id) || 0) + (Number(p.amount) || 0)); });
  const jobDocsUnlocked = (j: any) => {
    if (j.payment_status === "ไม่เรียกเก็บเงิน") return true;
    if (custById.get(j.customer_id)?.unlock_unpaid_job_docs) return true;
    const inv = j.invoice_id ? invById.get(j.invoice_id) : null;
    return !!inv && inv.status !== "void" && (Number(inv.grand_total) || 0) - (paidByInv.get(inv.id) || 0) <= 0.005;
  };
  // โฟลเดอร์ "รอชำระเงิน" อยู่ใต้ root (นอกโฟลเดอร์นายจ้างที่แชร์) — ชื่อนายจ้าง / คนงาน / ใบงาน ซ้อนเหมือนเดิม
  const heldFolder = (key: string): string => {
    if (key === "employers") return "held";
    const spec = folders.get(key)!;
    const hk = `held:${key}`;
    if (!folders.has(hk)) {
      if (!folders.has("held")) addFolder("held", "รอชำระเงิน (ลูกค้ายังไม่เห็น)", "root");
      addFolder(hk, spec.name, heldFolder(spec.parentKey!));
    }
    return hk;
  };
  // เอกสารต่ออายุ (ใบคำขอ ใบเสร็จ ใบแทน Smart card เล่มใหม่ — อยู่ในแฟ้มคนงาน) ล็อกจนกว่าใบงานเก็บเงินของรอบนั้น
  // (batch_id = 'renewal-<id>') ปลดล็อกทุกใบ (owner 2026-10-20) — กติกาเดียวกับ clientLockedRenewalUrls ใน app.js
  const lockedRenewalUrls = new Set<string>();
  renewals.forEach((r) => {
    const js = jobs.filter((j) => j.batch_id === `${r.kind === "registration" ? "register" : "renewal"}-${r.id}`); // ขึ้นทะเบียนใช้ batch register-<id>
    if (!js.length || js.every(jobDocsUnlocked)) return;
    Object.values(r.steps || {}).forEach((s: any) => { if (s && s.url) lockedRenewalUrls.add(s.url); });
  });

  // เอกสารคนงาน (ไม่แยกโฟลเดอร์ประเภท — ประเภทอยู่ในชื่อไฟล์, หมดอายุต่อท้าย "(หมดอายุ)")
  const workerById = new Map(workers.map((w) => [w.id, w]));
  const workerFolder = (w: any) => {
    const cid = ensureCustomer(w.employer_id);
    const key = `worker:${w.id}`;
    if (!folders.has(key)) {
      const name = `${w.worker_uid || "ไม่มีเลข"}_${clean(`${w.first_name || ""} ${w.last_name || ""}`)}`;
      addFolder(key, name, `customer-workers:${cid}`);
    }
    return key;
  };
  const workerTag = (w: any) => `${w.worker_uid || ""}_${clean(`${w.first_name || ""} ${w.last_name || ""}`)}`.replace(/^_/, "");
  workers.filter((w) => w.status !== "deleted").forEach((w) => {
    const fk = workerFolder(w);
    if (w.photo) want(w.photo, fk, `รูปคนงาน_${workerTag(w)}`);
    Object.entries(w.attachments || {}).forEach(([type, list]: [string, any]) => {
      (Array.isArray(list) ? list : [list]).forEach((f: any) => {
        const url = typeof f === "string" ? f : f?.data;
        const p = storagePath(url);
        if (!p) return;
        const expired = f && (f.manualExpired === true || (f.manualExpired !== false && f.expiryDate && String(f.expiryDate).slice(0, 10) < today));
        const suffix = expired ? " (หมดอายุ)" : "";
        want(url, lockedRenewalUrls.has(url) ? heldFolder(fk) : fk,
          `${dateFromPath(p, f?.uploadedAt)}_${WORKER_DOC_LABELS[type] || "เอกสาร"}_${workerTag(w)}${suffix}`, sysFileName(f?.name, p, suffix));
      });
    });
  });

  // เอกสารใบงาน (ใบนัดหมาย / เอกสารปิดงาน) → โฟลเดอร์ย่อยในโฟลเดอร์คนงาน 1 โฟลเดอร์ต่อการเปิดงาน 1 ครั้ง (owner 2026-10-19)
  // เปิดงานครั้งเดียวหลายประเภท (batch_id เดียวกัน) = โฟลเดอร์เดียว, เปิดงานครั้งใหม่ = โฟลเดอร์ใหม่
  // ชื่อ "ใบงาน <วันที่เปิดงาน> <ประเภทงาน + …>" (ตัดราคาในวงเล็บออก) — ไฟล์เดิมที่อยู่ในโฟลเดอร์คนงานถูกย้ายเข้าโฟลเดอร์ย่อยเอง
  const jobSetKey = (j: any) => `jobset:${j.worker_id}:${j.batch_id || j.id}`;
  const jobSets = new Map<string, any[]>();
  jobs.forEach((j) => { const k = jobSetKey(j); jobSets.set(k, [...(jobSets.get(k) || []), j]); });
  const jobSetFolder = (j: any, workerKey: string) => {
    const key = jobSetKey(j);
    if (!folders.has(key)) {
      const set = jobSets.get(key) || [j];
      const opened = set.map((x) => x.opened_at || x.created_at).filter(Boolean).sort()[0];
      const date = opened ? bkkDate(new Date(opened)) : "";
      const types = [...new Set(set.map((x) => String(x.job_type || "").replace(/\s*\(\d+(?:\.\d+)?\)/g, "").trim()).filter(Boolean))];
      addFolder(key, `ใบงาน ${date} ${types.join(" + ")}`.slice(0, 150), workerKey);
    }
    return key;
  };
  jobs.forEach((j) => {
    const w = workerById.get(j.worker_id);
    if (!w || w.status === "deleted") return;
    const fk = jobSetFolder(j, workerFolder(w));
    if (j.appointment_doc_url) {
      const p = storagePath(j.appointment_doc_url);
      if (p) want(j.appointment_doc_url, fk, `${dateFromPath(p)}_ใบนัดหมาย_${jobNo(j)}_${workerTag(w)}`);
    }
    // เอกสารปิดงานของใบงานที่ยังไม่ชำระ → "รอชำระเงิน/" (ไม่ได้แชร์ให้ลูกค้า) จ่ายครบแล้วรอบถัดไปย้ายเข้าโฟลเดอร์คนงานเอง (owner 2026-10-20)
    const closeKey = jobDocsUnlocked(j) ? fk : heldFolder(fk);
    (Array.isArray(j.attachments) ? j.attachments : []).forEach((f: any) => {
      const p = storagePath(f?.url);
      if (p) want(f.url, closeKey, `${dateFromPath(p, f.uploadedAt)}_เอกสารปิดงาน_${jobNo(j)}_${workerTag(w)}`, sysFileName(f.name, p));
    });
  });

  // สลิปรับเงิน (ใบเสร็จ + การรับเงินเก่าที่ไม่ผูกใบเสร็จ) / สลิปรายจ่าย → แยกโฟลเดอร์ ปี-เดือน
  const monthFolder = (base: string, date: string) => {
    const ym = String(date || "").slice(0, 7) || "ไม่ระบุเดือน";
    const key = `${base}:${ym}`;
    if (!folders.has(key)) addFolder(key, ym, base);
    return key;
  };
  receipts.forEach((r) => {
    (Array.isArray(r.proof_urls) ? r.proof_urls : []).forEach((u: any, i: number) => {
      const short = clean(r.customer_name || custById.get(r.customer_id)?.company_name || "").slice(0, 40);
      want(u?.url || u, monthFolder("finance:receipts", r.paid_date), `${r.receipt_no || "RC"}_${short}_${money(r.amount)}${i ? `_${i + 1}` : ""}`);
    });
  });
  payments.filter((p) => !p.receipt_id).forEach((p) => {
    (Array.isArray(p.proof_urls) ? p.proof_urls : []).forEach((u: any, i: number) => {
      want(u?.url || u, monthFolder("finance:receipts", p.paid_date), `${p.receipt_no || "ชำระเงิน"}_${money(p.amount)}${i ? `_${i + 1}` : ""}`);
    });
  });
  expenses.forEach((e) => {
    const url = e.attachment?.data || e.attachment?.url;
    if (url) want(url, monthFolder("finance:expenses", e.expense_date), `${String(e.expense_date || "").slice(0, 10)}_${clean(e.category)}_${money(e.amount)}`);
  });

  // ---------- สร้าง/เปลี่ยนชื่อ/ย้ายโฟลเดอร์ ----------
  const { data: folderRows, error: folderErr } = await selectAll(sb, "drive_backup_folders", "*", "key");
  if (folderErr) throw new Error(`drive_backup_folders: ${folderErr.message}`);
  const folderDb = new Map<string, any>((folderRows || []).map((r: any) => [r.key, r]));
  const neededFolders = new Set<string>(); // สร้างเฉพาะโฟลเดอร์ที่มีไฟล์อยู่จริง (ไม่สร้างโฟลเดอร์ว่างของคนงานที่ยังไม่มีเอกสาร)
  const markNeeded = (key: string | null) => {
    while (key && !neededFolders.has(key)) { neededFolders.add(key); key = folders.get(key)?.parentKey ?? null; }
  };
  ["root", "data", "deleted"].forEach(markNeeded);
  wants.forEach((w) => markNeeded(w.parentKey));
  folderDb.forEach((_r, key) => { if (folders.has(key)) markNeeded(key); }); // โฟลเดอร์ที่เคยสร้างแล้ว คงชื่อ/ตำแหน่งให้ถูก

  const folderId = async (key: string): Promise<string> => {
    const spec = folders.get(key)!;
    const parentId = spec.parentKey ? await folderId(spec.parentKey) : undefined;
    const row = folderDb.get(key);
    if (row) {
      if (row.name !== spec.name || row.parent_key !== spec.parentKey) {
        const oldParent = row.parent_key ? folderDb.get(row.parent_key)?.drive_id : undefined;
        await patchFile(row.drive_id, row.name !== spec.name ? spec.name : null,
          row.parent_key !== spec.parentKey ? parentId : undefined, row.parent_key !== spec.parentKey ? oldParent : undefined);
        row.name = spec.name; row.parent_key = spec.parentKey;
        await sb.from("drive_backup_folders").update({ name: spec.name, parent_key: spec.parentKey, updated_at: new Date().toISOString() }).eq("key", key);
      }
      return row.drive_id;
    }
    const created = await createFolder(spec.name, parentId);
    const newRow = { key, drive_id: created.id, name: spec.name, parent_key: spec.parentKey };
    folderDb.set(key, newRow);
    await sb.from("drive_backup_folders").insert(newRow);
    return created.id;
  };
  for (const key of neededFolders) { if (outOfTime()) break; await folderId(key); }

  // ---------- ไฟล์ ----------
  const { data: fileRows, error: fileErr } = await selectAll(sb, "drive_backup_files", "*", "source_key");
  if (fileErr) throw new Error(`drive_backup_files: ${fileErr.message}`);
  const fileDb = new Map<string, any>((fileRows || []).map((r: any) => [r.source_key, r]));

  for (const w of wants) {
    if (outOfTime()) { stats.remaining++; continue; }
    const row = fileDb.get(w.key);
    try {
      const parentId = await folderId(w.parentKey);
      if (!row) {
        const { data: blob, error } = await sb.storage.from(BUCKET).download(w.path!);
        if (error || !blob) continue; // ไฟล์ใน Storage หาย — ข้ามไป
        const created = await uploadFile(w.name, parentId, blob, blob.type);
        await sb.from("drive_backup_files").insert({ source_key: w.key, drive_id: created.id, parent_key: w.parentKey, name: w.name });
        stats.uploaded++;
      } else if (row.deleted || row.name !== w.name || row.parent_key !== w.parentKey) {
        // เปลี่ยนชื่อ (เช่น หมดอายุแล้ว/แก้ชื่อคนงาน), ย้ายโฟลเดอร์ (เปลี่ยนนายจ้าง), หรือกลับมาจาก "ถูกลบ"
        const fromKey = row.deleted ? "deleted" : row.parent_key;
        const fromId = folderDb.get(fromKey)?.drive_id;
        const moving = fromKey !== w.parentKey;
        await patchFile(row.drive_id, row.name !== w.name ? w.name : null, moving ? parentId : undefined, moving ? fromId : undefined);
        await sb.from("drive_backup_files").update({ name: w.name, parent_key: w.parentKey, deleted: false, updated_at: new Date().toISOString() }).eq("source_key", w.key);
        stats.updated++;
      }
    } catch (e) {
      if ((e as any).status === 404 && row) {
        // ไฟล์ใน Drive ถูกลบด้วยมือ → ลืมแถวนี้ รอบหน้าอัปโหลดใหม่
        await sb.from("drive_backup_files").delete().eq("source_key", w.key);
      } else throw e;
    }
  }

  // ไฟล์ที่ไม่มีในระบบแล้ว → ย้ายไป "ถูกลบ" (ไม่ลบทิ้ง) — ข้ามไฟล์ข้อมูลรายวัน (จัดการแยกด้านล่าง)
  // ทำเฉพาะรอบที่ตรวจไฟล์ครบทุกไฟล์แล้ว (ไม่งั้นไฟล์ที่ยังไม่ทันตรวจจะถูกย้ายผิด)
  if (!outOfTime() && stats.remaining === 0) {
    const deletedId = await folderId("deleted");
    for (const [key, row] of fileDb) {
      if (key.startsWith("data:") || key === "readme" || row.deleted || seen.has(key)) continue;
      if (outOfTime()) break;
      try {
        await patchFile(row.drive_id, null, deletedId, folderDb.get(row.parent_key)?.drive_id);
      } catch (e) { if ((e as any).status !== 404) throw e; }
      await sb.from("drive_backup_files").update({ deleted: true, updated_at: new Date().toISOString() }).eq("source_key", key);
      stats.moved_to_deleted++;
    }
  }

  // ---------- ข้อมูลระบบรายวัน (JSON ทุกตาราง) + เก็บย้อนหลัง 30 วัน ----------
  const dataKey = `data:${today}`;
  if (!outOfTime() && !fileDb.has(dataKey)) {
    const tables = ["customers", "workers", "jobs", "invoices", "payments", "receipts", "expenses", "banks", "agents", "service_prices", "free_invoices", "line_groups", "renewals"];
    const dump: Record<string, unknown> = { version: "drive-backup-1", exportDate: new Date().toISOString() };
    for (const t of tables) {
      const { data, error } = await selectAll(sb, t);
      dump[t] = error ? { error: error.message } : data;
    }
    const name = `${today}_ข้อมูลทั้งระบบ.json`;
    const created = await uploadFile(name, await folderId("data"), new Blob([JSON.stringify(dump, null, 1)], { type: "application/json" }), "application/json");
    await sb.from("drive_backup_files").insert({ source_key: dataKey, drive_id: created.id, parent_key: "data", name });
    stats.uploaded++;
    const cutoff = bkkDate(new Date(Date.now() - DATA_KEEP_DAYS * 86400_000));
    for (const [key, row] of fileDb) {
      if (!key.startsWith("data:") || key.slice(5) >= cutoff) continue;
      try { await drive(`/files/${row.drive_id}`, { method: "DELETE" }); } catch (e) { if ((e as any).status !== 404) throw e; }
      await sb.from("drive_backup_files").delete().eq("source_key", key);
    }
  }

  // ไฟล์อธิบายวิธีใช้ (ครั้งเดียว)
  if (!outOfTime() && !fileDb.has("readme")) {
    const text = [
      "WorkerOS Backup — สำเนาสำรองอัตโนมัติจากระบบ WorkerOS (ระบบจริงอยู่บน Supabase)",
      "",
      "นายจ้าง/   เอกสารนายจ้างและคนงาน แยกตามนายจ้าง (ชื่อไฟล์: วันที่แนบ_ประเภท_เลข13หลัก_ชื่อ)",
      "การเงิน/   สลิปรับเงินและสลิปรายจ่าย แยกตามเดือน",
      "ข้อมูลระบบ/  ไฟล์ข้อมูลทุกตารางรายวัน (เก็บ 30 วัน) ใช้กู้คืนผ่านหน้า 'สำรองและกู้คืนข้อมูล' ได้",
      "ถูกลบ/     ไฟล์ที่ถูกลบออกจากระบบแล้ว (เก็บไว้เป็นหลักฐาน)",
      "",
      "อย่าแก้/ย้ายไฟล์ในโฟลเดอร์นี้ด้วยมือ — ระบบจะจัดชื่อ/ตำแหน่งกลับให้ตรงกับระบบทุกรอบ",
    ].join("\n");
    const created = await uploadFile("อ่านก่อน - วิธีใช้ไฟล์สำรอง.txt", await folderId("root"), new Blob([text], { type: "text/plain" }), "text/plain;charset=UTF-8");
    await sb.from("drive_backup_files").insert({ source_key: "readme", drive_id: created.id, parent_key: "root", name: "อ่านก่อน - วิธีใช้ไฟล์สำรอง.txt" });
  }

  // ---------- แชร์โฟลเดอร์นายจ้างให้ลูกค้า (อ่านอย่างเดียว) — เฉพาะนายจ้างที่เปิด drive_share + มีอีเมล ----------
  for (const c of customers) {
    if (outOfTime()) break;
    const row = folderDb.get(`customer:${c.id}`);
    if (!row) continue;
    const email = String(c.email || "").trim().toLowerCase();
    const wantShare = c.drive_share === true && c.status !== "inactive" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    if (wantShare && row.shared_email !== email) {
      if (row.shared_permission_id) { try { await drive(`/files/${row.drive_id}/permissions/${row.shared_permission_id}`, { method: "DELETE" }); } catch { /* ถูกลบไปแล้ว */ } }
      const perm = await drive(`/files/${row.drive_id}/permissions?sendNotificationEmail=true&fields=id`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user", role: "reader", emailAddress: email }),
      });
      await sb.from("drive_backup_folders").update({ shared_email: email, shared_permission_id: perm.id }).eq("key", row.key);
    } else if (!wantShare && row.shared_permission_id) {
      try { await drive(`/files/${row.drive_id}/permissions/${row.shared_permission_id}`, { method: "DELETE" }); } catch { /* ถูกลบไปแล้ว */ }
      await sb.from("drive_backup_folders").update({ shared_email: null, shared_permission_id: null }).eq("key", row.key);
    }
  }

  return stats;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // ตรวจสิทธิ์: pg_cron (x-cron-secret) หรือ Admin ที่ล็อกอินอยู่ (ปุ่ม "สำรองลง Google Drive ตอนนี้")
  let trigger = "";
  if (CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET) trigger = "cron";
  else {
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = jwt ? await sb.auth.getUser(jwt) : { data: null } as any;
    if (u?.user) {
      const { data: prof } = await sb.from("profiles").select("role").eq("id", u.user.id).single();
      if (prof?.role === "admin") trigger = "manual";
    }
  }
  if (!trigger) return json({ status: "error", message: "ไม่มีสิทธิ์" }, 401);
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    return json({ status: "error", message: "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Google Drive (secrets)" }, 500);
  }

  const body = await req.json().catch(() => ({}));
  if (trigger === "manual" && body?.cleanup) {
    try { return json({ status: "success", ...(await cleanupUntracked(sb, !!body.dryRun)) }); }
    catch (e) { return json({ status: "error", message: (e as Error).message || String(e) }, 500); }
  }

  const { data: run } = await sb.from("drive_backup_runs").insert({ trigger }).select("id").single();
  try {
    const stats = await runBackup(sb, trigger);
    await sb.from("drive_backup_runs").update({ ...stats, finished_at: new Date().toISOString() }).eq("id", run?.id);
    return json({ status: "success", ...stats });
  } catch (e) {
    const message = (e as Error).message || String(e);
    await sb.from("drive_backup_runs").update({ error: message, finished_at: new Date().toISOString() }).eq("id", run?.id);
    return json({ status: "error", message }, 500);
  }
});
