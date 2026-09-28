// supabase/functions/ewp-qrcheck/index.ts
// ดึงข้อมูลใบอนุญาตทำงานจากระบบ e-WorkPermit ของกรมการจัดหางาน ด้วยเลขอ้างอิงจาก QR code บนบัตร/เอกสาร
// (QR บนบัตรใบอนุญาตทำงานเป็นลิงก์ https://ewp.doe.go.th/qrcheck/ref?<เลขคำขอ> — หน้านั้นเรียก POST /api/inquery)
// ข้อมูลจากกรมเป็นข้อมูลทางการ แม่นกว่าให้ AI อ่านจากรูป และบอกสถานะใบอนุญาต (เช่น ถูกยกเลิก) ที่บนบัตรไม่มี
// ต้องผ่าน Edge Function เพราะเบราว์เซอร์เรียกเว็บกรมตรง ๆ ไม่ได้ (CORS)
//
// Deploy: supabase functions deploy ewp-qrcheck
// เรียกจาก client พร้อม Authorization: Bearer <user's access token>, body { ref: "<เลขอ้างอิงตัวเลขล้วน>" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const EWP_INQUIRY_URL = "https://ewp.doe.go.th/api/inquery";
const TIMEOUT_MS = 10000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    // ตรวจสอบว่าผู้เรียกล็อกอินอยู่จริง (ไม่ใช่ anon ที่ไม่มี session)
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData.user) return reply({ status: "error", message: "Unauthorized" }, 401);

    const { ref } = await req.json();
    // รับเฉพาะเลขอ้างอิงตัวเลขล้วน — ประกอบ URL เองฝั่งนี้ ไม่ส่งต่อข้อความจาก QR ไปตรง ๆ
    if (typeof ref !== "string" || !/^\d{8,25}$/.test(ref)) return reply({ status: "error", message: "invalid ref" }, 400);

    const res = await fetch(EWP_INQUIRY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr_value: `/qrcheck/ref?${ref}` }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("e-WorkPermit inquiry failed:", res.status, await res.text());
      return reply({ status: "error", message: `e-WorkPermit ${res.status}` });
    }
    const card = await res.json();
    // ลิงก์รูปหน้าคนงานมี token หมดอายุในไม่กี่นาที — ไม่ส่งต่อ
    delete card.profile_image_url;
    return reply({ status: "success", card });
  } catch (e) {
    console.error("ewp-qrcheck error:", e);
    return reply({ status: "error", message: String(e) });
  }
});
