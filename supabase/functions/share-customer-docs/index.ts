// supabase/functions/share-customer-docs/index.ts
// เสิร์ฟข้อมูลเอกสารของนายจ้าง/ลูกค้าผู้ว่าจ้าง 1 ราย แบบสาธารณะ (ไม่ต้องล็อกอิน) ให้หน้า share-customer.html เรียกใช้
// ตัวยืนยันตัวตนคือ "share_token" แบบสุ่มที่ผูกกับลูกค้ารายนั้นโดยเฉพาะ (สร้าง/ยกเลิกได้จากในระบบ)
// แทน JWT ปกติ — ฟังก์ชันนี้จึง deploy แบบ verify_jwt=false (ตั้งใจ เพราะต้องเรียกได้จากลูกค้าที่ไม่มีบัญชี)
// คู่เดียวกับ share-worker-docs (ดูไฟล์นั้นประกอบ)
//
// เรียกจาก client (share-customer.html) แบบ GET: /share-customer-docs?id=<customerId>&token=<shareToken>

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
    const { data: customer, error } = await adminClient
      .from("customers")
      .select("company_name, tax_id, attachments, share_token")
      .eq("id", id)
      .single();

    // ไม่บอกความต่างระหว่าง "ไม่พบลูกค้า" กับ "token ผิด/ถูกยกเลิกแล้ว" กันไม่ให้เดา id ได้
    if (error || !customer || !customer.share_token || customer.share_token !== token) {
      return json({ status: "error", message: "ไม่พบเอกสาร หรือลิงก์นี้ถูกยกเลิกแล้ว" }, 404);
    }

    return json({
      status: "success",
      companyName: customer.company_name,
      taxId: customer.tax_id || "",
      attachments: customer.attachments || {},
    });
  } catch (error) {
    console.error("share-customer-docs error:", error);
    return json({ status: "error", message: String(error) }, 500);
  }
});
