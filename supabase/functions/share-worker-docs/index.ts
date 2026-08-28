// supabase/functions/share-worker-docs/index.ts
// เสิร์ฟข้อมูลเอกสารของคนงาน 1 คน แบบสาธารณะ (ไม่ต้องล็อกอิน) ให้หน้า share.html เรียกใช้
// ตัวยืนยันตัวตนคือ "share_token" แบบสุ่มที่ผูกกับคนงานคนนั้นโดยเฉพาะ (สร้าง/ยกเลิกได้จากในระบบ)
// แทน JWT ปกติ — ฟังก์ชันนี้จึง deploy แบบ verify_jwt=false (ตั้งใจ เพราะต้องเรียกได้จากลูกค้าที่ไม่มีบัญชี)
//
// Deploy: supabase functions deploy share-worker-docs --no-verify-jwt
// เรียกจาก client (share.html) แบบ GET: /share-worker-docs?id=<workerId>&token=<shareToken>

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
    if (!id || !token) {
      return json({ status: "error", message: "ลิงก์ไม่ถูกต้อง" }, 400);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: worker, error } = await adminClient
      .from("workers")
      .select("first_name, last_name, nationality, attachments, share_token")
      .eq("id", id)
      .single();

    // ไม่บอกความต่างระหว่าง "ไม่พบคนงาน" กับ "token ผิด/ถูกยกเลิกแล้ว" กันไม่ให้เดา id ได้
    if (error || !worker || !worker.share_token || worker.share_token !== token) {
      return json({ status: "error", message: "ไม่พบเอกสาร หรือลิงก์นี้ถูกยกเลิกแล้ว" }, 404);
    }

    return json({
      status: "success",
      firstName: worker.first_name,
      lastName: worker.last_name || "",
      nationality: worker.nationality || "",
      attachments: worker.attachments || {},
    });
  } catch (error) {
    console.error("share-worker-docs error:", error);
    return json({ status: "error", message: String(error) }, 500);
  }
});
