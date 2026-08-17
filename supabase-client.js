// ============================================================================
// supabase-client.js
// ตัวเชื่อม Supabase แทนที่ Google Apps Script Web App เดิม
// ต้องโหลดไฟล์นี้ "ก่อน" app.js ใน index.html และโหลด supabase-js CDN ก่อนไฟล์นี้:
//
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script>
//     window.SUPABASE_URL = "https://xxxxxxxx.supabase.co";
//     window.SUPABASE_ANON_KEY = "eyJ...";
//   </script>
//   <script src="supabase-client.js"></script>
//   <script src="app.js"></script>
// ============================================================================

(function () {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.warn("SUPABASE_URL / SUPABASE_ANON_KEY ยังไม่ได้ตั้งค่า — ระบบจะทำงานแบบออฟไลน์เท่านั้น");
        return;
    }

    const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    // Edge Function สำหรับงานที่ต้องใช้ service role / secret key ฝั่งเซิร์ฟเวอร์
    // (สร้าง user ใหม่ + OCR เอกสารด้วย Gemini) — ดู /supabase/functions/*
    const FUNCTIONS_BASE = `${window.SUPABASE_URL}/functions/v1`;

    // -------------------- Field mapping: camelCase (app.js) <-> snake_case (DB) --------------------
    const CUSTOMER_MAP = {
        id: "id", taxId: "tax_id", companyName: "company_name", businessType: "business_type",
        coordinator: "coordinator", phone: "phone", createdAt: "created_at",
        branches: "branches", drive_folder_id: "drive_folder_id", directorId: "director_id"
    };
    const WORKER_MAP = {
        id: "id", employerId: "employer_id", title: "title", nationality: "nationality",
        workerUid: "worker_uid", permitNo: "permit_no", permitExpiry: "permit_expiry",
        firstName: "first_name", lastName: "last_name", dob: "dob",
        passportNo: "passport_no", passportPob: "passport_pob", passportAuth: "passport_auth",
        passportIssue: "passport_issue", passportExpiry: "passport_expiry",
        status: "status", createdAt: "created_at", attachments: "attachments",
        gender: "gender", position: "position", workplace: "workplace", refNo: "ref_no",
        drive_folder_id: "drive_folder_id"
    };
    const JOB_MAP = {
        id: "id", customerId: "customer_id", workerId: "worker_id", jobType: "job_type",
        fee: "fee", status: "status", notes: "notes", createdAt: "created_at"
    };

    function toRow(obj, map) {
        const row = {};
        Object.keys(map).forEach((camel) => {
            if (obj[camel] !== undefined) row[map[camel]] = obj[camel];
        });
        return row;
    }
    function toCamel(row, map) {
        const obj = {};
        Object.keys(map).forEach((camel) => {
            const col = map[camel];
            if (row[col] !== undefined) obj[camel] = row[col];
        });
        return obj;
    }
    function toCamelList(rows, map) {
        return (rows || []).map((r) => toCamel(r, map));
    }

    // -------------------- Auth --------------------
    async function login(email, password) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error || !data.session) {
            return { status: "error", message: error ? error.message : "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
        }
        const { data: profile, error: profErr } = await sb
            .from("profiles")
            .select("name, role, customer_id")
            .eq("id", data.user.id)
            .single();
        if (profErr || !profile) {
            await sb.auth.signOut();
            return { status: "error", message: "ไม่พบสิทธิ์ผู้ใช้งาน (profiles) กรุณาติดต่อผู้ดูแลระบบ" };
        }
        return {
            status: "success",
            user: { email: data.user.email, name: profile.name, role: profile.role, customer_id: profile.customer_id }
        };
    }

    // Supabase Auth redirects a "reset password" email link back here with
    // #access_token=...&type=recovery in the URL hash; supabase-js auto-detects
    // that hash and opens a session (detectSessionInUrl), so app.js must check
    // this *before* falling back to any cached-user localStorage login.
    function isPasswordRecovery() {
        return window.location.hash.indexOf("type=recovery") > -1;
    }

    async function updatePassword(newPassword) {
        const { error } = await sb.auth.updateUser({ password: newPassword });
        if (error) return { status: "error", message: error.message };
        return { status: "success" };
    }

    async function signOut() {
        await sb.auth.signOut();
    }

    async function getAuthHeaders() {
        const { data } = await sb.auth.getSession();
        const token = data && data.session ? data.session.access_token : window.SUPABASE_ANON_KEY;
        return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    }

    // -------------------- getData --------------------
    async function handleGetData() {
        const [customersRes, workersRes, jobsRes, banksRes, lineGroupsRes, profilesRes] = await Promise.all([
            sb.from("customers").select("*"),
            sb.from("workers").select("*"),
            sb.from("jobs").select("*"),
            sb.from("banks").select("*"),
            sb.from("line_groups").select("*"),
            sb.from("profiles").select("name, role, customer_id, id")
        ]);
        // RLS กรองแถวให้อัตโนมัติตาม role/customer_id ของผู้ใช้ที่ล็อกอินอยู่แล้ว
        // (ไม่ต้อง filter ซ้ำฝั่ง client เหมือนโค้ด Code.gs เดิม)
        const firstError = [customersRes, workersRes, jobsRes, banksRes].find((r) => r.error);
        if (firstError) return { status: "error", message: firstError.error.message };

        const customers = toCamelList(customersRes.data, CUSTOMER_MAP);
        const workers = toCamelList(workersRes.data, WORKER_MAP);
        customers.forEach((c) => { c.branches = c.branches || []; });
        workers.forEach((w) => { w.attachments = w.attachments || {}; });

        return {
            status: "success",
            customers,
            workers,
            jobs: toCamelList(jobsRes.data, JOB_MAP),
            banks: banksRes.data || [],
            lineGroups: lineGroupsRes.error ? [] : (lineGroupsRes.data || []),
            users: profilesRes.error ? [] : (profilesRes.data || []).map((p) => ({
                email: p.id, name: p.name, role: p.role, customer_id: p.customer_id
            }))
        };
    }

    // -------------------- generic upsert helper --------------------
    async function upsertOne(table, map, dataObj) {
        const row = toRow(dataObj, map);
        const { data, error } = await sb.from(table).upsert(row, { onConflict: "id" }).select().single();
        if (error) return { status: "error", message: error.message };
        return { status: "success", data: toCamel(data, map) };
    }

    async function deleteRecord(sheetName, id) {
        const table = { Customers: "customers", Workers: "workers", Jobs: "jobs", Line_Groups: "line_groups" }[sheetName];
        if (!table) return { status: "error", message: "Unknown table: " + sheetName };
        const { error } = await sb.from(table).delete().eq("id", id);
        if (error) return { status: "error", message: error.message };
        return { status: "success" };
    }

    // -------------------- File upload (Supabase Storage + OCR edge function) --------------------
    async function uploadFile(fileDataUrl, fileName, customerId, workerId, docType, currentUser) {
        const parts = fileDataUrl.split(",");
        if (parts.length < 2) return { status: "error", message: "invalid file data" };
        const mimeType = parts[0].match(/:(.*?);/)[1];
        const base64Data = parts[1];
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const path = `${customerId || "misc"}/${workerId || "employer"}/${Date.now()}_${fileName}`;
        const { error: upErr } = await sb.storage.from("worker-documents").upload(path, bytes, { contentType: mimeType, upsert: true });
        if (upErr) return { status: "error", message: upErr.message };

        const { data: pub } = sb.storage.from("worker-documents").getPublicUrl(path);
        const fileUrl = pub.publicUrl;

        let parsedData = null;
        if (docType && ["worker-passport", "worker-wp-doc", "worker-visa", "worker-myanmar-id"].includes(docType)) {
            try {
                const headers = await getAuthHeaders();
                const ocrRes = await fetch(`${FUNCTIONS_BASE}/ocr-document`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ base64Data, mimeType, docType })
                });
                const ocrJson = await ocrRes.json();
                if (ocrJson && ocrJson.status === "success") parsedData = ocrJson.parsedData;
            } catch (e) {
                console.warn("OCR call failed:", e);
            }
        }

        return { status: "success", fileUrl, viewUrl: fileUrl, fileId: path, parsedData };
    }

    // -------------------- saveUser (needs service role -> Edge Function) --------------------
    async function saveUser(userData, pin) {
        const headers = await getAuthHeaders();
        const res = await fetch(`${FUNCTIONS_BASE}/create-user`, {
            method: "POST",
            headers,
            body: JSON.stringify({ userData, pin })
        });
        return await res.json();
    }

    // -------------------- Main dispatcher (mirrors old doPost switch in Code.gs) --------------------
    async function callCloudAPI(action, payload) {
        switch (action) {
            case "getData":
                return await handleGetData();
            case "saveCustomer":
                return await upsertOne("customers", CUSTOMER_MAP, payload.customerData);
            case "saveWorker":
                return await upsertOne("workers", WORKER_MAP, payload.workerData);
            case "saveJob":
                return await upsertOne("jobs", JOB_MAP, payload.jobData);
            case "saveLineGroup": {
                const { data, error } = await sb.from("line_groups").upsert(payload.groupData).select().single();
                if (error) return { status: "error", message: error.message };
                return { status: "success", data };
            }
            case "saveUser":
                return await saveUser(payload.userData, payload.pin);
            case "deleteRecord":
                return await deleteRecord(payload.sheetName, payload.id);
            case "deleteRecordByRow":
                // แนวคิด "แถวที่เท่าไหร่" ไม่มีอยู่แล้วใน SQL (ไม่ใช่ชีต) — ใช้ id แทนเสมอ
                return { status: "error", message: "deleteRecordByRow ไม่รองรับแล้วบน Supabase — กรุณาใช้ deleteRecord ด้วย id" };
            default:
                return { status: "error", message: `Action '${action}' not found.` };
        }
    }

    window.supabaseAdapter = {
        login, callCloudAPI, uploadFile, client: sb,
        isPasswordRecovery, updatePassword, signOut
    };
})();
