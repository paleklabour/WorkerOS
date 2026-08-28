// supabase/functions/delete-user/index.ts
// ลบบัญชีผู้ใช้งานถาวร (auth.users) — ต้องรันฝั่งเซิร์ฟเวอร์เพราะ auth.admin.deleteUser
// ต้องใช้ service_role key เท่านั้น (ห้ามฝัง service_role key ไว้ฝั่ง client เด็ดขาด)
// profiles ผูก "on delete cascade" กับ auth.users ไว้แล้ว (ดู 0001_init.sql) — ลบ auth user
// แถวเดียว ก็พอ แถว profiles จะหายไปเองอัตโนมัติ
//
// ใช้ secret ตัวเดียวกับ create-user: ADMIN_PIN
// Deploy: supabase functions deploy delete-user
// เรียกจาก client พร้อม Authorization: Bearer <ผู้เรียกต้องล็อกอินเป็น admin อยู่แล้ว>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_PIN = Deno.env.get("ADMIN_PIN") || "1973";

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
    // 1. ตรวจสอบว่าผู้เรียกล็อกอินอยู่ และเป็น admin จริง
    const authHeader = req.headers.get("Authorization") || "";
    const callerToken = authHeader.replace("Bearer ", "");
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerErr } = await callerClient.auth.getUser(callerToken);
    if (callerErr || !callerData.user) {
      return json({ status: "error", message: "Unauthorized" }, 401);
    }
    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", callerData.user.id)
      .single();
    if (!callerProfile || callerProfile.role !== "admin") {
      return json({ status: "error", message: "Forbidden: Admins only." }, 403);
    }

    // 2. ตรวจสอบ PIN + userId ที่จะลบ
    const { userId, pin } = await req.json();
    if (String(pin || "") !== String(ADMIN_PIN)) {
      return json({ status: "error", message: "รหัส PIN ไม่ถูกต้อง" }, 403);
    }
    if (!userId) {
      return json({ status: "error", message: "กรุณาระบุบัญชีที่ต้องการลบ" }, 400);
    }
    if (userId === callerData.user.id) {
      return json({ status: "error", message: "ไม่สามารถลบบัญชีของตัวเองได้" }, 400);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. กันลบ admin คนสุดท้ายในระบบ (ระบบต้องมี admin เหลืออย่างน้อย 1 คนเสมอ)
    const { data: targetProfile } = await adminClient.from("profiles").select("role").eq("id", userId).single();
    if (targetProfile && targetProfile.role === "admin") {
      const { count } = await adminClient.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
      if ((count || 0) <= 1) {
        return json({ status: "error", message: "ไม่สามารถลบได้ ต้องมีบัญชี Admin เหลืออยู่ในระบบอย่างน้อย 1 คน" }, 400);
      }
    }

    // 4. ลบบัญชีจริงด้วย service role (profiles หายตามด้วย on delete cascade)
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteErr) {
      return json({ status: "error", message: deleteErr.message }, 500);
    }

    return json({ status: "success" });
  } catch (error) {
    console.error("delete-user error:", error);
    return json({ status: "error", message: String(error) }, 500);
  }
});
