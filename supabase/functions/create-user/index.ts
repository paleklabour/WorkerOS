// supabase/functions/create-user/index.ts
// แทนที่ handleSaveUser() ใน Code.gs — ต้องรันฝั่งเซิร์ฟเวอร์เพราะการสร้างบัญชี
// Supabase Auth ใหม่ (auth.admin.createUser) ต้องใช้ service_role key เท่านั้น
// (ห้ามฝัง service_role key ไว้ฝั่ง client เด็ดขาด)
//
// ต้องตั้งค่า secret ก่อน deploy:
//   supabase secrets set ADMIN_PIN=1973   (ตั้งเป็นค่าที่ต้องการจริง ไม่ใช่ default นี้)
//
// Deploy: supabase functions deploy create-user
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
    // 1. ตรวจสอบว่าผู้เรียกล็อกอินอยู่ และเป็น admin จริง (อ่านผ่าน anon key + RLS ของผู้เรียกเอง)
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

    // 2. ตรวจสอบ PIN + ข้อมูลที่จำเป็น (เหมือนระบบเดิม)
    const { userData, pin } = await req.json();
    if (String(pin || "") !== String(ADMIN_PIN)) {
      return json({ status: "error", message: "รหัส PIN ไม่ถูกต้อง" }, 403);
    }
    if (!userData || !userData.email || !userData.password || !userData.name || !userData.role) {
      return json({ status: "error", message: "กรุณากรอกข้อมูลผู้ใช้งานให้ครบถ้วน (อีเมล, ชื่อ, บทบาท, รหัสผ่าน)" }, 400);
    }

    // 3. สร้างบัญชีจริงด้วย service role (ข้าม RLS ได้เพราะเป็น admin API โดยตรง)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
    });
    if (createErr) {
      const msg = createErr.message.includes("already registered")
        ? "มีอีเมลนี้ในระบบอยู่แล้ว"
        : createErr.message;
      return json({ status: "error", message: msg }, 409);
    }

    // 4. เพิ่มแถวใน profiles ผูก role/customer_id
    const { error: profileErr } = await adminClient.from("profiles").insert({
      id: created.user.id,
      name: userData.name,
      role: userData.role,
      customer_id: userData.customer_id || null,
    });
    if (profileErr) {
      // rollback: ลบ auth user ที่เพิ่งสร้างถ้าใส่ profile ไม่สำเร็จ
      await adminClient.auth.admin.deleteUser(created.user.id);
      return json({ status: "error", message: profileErr.message }, 500);
    }

    return json({
      status: "success",
      data: { email: userData.email, name: userData.name, role: userData.role, customer_id: userData.customer_id || null },
    });
  } catch (error) {
    console.error("create-user error:", error);
    return json({ status: "error", message: String(error) }, 500);
  }
});
