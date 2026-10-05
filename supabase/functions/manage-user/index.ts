// supabase/functions/manage-user/index.ts
// เครื่องมือจัดการบัญชีผู้ใช้สำหรับ Admin — งานที่ต้องใช้ service_role (auth.admin.*) จึงต้องอยู่ฝั่งเซิร์ฟเวอร์
// action:
//   list           — อีเมลจริง / เข้าระบบล่าสุด / สถานะระงับ ของทุกบัญชี (ไม่ต้องใช้ PIN)
//   set_password   — ตั้งรหัสผ่านใหม่ให้ผู้ใช้ทันที ไม่ต้องส่งอีเมล (ไม่ติดโควตาอีเมลของ Supabase)
//   change_email   — เปลี่ยนอีเมลเข้าระบบ (ยืนยันให้ทันที ไม่ส่งอีเมล)
//   suspend / unsuspend — ระงับ/เปิดใช้งานบัญชี (เข้าระบบไม่ได้ แต่ข้อมูลและประวัติยังอยู่)
// ทุก action ยกเว้น list ต้องใส่ PIN (secret ADMIN_PIN เดียวกับ create-user/delete-user)
//
// Deploy: supabase functions deploy manage-user

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
    // 1. ผู้เรียกต้องล็อกอินและเป็น admin จริง
    const authHeader = req.headers.get("Authorization") || "";
    const callerToken = authHeader.replace("Bearer ", "");
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerErr } = await callerClient.auth.getUser(callerToken);
    if (callerErr || !callerData.user) return json({ status: "error", message: "Unauthorized" }, 401);
    const { data: callerProfile } = await callerClient.from("profiles").select("role").eq("id", callerData.user.id).single();
    if (!callerProfile || callerProfile.role !== "admin") {
      return json({ status: "error", message: "Forbidden: Admins only." }, 403);
    }

    const { action, userId, pin, password, email } = await req.json();
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === "list") {
      const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (error) return json({ status: "error", message: error.message }, 500);
      const now = Date.now();
      return json({
        status: "success",
        data: data.users.map((u) => ({
          id: u.id,
          email: u.email,
          lastSignInAt: u.last_sign_in_at || null,
          createdAt: u.created_at || null,
          suspended: !!(u.banned_until && new Date(u.banned_until).getTime() > now),
        })),
      });
    }

    // 2. action ที่แก้บัญชีต้องใช้ PIN
    if (String(pin || "") !== String(ADMIN_PIN)) return json({ status: "error", message: "รหัส PIN ไม่ถูกต้อง" }, 403);
    if (!userId) return json({ status: "error", message: "กรุณาระบุบัญชี" }, 400);

    if (action === "set_password") {
      if (!password || String(password).length < 8) return json({ status: "error", message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, 400);
      const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
      if (error) return json({ status: "error", message: error.message }, 500);
      return json({ status: "success" });
    }

    if (action === "change_email") {
      const clean = String(email || "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return json({ status: "error", message: "รูปแบบอีเมลไม่ถูกต้อง" }, 400);
      const { error } = await adminClient.auth.admin.updateUserById(userId, { email: clean, email_confirm: true });
      if (error) {
        const msg = /already|registered|exists/i.test(error.message) ? "มีอีเมลนี้ในระบบอยู่แล้ว" : error.message;
        return json({ status: "error", message: msg }, 409);
      }
      return json({ status: "success" });
    }

    if (action === "suspend" || action === "unsuspend") {
      if (action === "suspend") {
        if (userId === callerData.user.id) return json({ status: "error", message: "ระงับบัญชีของตัวเองไม่ได้" }, 400);
        const { data: target } = await adminClient.from("profiles").select("role").eq("id", userId).single();
        if (target && target.role === "admin") {
          const { count } = await adminClient.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
          if ((count || 0) <= 1) return json({ status: "error", message: "ต้องมี Admin ที่ใช้งานได้อย่างน้อย 1 คน" }, 400);
        }
      }
      // ban_duration "876000h" ≈ 100 ปี = ระงับจนกว่าจะเปิดใหม่, "none" = ยกเลิกการระงับ
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: action === "suspend" ? "876000h" : "none",
      });
      if (error) return json({ status: "error", message: error.message }, 500);
      return json({ status: "success" });
    }

    return json({ status: "error", message: "ไม่รู้จัก action นี้" }, 400);
  } catch (error) {
    console.error("manage-user error:", error);
    return json({ status: "error", message: String(error) }, 500);
  }
});
