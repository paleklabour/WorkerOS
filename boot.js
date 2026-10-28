// ============================================================================
// boot.js — ตัวเปิดระบบที่คนยังไม่ล็อกอินโหลดได้ (owner 2026-10-28: ไม่ให้คนนอกได้โค้ดระบบ)
// หน้าล็อกอินใช้แค่ไฟล์นี้; supabase-client.js + app.js โหลดหลังมีเซสชันแล้วเท่านั้น
// บน Cloudflare Pages ไฟล์สองตัวนั้นถูกกันด้วย functions/_middleware.js (ต้องมีคุกกี้ wos_at = access token ที่ Supabase ยืนยันได้)
// ============================================================================
(function () {
    var ver = new URL(document.currentScript.src).searchParams.get("v") || "";
    // ลิงก์ตั้งรหัสผ่านใหม่จากอีเมล — supabase-js อ่าน hash แล้วอาจล้างทิ้ง จึงจำไว้ก่อน (isPasswordRecovery ใน supabase-client.js)
    window.__bootRecovery = window.location.hash.indexOf("type=recovery") > -1;
    var sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    window.__bootSb = sb; // supabase-client.js ใช้ client ตัวนี้ต่อ (ไม่สร้างซ้ำ)

    function setTokenCookie(session) {
        var secure = location.protocol === "https:" ? "; Secure" : "";
        if (!session) { document.cookie = "wos_at=; Path=/; Max-Age=0; SameSite=Strict" + secure; return; }
        var left = session.expires_at ? session.expires_at - Math.floor(Date.now() / 1000) : 3600;
        document.cookie = "wos_at=" + session.access_token + "; Path=/; Max-Age=" + Math.max(60, left) + "; SameSite=Strict" + secure;
    }
    sb.auth.onAuthStateChange(function (_ev, session) { setTokenCookie(session); });

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement("script");
            s.src = src + (ver ? "?v=" + ver : "");
            s.onload = resolve;
            s.onerror = function () { reject(new Error(src)); };
            document.body.appendChild(s);
        });
    }

    function hideSplash() {
        var splash = document.getElementById("app-splash");
        if (!splash) return;
        splash.classList.add("is-done");
        setTimeout(function () { splash.remove(); }, 400);
    }

    var loading = null;
    function loadApp() {
        if (loading) return loading;
        loading = loadScript("supabase-client.js").then(function () { return loadScript("app.js"); }).then(function () {
            var form = document.getElementById("login-form");
            if (form) form.removeEventListener("submit", bootLogin); // ต่อจากนี้ handleLogin ใน app.js รับช่วง
            // app.js ผูกงานเริ่มต้นไว้กับ DOMContentLoaded ซึ่งผ่านไปแล้ว — ยิงซ้ำให้ทำงาน
            document.dispatchEvent(new Event("DOMContentLoaded"));
        });
        return loading;
    }

    function showError(msg) {
        var el = document.getElementById("login-error");
        if (!el) return;
        el.style.display = msg ? "block" : "none";
        if (msg) el.innerText = msg;
    }

    async function bootLogin(e) {
        e.preventDefault();
        var btn = document.getElementById("btn-login");
        var email = document.getElementById("login-username").value.trim();
        var password = document.getElementById("login-password").value;
        if (btn) { btn.disabled = true; btn.innerHTML = "<span>กำลังเข้าสู่ระบบ...</span>"; }
        try {
            var res = await sb.auth.signInWithPassword({ email: email, password: password });
            if (res.error || !res.data.session) { showError("อีเมลหรือรหัสผ่านไม่ถูกต้อง"); return; }
            showError("");
            setTokenCookie(res.data.session);
            window.__bootFreshLogin = true; // app.js ดึงสิทธิ์ผู้ใช้ต่อเอง (finishLogin)
            await loadApp();
        } catch (err) {
            console.error("boot login:", err);
            showError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่");
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = "<span>เข้าสู่ระบบ</span>"; }
        }
    }

    async function start() {
        var form = document.getElementById("login-form");
        if (form) form.addEventListener("submit", bootLogin);
        var session = null;
        try { session = (await sb.auth.getSession()).data.session; } catch (e) { /* ไม่มีเน็ต = ให้ล็อกอิน */ }
        if (session) {
            setTokenCookie(session);
            try { await loadApp(); return; } catch (e) { console.error("load app:", e); }
        }
        try { localStorage.removeItem("mw_current_user"); } catch (e) {}
        hideSplash();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
})();
