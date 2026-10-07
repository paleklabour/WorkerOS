// supabase/functions/drive-backup/index.ts
// สำรองไฟล์เอกสาร + ข้อมูลระบบรายวันลง Google Drive (Gmail ส่วนตัวของเจ้าของระบบ) แบบทางเดียว
// Supabase ยังเป็นที่เก็บหลักที่เดียว — ฟังก์ชันนี้แค่คัดลอกไปจัดโฟลเดอร์ใน Drive:
//
//   WorkerOS Backup/
//   ├─ นายจ้าง/<ชื่อบริษัท (เลขนิติบุคคล)>/00 เอกสารนายจ้าง/<วันที่_ประเภท_เลขนิติบุคคล>.pdf
//   │                                  └─ คนงาน/<เลข13หลัก_ชื่อ>/<วันที่_ประเภท_เลข13หลัก_ชื่อ>.pdf  (ไม่แยกโฟลเดอร์ประเภท)
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

// ---------- งานหลัก ----------
type Want = { key: string; path: string | null; parentKey: string; name: string; data?: string };
type FolderSpec = { key: string; name: string; parentKey: string | null };

async function runBackup(sb: SupabaseClient, trigger: string) {
  const started = Date.now();
  const outOfTime = () => Date.now() - started > TIME_BUDGET_MS;
  const stats = { uploaded: 0, updated: 0, moved_to_deleted: 0, remaining: 0 };
  accessToken = await googleToken();

  const load = async (table: string, cols = "*") => {
    const { data, error } = await sb.from(table).select(cols);
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data || []) as any[];
  };
  const [customers, workers, jobs, receipts, payments, expenses] = await Promise.all([
    load("customers"), load("workers"), load("jobs"), load("receipts"), load("payments"), load("expenses"),
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
  const want = (url: unknown, parentKey: string, name: string) => {
    const path = storagePath(url);
    if (!path || seen.has(path)) return;
    seen.add(path);
    wants.push({ key: path, path, parentKey, name: withExt(clean(name), path) });
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
        want(url, fk, `${dateFromPath(p, f?.uploadedAt)}_${WORKER_DOC_LABELS[type] || "เอกสาร"}_${workerTag(w)}${expired ? " (หมดอายุ)" : ""}`);
      });
    });
  });

  // เอกสารใบงาน (ใบนัดหมาย / เอกสารปิดงาน) → โฟลเดอร์คนงาน ใส่เลขใบงานในชื่อไฟล์
  jobs.forEach((j) => {
    const w = workerById.get(j.worker_id);
    if (!w || w.status === "deleted") return;
    const fk = workerFolder(w);
    if (j.appointment_doc_url) {
      const p = storagePath(j.appointment_doc_url);
      if (p) want(j.appointment_doc_url, fk, `${dateFromPath(p)}_ใบนัดหมาย_${jobNo(j)}_${workerTag(w)}`);
    }
    (Array.isArray(j.attachments) ? j.attachments : []).forEach((f: any) => {
      const p = storagePath(f?.url);
      if (p) want(f.url, fk, `${dateFromPath(p, f.uploadedAt)}_เอกสารปิดงาน_${jobNo(j)}_${workerTag(w)}`);
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
  const { data: folderRows } = await sb.from("drive_backup_folders").select("*");
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
  const { data: fileRows } = await sb.from("drive_backup_files").select("*");
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
    const tables = ["customers", "workers", "jobs", "invoices", "payments", "receipts", "expenses", "banks", "agents", "service_prices", "free_invoices", "line_groups"];
    const dump: Record<string, unknown> = { version: "drive-backup-1", exportDate: new Date().toISOString() };
    for (const t of tables) {
      const { data, error } = await sb.from(t).select("*");
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
