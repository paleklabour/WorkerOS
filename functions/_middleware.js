// Cloudflare Pages Function — กันโค้ดระบบจากคนที่ยังไม่ล็อกอิน (owner 2026-10-28)
// supabase-client.js / app.js ส่งให้เฉพาะคำขอที่มีคุกกี้ wos_at (access token ที่ boot.js ตั้ง) และ Supabase ยืนยันว่ายังใช้ได้
// ค่าด้านล่างเป็นค่าสาธารณะชุดเดียวกับใน index.html (publishable key) — ห้ามใส่ service_role ที่นี่
const SUPABASE_URL = "https://cagpzvrqtjkuabhqaqon.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QXr8rEnSqOhAZzc_pO_Egw_h-ZYb0nn";
const GATED = new Set(["/app.js", "/supabase-client.js"]);

function deny() {
    return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
}

export async function onRequest(ctx) {
    const url = new URL(ctx.request.url);
    if (!GATED.has(url.pathname)) return ctx.next();

    const m = (ctx.request.headers.get("Cookie") || "").match(/(?:^|;\s*)wos_at=([^;]+)/);
    if (!m) return deny();
    const check = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${m[1]}`, apikey: SUPABASE_ANON_KEY }
    }).catch(() => null);
    if (!check || !check.ok) return deny();

    const res = await ctx.next();
    const out = new Response(res.body, res);
    out.headers.set("Cache-Control", "private, no-store"); // ห้ามแคชกลางทาง ไม่งั้นคนไม่ล็อกอินได้ไฟล์จากแคช
    return out;
}
