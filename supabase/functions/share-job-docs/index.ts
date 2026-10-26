// supabase/functions/share-job-docs/index.ts
// เสิร์ฟเอกสารปิดงานของใบงาน 1 ใบ แบบสาธารณะ (ไม่ต้องล็อกอิน) ให้หน้า share-job.html เรียกใช้ (owner 2026-10-26)
// ตัวยืนยันตัวตนคือ jobs.share_token แบบสุ่ม (สร้างผ่าน RPC job_share_token — ทั้งพนักงานและลูกค้าเจ้าของใบงาน)
// เช็คซ้ำทุกครั้งที่เปิดว่ายังปลดล็อกอยู่ (บิลถูกยกเลิก/กลับเป็นค้างชำระ → ปิดลิงก์ชั่วคราว) — กติกาเดียวกับ clientJobDocsUnlocked
//
// Deploy: supabase functions deploy share-job-docs --no-verify-jwt
// เรียกจาก share-job.html แบบ GET: /share-job-docs?id=<jobId>&token=<shareToken>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") || "";
    const token = url.searchParams.get("token") || "";
    if (!id || !token) return json({ status: "error", message: "ลิงก์ไม่ถูกต้อง" }, 400);

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: job, error } = await db
      .from("jobs")
      .select("job_type, status, closed_at, attachments, share_token, payment_status, customer_id, worker_id")
      .eq("id", id)
      .single();

    // ไม่บอกความต่างระหว่าง "ไม่พบใบงาน" กับ "token ผิด" กันเดา id
    if (error || !job || !job.share_token || job.share_token !== token) {
      return json({ status: "error", message: "ไม่พบเอกสาร หรือลิงก์นี้ถูกยกเลิกแล้ว" }, 404);
    }

    const [{ data: cust }, { data: worker }] = await Promise.all([
      db.from("customers").select("company_name, unlock_unpaid_job_docs").eq("id", job.customer_id).maybeSingle(),
      job.worker_id
        ? db.from("workers").select("title, first_name, last_name").eq("id", job.worker_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const unlocked = ["ไม่เรียกเก็บเงิน", "ชำระเงินแล้ว"].includes(job.payment_status) || !!(cust && cust.unlock_unpaid_job_docs);
    if (!unlocked) {
      return json({ status: "error", message: "เอกสารของใบงานนี้จะเปิดได้หลังชำระเงิน" }, 403);
    }

    const files = (Array.isArray(job.attachments) ? job.attachments : [])
      .filter((f: any) => f && f.url)
      .map((f: any) => ({ name: f.name || "", url: f.url, note: f.note || "" }));

    return json({
      status: "success",
      jobType: String(job.job_type || "").replace(/\s*\(.*?\)\s*$/, ""),
      jobStatus: job.status || "",
      closedAt: job.closed_at || "",
      employer: cust ? cust.company_name : "",
      worker: worker ? [worker.title, worker.first_name, worker.last_name].filter(Boolean).join(" ") : "",
      files,
    });
  } catch (error) {
    console.error("share-job-docs error:", error);
    return json({ status: "error", message: String(error) }, 500);
  }
});
