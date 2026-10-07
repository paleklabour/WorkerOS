// supabase/functions/share-invoice/index.ts
// เสิร์ฟข้อมูลใบวางบิล 1 ใบแบบสาธารณะ (ไม่ต้องล็อกอิน) ให้หน้า invoice.html — ลิงก์ที่ส่งให้ลูกค้าทาง LINE ฯลฯ
// ตัวยืนยันคือ invoices.share_token แบบสุ่มของบิลนั้น (สร้าง/ยกเลิกได้จากหน้าใบวางบิลในระบบ)
// ส่งเฉพาะข้อมูลที่พิมพ์บนบิล — ไม่ส่งค่าธรรมเนียมรัฐ (ภายใน), ผู้สร้างบิล, เหตุผลยกเลิก ฯลฯ
// ข้อมูลสดเสมอ: ยอดชำระแล้ว/คงเหลือ/สถานะ คิดจาก payments ตอนเปิดลิงก์
//
// Deploy: supabase functions deploy share-invoice --no-verify-jwt
// เรียก: GET /share-invoice?id=<invoiceId>&token=<shareToken>&layout=service|worker

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

// คำนำหน้านามแสดงเป็นภาษาอังกฤษ — ตรงกับ englishTitle() ใน app.js
const TITLE_EN: Record<string, string> = {
  "นาย": "MR.", "นาง": "MRS.", "นางสาว": "MISS", "น.ส.": "MISS", "เด็กชาย": "MASTER", "ด.ช.": "MASTER", "เด็กหญิง": "MISS", "ด.ญ.": "MISS",
  "mr": "MR.", "mrs": "MRS.", "miss": "MISS", "ms": "MS.", "master": "MASTER",
};
const englishTitle = (t: unknown) => {
  const s = String(t || "").trim();
  return s ? (TITLE_EN[s] || TITLE_EN[s.toLowerCase().replace(/\.$/, "")] || s) : "";
};
const fullName = (w: any) =>
  `${englishTitle(w.title) ? englishTitle(w.title) + " " : ""}${w.first_name || ""} ${w.last_name || ""}`.replace(/\s+/g, " ").trim() || "-";
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") || "";
    const token = url.searchParams.get("token") || "";
    const layout = url.searchParams.get("layout") === "worker" ? "worker" : "service";
    if (!id || !token) return json({ status: "error", message: "ลิงก์ไม่ถูกต้อง" }, 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: inv, error } = await sb.from("invoices").select("*").eq("id", id).maybeSingle();
    if (error || !inv || !inv.share_token || inv.share_token !== token) {
      return json({ status: "error", message: "ลิงก์นี้ใช้ไม่ได้แล้ว หรือไม่มีอยู่จริง" }, 404);
    }
    if (inv.status === "void") return json({ status: "error", message: "ใบวางบิลนี้ถูกยกเลิกแล้ว" }, 410);

    const { data: pays } = await sb.from("payments").select("amount, voided").eq("invoice_id", id);
    const paid = round2((pays || []).filter((p: any) => !p.voided).reduce((s: number, p: any) => s + Number(p.amount || 0), 0));
    const grand = round2(inv.grand_total);

    let bank = null;
    if (inv.bank_id) {
      const { data: b } = await sb.from("banks").select("bank_name, account_name, account_number").eq("id", inv.bank_id).maybeSingle();
      if (b) bank = { bankName: b.bank_name, accountName: b.account_name, accountNumber: b.account_number };
    }

    const items = (Array.isArray(inv.items) ? inv.items : []).filter((it: any) => !it.placeholder || Number(it.fee) > 0);
    let rows = items.map((it: any) => ({
      title: it.title || "", desc: it.desc || "", qty: it.qty || 1,
      unitPrice: it.unitPrice !== undefined ? Number(it.unitPrice) : Number(it.fee || 0), fee: Number(it.fee || 0),
    }));

    // แบบรายคน: 1 แถวต่อคนงาน (สัดส่วนเดียวกับ buildInvoicePerWorkerRows ใน app.js)
    if (layout === "worker") {
      const jobIds = [...new Set(items.flatMap((it: any) => (it.jobBreakdown || []).map((b: any) => b.jobId)))];
      const workerIds = new Set<string>(items.flatMap((it: any) => it.workerIds || []));
      const { data: jobs } = jobIds.length ? await sb.from("jobs").select("id, worker_id").in("id", jobIds) : { data: [] as any[] };
      (jobs || []).forEach((j: any) => j.worker_id && workerIds.add(j.worker_id));
      const { data: workers } = workerIds.size
        ? await sb.from("workers").select("id, title, first_name, last_name, worker_uid").in("id", [...workerIds]) : { data: [] as any[] };
      const jobWorker = new Map((jobs || []).map((j: any) => [j.id, j.worker_id]));
      const wById = new Map((workers || []).map((w: any) => [w.id, w]));
      const out = new Map<string, any>();
      const add = (key: string, title: string, desc: string, service: string | null, amount: number) => {
        if (!out.has(key)) out.set(key, { title, desc, services: [] as string[], fee: 0 });
        const r = out.get(key);
        if (service && !r.services.includes(service)) r.services.push(service);
        r.fee += amount;
      };
      items.forEach((it: any) => {
        const service = it.serviceName || String(it.title || "").replace(/^ค่าบริการ:\s*/, "");
        const bd = it.jobBreakdown || [];
        if (bd.length) {
          const tot = bd.reduce((s: number, b: any) => s + Number(b.price || 0), 0);
          bd.forEach((b: any) => {
            const share = (tot > 0 ? Number(b.price || 0) / tot : 1 / bd.length) * Number(it.fee || 0);
            const w = wById.get(jobWorker.get(b.jobId));
            add(w ? `w-${w.id}` : `j-${b.jobId}`, w ? fullName(w) : "ไม่พบข้อมูลคนงาน", w ? `เลขประจำตัว ${w.worker_uid || "-"}` : "", service, share);
          });
        } else if ((it.workerIds || []).length) {
          it.workerIds.forEach((wid: string) => {
            const w = wById.get(wid);
            add(`w-${wid}`, w ? fullName(w) : "ไม่พบข้อมูลคนงาน", w ? `เลขประจำตัว ${w.worker_uid || "-"}` : "", service, Number(it.fee || 0) / it.workerIds.length);
          });
        } else {
          add(`i-${it.id}`, it.title || "", it.desc || "", null, Number(it.fee || 0));
        }
      });
      rows = [...out.values()].map((r) => ({
        title: r.title,
        desc: [r.desc, r.services.length ? `ค่าบริการ: ${r.services.join(", ")}` : ""].filter(Boolean).join("\n"),
        qty: 1, unitPrice: round2(r.fee), fee: round2(r.fee),
      }));
    }

    return json({
      status: "success",
      invoice: {
        invoiceNo: inv.invoice_no, issueDate: inv.issue_date, dueDateText: inv.due_date_text, notes: inv.notes,
        customerName: inv.customer_name, customerAddr: inv.customer_addr, customerTax: inv.customer_tax,
        status: inv.status, grandTotal: grand, paid, balance: round2(Math.max(0, grand - paid)), rows, bank,
      },
    });
  } catch (e) {
    return json({ status: "error", message: (e as Error).message || "ข้อผิดพลาดระบบ" }, 500);
  }
});
