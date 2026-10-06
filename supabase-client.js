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
        branches: "branches", drive_folder_id: "drive_folder_id", directorId: "director_id",
        attachments: "attachments", shareToken: "share_token", referredByAgentId: "referred_by_agent_id",
        billingNote: "billing_note", deliveryAddress: "delivery_address", requirePrepayment: "require_prepayment",
        certIssueDate: "cert_issue_date", certExpiry: "cert_expiry", status: "status"
    };
    const WORKER_MAP = {
        id: "id", employerId: "employer_id", title: "title", nationality: "nationality",
        workerUid: "worker_uid", permitNo: "permit_no", permitExpiry: "permit_expiry",
        firstName: "first_name", lastName: "last_name", dob: "dob",
        passportNo: "passport_no", passportPob: "passport_pob", passportAuth: "passport_auth",
        passportIssue: "passport_issue", passportExpiry: "passport_expiry",
        status: "status", createdAt: "created_at", attachments: "attachments",
        gender: "gender", position: "position", workplace: "workplace", refNo: "ref_no",
        drive_folder_id: "drive_folder_id", shareToken: "share_token",
        pinkCardNo: "pink_card_no", thaiName: "thai_name", insuranceNo: "insurance_no",
        email: "email", skipNotifyEntry: "skip_notify_entry",
        // มีคอลัมน์ในฐานข้อมูลตั้งแต่ 0001_init แต่ตกหล่นจาก map → รูป/ชื่อพ่อแม่ที่กรอกไม่เคยถูกบันทึก (แก้ 2026-10-02)
        photo: "photo", fatherName: "father_name", motherName: "mother_name", attachmentNames: "attachment_names"
    };
    const JOB_MAP = {
        id: "id", customerId: "customer_id", workerId: "worker_id", jobType: "job_type",
        fee: "fee", status: "status", notes: "notes", createdAt: "created_at",
        // orderNo/batchId/updatedAt: มีอยู่จริงใน schema (0001_init.sql) มาตั้งแต่แรก แต่ map นี้
        // ไม่เคยรวมไว้ ทำให้ค่าพวกนี้ไม่ถูกบันทึก/โหลดจาก Supabase จริง — แก้ให้ตรงกับ schema
        orderNo: "order_no", batchId: "batch_id", updatedAt: "updated_at",
        openedBy: "opened_by", agentId: "agent_id",
        paymentStatus: "payment_status", paymentMethod: "payment_method",
        attachments: "attachments", closedAt: "closed_at", closedBy: "closed_by",
        appointmentDate: "appointment_date", appointmentTime: "appointment_time",
        appointmentNo: "appointment_no", appointmentLocation: "appointment_location",
        appointmentDocUrl: "appointment_doc_url",
        // ระบบบัญชี (20261001082230_accounting_ledger.sql)
        invoiceId: "invoice_id", paidAt: "paid_at", paidBy: "paid_by", govFee: "gov_fee",
        commissionAmount: "commission_amount", commissionPaidAt: "commission_paid_at", commissionExpenseId: "commission_expense_id",
        assignedTo: "assigned_to",
        // งานไม่เรียกเก็บเงิน (20261006090000_job_no_charge.sql)
        noChargeReason: "no_charge_reason", noChargeBy: "no_charge_by", noChargeAt: "no_charge_at"
    };
    const AGENT_MAP = { id: "id", name: "name", phone: "phone", createdAt: "created_at", defaultCommission: "default_commission" };
    const EXPENSE_MAP = {
        id: "id", expenseDate: "expense_date", category: "category", amount: "amount",
        description: "description", paymentMethod: "payment_method", attachment: "attachment",
        createdAt: "created_at", bankId: "bank_id", agentId: "agent_id", jobIds: "job_ids"
    };
    // ระบบบัญชี — บิลทุกใบ / การรับเงิน / ราคามาตรฐาน (ดู 20261001082230_accounting_ledger.sql)
    const INVOICE_MAP = {
        id: "id", invoiceNo: "invoice_no", kind: "kind", customerId: "customer_id", customerName: "customer_name",
        customerAddr: "customer_addr", customerTax: "customer_tax", workerId: "worker_id", workerName: "worker_name",
        jobIds: "job_ids", items: "items", subtotal: "subtotal", grandTotal: "grand_total", govFeeTotal: "gov_fee_total",
        issueDate: "issue_date", dueDateText: "due_date_text", notes: "notes", bankId: "bank_id", status: "status",
        voidReason: "void_reason", voidedAt: "voided_at", voidedBy: "voided_by",
        createdBy: "created_by", createdAt: "created_at", updatedAt: "updated_at"
    };
    const PAYMENT_MAP = {
        id: "id", invoiceId: "invoice_id", receiptNo: "receipt_no", amount: "amount", paidDate: "paid_date",
        method: "method", bankId: "bank_id", proofUrls: "proof_urls", note: "note",
        voided: "voided", voidReason: "void_reason", voidedAt: "voided_at", voidedBy: "voided_by",
        recordedBy: "recorded_by", createdAt: "created_at", receiptId: "receipt_id"
    };
    // ใบเสร็จ = เงินเข้า 1 ก้อน (ตัดได้หลายบิล ส่วนที่เหลือเป็นมัดจำ) — ดู 20261002032303_receipts_and_customer_credit.sql
    const RECEIPT_MAP = {
        id: "id", receiptNo: "receipt_no", customerId: "customer_id", customerName: "customer_name",
        customerAddr: "customer_addr", customerTax: "customer_tax", amount: "amount", paidDate: "paid_date",
        method: "method", bankId: "bank_id", proofUrls: "proof_urls", note: "note",
        voided: "voided", voidReason: "void_reason", voidedAt: "voided_at", voidedBy: "voided_by",
        recordedBy: "recorded_by", createdAt: "created_at"
    };
    const SERVICE_PRICE_MAP = { jobType: "job_type", govFee: "gov_fee", serviceFee: "service_fee", updatedAt: "updated_at", costItems: "cost_items" };
    // numeric ของ Postgres กลับมาเป็นสตริง ("1500.00") — แปลงเป็นตัวเลขให้ app.js คำนวณได้ตรง ๆ
    const num = (v) => (v === null || v === undefined || v === "") ? 0 : Number(v);
    function normalizeNumbers(list, keys) {
        (list || []).forEach((o) => keys.forEach((k) => { if (k in o) o[k] = num(o[k]); }));
        return list;
    }

    const FREE_INVOICE_MAP = {
        id: "id", invoiceNo: "invoice_no", customerId: "customer_id", customerName: "customer_name",
        customerAddr: "customer_addr", customerTax: "customer_tax", workerId: "worker_id",
        workerName: "worker_name", items: "items", subtotal: "subtotal", grandTotal: "grand_total",
        bankId: "bank_id", paymentMethod: "payment_method", paymentStatus: "payment_status",
        paymentProofUrl: "payment_proof_url", dueDateText: "due_date_text", notes: "notes",
        createdBy: "created_by", createdAt: "created_at", updatedAt: "updated_at", paidAt: "paid_at"
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
            .select("name, role, customer_id, theme, ui_layout")
            .eq("id", data.user.id)
            .single();
        if (profErr || !profile) {
            await sb.auth.signOut();
            return { status: "error", message: "ไม่พบสิทธิ์ผู้ใช้งาน (profiles) กรุณาติดต่อผู้ดูแลระบบ" };
        }
        return {
            status: "success",
            user: { id: data.user.id, email: data.user.email, name: profile.name, role: profile.role, customer_id: profile.customer_id, theme: profile.theme || null, uiLayout: profile.ui_layout || null }
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
        const [customersRes, workersRes, jobsRes, banksRes, profilesRes, agentsRes, expensesRes, freeInvoicesRes,
               invoicesRes, paymentsRes, servicePricesRes, receiptsRes, teamRes, settingsRes] = await Promise.all([
            sb.from("customers").select("*"),
            sb.from("workers").select("*"),
            sb.from("jobs").select("*"),
            sb.from("banks").select("*"),
            sb.from("profiles").select("name, role, customer_id, id, theme, ui_layout"),
            sb.from("agents").select("*"),
            sb.from("expenses").select("*"),
            sb.from("free_invoices").select("*"),
            sb.from("invoices").select("*"),
            sb.from("payments").select("*"),
            sb.from("service_prices").select("*"),
            sb.from("receipts").select("*"),
            sb.rpc("list_team"),
            sb.from("app_settings").select("key, value")
        ]);
        // RLS กรองแถวให้อัตโนมัติตาม role/customer_id ของผู้ใช้ที่ล็อกอินอยู่แล้ว
        // (ไม่ต้อง filter ซ้ำฝั่ง client เหมือนโค้ด Code.gs เดิม)
        const firstError = [customersRes, workersRes, jobsRes, banksRes].find((r) => r.error);
        if (firstError) return { status: "error", message: firstError.error.message };

        const customers = toCamelList(customersRes.data, CUSTOMER_MAP);
        const workers = toCamelList(workersRes.data, WORKER_MAP);
        // โน้ตจากนายจ้าง: อ่านอย่างเดียว (ไม่อยู่ใน WORKER_MAP → ฟอร์มคนงานไม่เขียนทับ) — เขียนผ่าน set_my_worker_note() เท่านั้น
        (workersRes.data || []).forEach((row, i) => { workers[i].clientNote = row.client_note || ""; workers[i].clientNoteUpdatedAt = row.client_note_updated_at || null; });
        const jobs = toCamelList(jobsRes.data, JOB_MAP);
        customers.forEach((c) => { c.branches = c.branches || []; });
        workers.forEach((w) => { w.attachments = w.attachments || {}; });
        jobs.forEach((j) => { j.attachments = j.attachments || []; });

        normalizeNumbers(jobs, ["fee", "govFee", "commissionAmount"]);

        return {
            status: "success",
            customers,
            workers,
            jobs,
            banks: normalizeNumbers(toCamelList(banksRes.data, BANK_MAP), ["openingBalance"]),
            agents: agentsRes.error ? [] : normalizeNumbers(toCamelList(agentsRes.data, AGENT_MAP), ["defaultCommission"]),
            expenses: expensesRes.error ? [] : normalizeNumbers(toCamelList(expensesRes.data, EXPENSE_MAP), ["amount"]),
            invoices: invoicesRes.error ? [] : normalizeNumbers(toCamelList(invoicesRes.data, INVOICE_MAP), ["subtotal", "grandTotal", "govFeeTotal"]),
            payments: paymentsRes.error ? [] : normalizeNumbers(toCamelList(paymentsRes.data, PAYMENT_MAP), ["amount"]),
            receipts: receiptsRes.error ? [] : normalizeNumbers(toCamelList(receiptsRes.data, RECEIPT_MAP), ["amount"]),
            // ทีมงานภายใน (ชื่อ+ตำแหน่ง) สำหรับเลือก/แสดงผู้รับผิดชอบใบงาน — profiles อ่านได้เฉพาะแถวตัวเองถ้าไม่ใช่ admin
            team: teamRes.error ? [] : (teamRes.data || []),
            // ค่าตั้งค่ากลาง { key: value } เช่น cash_card_order
            settings: settingsRes.error ? {} : Object.fromEntries((settingsRes.data || []).map((r) => [r.key, r.value])),
            servicePrices: servicePricesRes.error ? [] : normalizeNumbers(toCamelList(servicePricesRes.data, SERVICE_PRICE_MAP), ["govFee", "serviceFee"]),
            freeInvoices: freeInvoicesRes.error ? [] : toCamelList(freeInvoicesRes.data, FREE_INVOICE_MAP),
            users: profilesRes.error ? [] : (profilesRes.data || []).map((p) => ({
                id: p.id, email: p.id, name: p.name, role: p.role, customer_id: p.customer_id, theme: p.theme || null, uiLayout: p.ui_layout || null
            }))
        };
    }

    // -------------------- generic upsert helper --------------------
    async function upsertOne(table, map, dataObj, conflictColumn = "id") {
        const row = toRow(dataObj, map);
        const { data, error } = await sb.from(table).upsert(row, { onConflict: conflictColumn }).select().single();
        if (error) return { status: "error", message: error.message };
        return { status: "success", data: toCamel(data, map) };
    }

    // Banks: bank_name/account_name/account_number/prompt_pay_id/qr_image
    const BANK_MAP = {
        id: "id", bankName: "bank_name", accountName: "account_name",
        accountNumber: "account_number", promptPayId: "prompt_pay_id", qrImage: "qr_image",
        openingBalance: "opening_balance", openingDate: "opening_date", sortOrder: "sort_order"
    };

    // ลบสำเร็จ (ไม่ error) แต่แถวไม่ตรงกับ RLS/id ที่ให้มา ก็จะลบได้ 0 แถวโดยไม่ error เลย (ดูเหมือนสำเร็จ
    // ทั้งที่ไม่มีอะไรถูกลบจริง) — ขอ count กลับมาด้วยเสมอ แล้วถือว่า error ถ้าไม่มีแถวไหนถูกลบจริง
    async function deleteRecord(sheetName, id) {
        const table = { Customers: "customers", Workers: "workers", Jobs: "jobs", Agents: "agents", Banks: "banks", Expenses: "expenses", FreeInvoices: "free_invoices" }[sheetName];
        if (!table) return { status: "error", message: "Unknown table: " + sheetName };
        const { error, count } = await sb.from(table).delete({ count: "exact" }).eq("id", id);
        if (error) return { status: "error", message: error.message };
        if (!count) return { status: "error", message: "ไม่พบข้อมูลที่จะลบ หรือไม่มีสิทธิ์ลบรายการนี้ (0 แถวถูกลบ)" };
        return { status: "success" };
    }

    // Supabase Storage object keys ต้องเป็นอักขระปลอดภัยเท่านั้น (ไม่รองรับภาษาไทย/ยูนิโค้ดอื่นๆ
    // โดยตรง — อัปโหลดจะพังด้วย "Invalid key" ถ้าชื่อไฟล์มีอักขระเหล่านี้ เช่น ชื่อบริษัทภาษาไทย)
    // ชื่อที่ผู้ใช้เห็น (fItem.name ที่เก็บใน attachments) ยังคงเป็นภาษาไทยได้ตามปกติ อันนี้สะอาดแค่ path จริงบน Storage
    function sanitizeStorageFileName(name) {
        const cleaned = (name || "file").replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/_+/g, "_");
        return cleaned.slice(0, 150) || "file";
    }

    // -------------------- OCR (edge function ocr-document) --------------------
    // ต้องตรงกับ ALLOWED_DOC_TYPES ใน supabase/functions/ocr-document/index.ts
    const OCR_DOC_TYPES = ["worker-passport", "worker-wp-doc", "worker-visa", "worker-myanmar-id", "worker-pink-card", "worker-insurance-doc", "worker-receipt", "cust-id-card", "cust-cert", "expense-slip", "payment-slip", "job-appointment", "worker-auto"];

    // คืน { parsedData, ocrError } — ocrError: null (สำเร็จ) / "busy" (Gemini ไม่ว่าง/โควตาหมด) / "failed"
    // เอกสารคนงาน: อ่าน QR ของกรมการจัดหางานคู่ไปกับ AI — ถ้าเจอ ข้อมูลจากกรมทับค่าที่ AI อ่าน (แม่นกว่า)
    // และถ้า AI อ่านไม่สำเร็จแต่ QR ได้ข้อมูล ก็ถือว่าอ่านสำเร็จ ไม่ต้องให้ผู้ใช้แนบใหม่
    async function callOcr(base64Data, mimeType, docType) {
        const [ocr, ewp] = await Promise.all([
            callGeminiOcr(base64Data, mimeType, docType),
            EWP_QR_DOC_TYPES.includes(docType) ? lookupEwpFromFile(base64Data, mimeType) : null
        ]);
        if (!ewp) return ocr;
        const parsedData = { ...(ocr.parsedData || {}), ...ewpCardToParsedData(ewp.card, ewp.ref) };
        // Bulk Import: AI จำแนกประเภทไม่ได้ — QR นี้มีบนใบอนุญาตทำงานเท่านั้น
        if (docType === "worker-auto" && !parsedData.documentType) parsedData.documentType = "worker-wp-doc";
        return { parsedData, ocrError: null };
    }

    // -------------------- QR ใบอนุญาตทำงาน (e-WorkPermit กรมการจัดหางาน, edge function ewp-qrcheck) --------------------
    const EWP_QR_DOC_TYPES = ["worker-wp-doc", "worker-pink-card", "worker-receipt", "worker-passport", "worker-auto"];
    const EWP_QR_REF_RE = /qrcheck\/ref\?(?:ref_no=)?(\d{8,25})/;
    const QR_MAX_DIM = 2000; // ย่อรูปใหญ่ก่อนหา QR — jsQR ช้ามากกับรูปจากกล้องมือถือเต็มขนาด

    // คืน { ref, card } ถ้าในไฟล์มี QR ของ e-WorkPermit และดึงข้อมูลจากกรมได้ ไม่งั้นคืน null (ไม่ throw — ไม่ให้กระทบการอ่านด้วย AI)
    async function lookupEwpFromFile(base64Data, mimeType) {
        try {
            if (typeof jsQR !== "function") return null;
            const ref = await findEwpQrRef(base64Data, mimeType);
            if (!ref) return null;
            const headers = await getAuthHeaders();
            const res = await fetch(`${FUNCTIONS_BASE}/ewp-qrcheck`, { method: "POST", headers, body: JSON.stringify({ ref }) });
            const json = await res.json();
            if (json && json.status === "success" && json.card && json.card.card_document_no) return { ref, card: json.card };
            console.warn("e-WorkPermit lookup failed:", json && json.message);
        } catch (e) {
            console.warn("e-WorkPermit QR lookup failed:", e);
        }
        return null;
    }

    async function findEwpQrRef(base64Data, mimeType) {
        const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const matchRef = text => { const m = text && text.match(EWP_QR_REF_RE); return m ? m[1] : null; };
        const isPdf = mimeType === "application/pdf";
        // PDF: ลองรูป JPEG ที่ฝังอยู่ก่อน (เร็ว — ไฟล์สแกน/รูปถ่ายที่แปลงเป็น PDF)
        const blobs = isPdf
            ? extractPdfJpegs(bytes).map(b => new Blob([b], { type: "image/jpeg" }))
            : mimeType.startsWith("image/") ? [new Blob([bytes], { type: mimeType })] : [];
        for (const blob of blobs) {
            const ref = matchRef(await decodeQrFromBlob(blob));
            if (ref) return ref;
        }
        // ไม่เจอ: PDF ส่วนใหญ่ที่แนบใบอนุญาตทำงาน (ไฟล์จากระบบกรม/สแกนเนอร์) เก็บภาพแบบอื่นหรือวาด QR เป็นเวกเตอร์
        // — ให้ pdf.js วาดทั้งหน้าเป็นภาพแล้วหา QR แทน
        return isPdf ? await findQrInRenderedPdf(bytes, matchRef) : null;
    }

    const PDF_QR_MAX_PAGES = 3;
    const PDF_QR_RENDER_DIMS = [2000, 3500]; // QR บนบัตรที่สแกนลง A4 มีขนาดเล็ก — ไม่เจอที่ขนาดแรก ลองวาดใหญ่ขึ้นอีกรอบ

    async function findQrInRenderedPdf(bytes, matchRef) {
        if (!window.pdfjsLib) return null;
        try {
            // pdf.js ย้าย buffer ที่ส่งเข้าไปให้ worker — ส่งสำเนา ไม่ให้ bytes เดิมใช้ไม่ได้
            const pdf = await window.pdfjsLib.getDocument({ data: bytes.slice() }).promise;
            for (let p = 1; p <= Math.min(pdf.numPages, PDF_QR_MAX_PAGES); p++) {
                const page = await pdf.getPage(p);
                const base = page.getViewport({ scale: 1 });
                for (const dim of PDF_QR_RENDER_DIMS) {
                    const viewport = page.getViewport({ scale: dim / Math.max(base.width, base.height) });
                    const canvas = document.createElement("canvas");
                    canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
                    const ctx = canvas.getContext("2d", { willReadFrequently: true });
                    await page.render({ canvasContext: ctx, viewport }).promise;
                    const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
                    const ref = matchRef(code && code.data);
                    if (ref) return ref;
                }
            }
        } catch (e) {
            console.warn("PDF QR render failed:", e);
        }
        return null;
    }

    function extractPdfJpegs(bytes) {
        const out = [];
        const findSeq = (seq, from) => {
            outer: for (let i = from; i <= bytes.length - seq.length; i++) {
                for (let k = 0; k < seq.length; k++) if (bytes[i + k] !== seq[k]) continue outer;
                return i;
            }
            return -1;
        };
        const ENDSTREAM = Array.from("endstream", c => c.charCodeAt(0));
        let i = 0;
        while ((i = findSeq([0xFF, 0xD8, 0xFF], i)) >= 0) {
            const end = findSeq(ENDSTREAM, i);
            if (end < 0) break;
            out.push(bytes.subarray(i, end));
            i = end;
        }
        return out;
    }

    async function decodeQrFromBlob(blob) {
        try {
            const bmp = await createImageBitmap(blob);
            const scale = Math.min(1, QR_MAX_DIM / Math.max(bmp.width, bmp.height));
            // ลองขนาดย่อก่อน (เร็ว) ถ้าไม่เจอและรูปถูกย่อไว้ ลองขนาดจริงอีกรอบ เผื่อ QR เล็กในรูปใหญ่
            for (const s of scale < 1 ? [scale, 1] : [1]) {
                const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
                const canvas = document.createElement("canvas");
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                ctx.drawImage(bmp, 0, 0, w, h);
                const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "attemptBoth" });
                if (code && code.data) return code.data;
            }
        } catch (e) {
            console.warn("QR decode failed:", e);
        }
        return null;
    }

    const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const pad2 = n => String(n).padStart(2, "0");

    // "13 กุมภาพันธ์ 2570" -> "13/02/2027" (ปี พ.ศ. -> ค.ศ.)
    function ewpThaiDateToDmy(s) {
        const m = String(s || "").trim().match(/^(\d{1,2})\s+(\S+)\s+(\d{4})$/);
        const month = m ? THAI_MONTHS.indexOf(m[2]) + 1 : 0;
        if (!month) return undefined;
        const year = Number(m[3]) > 2400 ? Number(m[3]) - 543 : Number(m[3]);
        return `${pad2(m[1])}/${pad2(month)}/${year}`;
    }

    // "20291220" -> "20/12/2029"
    function ewpCompactDateToDmy(s) {
        const m = String(s || "").match(/^(\d{4})(\d{2})(\d{2})$/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : undefined;
    }

    function ewpNationality(en) {
        const n = String(en || "").toLowerCase();
        if (n.includes("myanmar") || n.includes("burm")) return "Myanmar";
        if (n.includes("cambod")) return "Cambodia";
        if (n.includes("lao")) return "Laos";
        return undefined;
    }

    // แปลงผลจากกรมเป็นรูปแบบเดียวกับผล AI (ocr-document) เพื่อใช้ฟังก์ชันเติมข้อมูลเดิมได้ + เก็บข้อมูลดิบไว้ที่ .ewp
    // ใส่เฉพาะช่องที่มีค่า — ช่องที่กรมไม่ส่งมา จะไม่ทับค่าที่ AI อ่านได้
    function ewpCardToParsedData(card, ref) {
        const TITLE_RE = /^(นางสาว|นาง|นาย|เด็กชาย|เด็กหญิง)\s*/;
        const thFull = String(card.fullname_th || "").trim();
        const titleMatch = thFull.match(TITLE_RE);
        const enFull = String(card.fullname_en || "").replace(/^(mrs|miss|ms|mr)\.?\s+/i, "").trim();
        const nationality = ewpNationality(card.nationality_en);
        // เอกสารเข้าเมือง: Passport หรือ CI — ช่องในระบบเป็น "เลขที่เล่ม Passport / CI" ใช้ร่วมกัน
        const isPassport = /passport|\bCI\b|certificate of identity/i.test(card.document_type_en || "") ||
            /หนังสือเดินทาง|เอกสารรับรองบุคคล/.test(card.document_type || "");
        // ชื่อ: ใช้ช่อง first/last ที่กรมแยกมาให้ถ้ามี ไม่งั้นใช้ชื่อเต็มเป็นชื่อเดียว (กฎเดียวกับ AI: ไม่แน่ใจ = ไม่แยก)
        const firstName = card.first_name ? String(card.first_name).trim() : enFull;
        const lastName = card.first_name && nationality !== "Myanmar" ? String(card.last_name || "").trim() : "";
        const d = {
            uid: card.alien_no,
            permitNo: card.card_document_no,
            permitExpiry: ewpThaiDateToDmy(card.expired_time),
            dob: ewpThaiDateToDmy(card.date_of_birth),
            nationality,
            position: card.working_type,
            firstName: nationality === "Myanmar" ? `${firstName} ${lastName}`.trim() : firstName,
            lastName,
            thaiName: titleMatch ? thFull.slice(titleMatch[0].length).trim() : thFull,
            title: titleMatch ? titleMatch[1] : undefined,
            passportNo: isPassport ? card.document_no : undefined,
            passportIssue: isPassport ? ewpCompactDateToDmy(card.document_issue_date) : undefined,
            passportExpiry: isPassport ? ewpCompactDateToDmy(card.document_expiry_date) : undefined
        };
        Object.keys(d).forEach(k => { if (d[k] === undefined || d[k] === null || d[k] === "") delete d[k]; });
        d.ewp = {
            ref,
            statusId: card.wp_status_id,
            statusName: card.wp_status_name || "",
            statusDesc: card.wp_status_desc || "",
            employers: (card.employer_list || []).map(e => String(e.company_name || "").replace(/\s+/g, " ").trim()).filter(Boolean)
        };
        return d;
    }

    async function callGeminiOcr(base64Data, mimeType, docType) {
        try {
            const headers = await getAuthHeaders();
            const ocrRes = await fetch(`${FUNCTIONS_BASE}/ocr-document`, {
                method: "POST",
                headers,
                body: JSON.stringify({ base64Data, mimeType, docType })
            });
            const ocrJson = await ocrRes.json();
            if (ocrJson && ocrJson.status === "success" && ocrJson.parsedData) return { parsedData: ocrJson.parsedData, ocrError: null };
            return { parsedData: null, ocrError: ocrJson && ocrJson.ocrError === "busy" ? "busy" : "failed" };
        } catch (e) {
            console.warn("OCR call failed:", e);
            return { parsedData: null, ocrError: "failed" };
        }
    }

    // ให้ AI อ่านเอกสารอย่างเดียว ไม่อัปโหลดไฟล์ — ใช้ใน Bulk Import ขั้น "ให้ AI อ่านและจับคู่" (ไฟล์ยังไม่ถูกเก็บจนกดนำเข้า)
    async function ocrDocument(fileDataUrl, docType) {
        const parts = fileDataUrl.split(",");
        if (parts.length < 2) return { parsedData: null, ocrError: "failed" };
        const mimeType = parts[0].match(/:(.*?);/)[1];
        return callOcr(parts[1], mimeType, docType);
    }

    // -------------------- File upload (Supabase Storage + OCR edge function) --------------------
    // options.skipOcr = ผู้ใช้เลือก "บันทึกไฟล์ กรอกเอง" หลัง AI อ่านไม่สำเร็จ — อัปโหลดเลยโดยไม่เรียก AI ซ้ำ
    async function uploadFile(fileDataUrl, fileName, customerId, workerId, docType, currentUser, options = {}) {
        const parts = fileDataUrl.split(",");
        if (parts.length < 2) return { status: "error", message: "invalid file data" };
        const mimeType = parts[0].match(/:(.*?);/)[1];
        const base64Data = parts[1];
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        // ให้ AI อ่านก่อนอัปโหลด — เอกสารประเภทที่ใช้ AI ถ้าอ่านไม่สำเร็จ (Gemini ไม่ว่าง/อ่านไม่ได้) จะไม่เก็บไฟล์เลย
        // ให้ผู้ใช้แนบใหม่ทีหลัง แทนที่จะมีไฟล์ค้างในระบบแล้วแนบซ้ำจนไฟล์ซ้ำซ้อน
        let parsedData = null;
        const ocrAttempted = !options.skipOcr && OCR_DOC_TYPES.includes(docType);
        if (ocrAttempted) {
            const ocr = await callOcr(base64Data, mimeType, docType);
            if (!ocr.parsedData) {
                return { status: "error", aiRejected: true, ocrError: ocr.ocrError, message: "AI อ่านเอกสารไม่สำเร็จ ยังไม่ได้บันทึกไฟล์" };
            }
            parsedData = ocr.parsedData;
        }

        const path = `${customerId || "misc"}/${workerId || "employer"}/${Date.now()}_${sanitizeStorageFileName(fileName)}`;
        const { error: upErr } = await sb.storage.from("worker-documents").upload(path, bytes, { contentType: mimeType, upsert: true });
        if (upErr) return { status: "error", message: upErr.message };

        const { data: pub } = sb.storage.from("worker-documents").getPublicUrl(path);
        const fileUrl = pub.publicUrl;

        return { status: "success", fileUrl, viewUrl: fileUrl, fileId: path, parsedData, ocrAttempted };
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

    // -------------------- deleteUser (needs service role -> Edge Function) --------------------
    async function deleteUserAccount(userId, pin) {
        const headers = await getAuthHeaders();
        const res = await fetch(`${FUNCTIONS_BASE}/delete-user`, {
            method: "POST",
            headers,
            body: JSON.stringify({ userId, pin })
        });
        return await res.json();
    }

    // -------------------- manageUser (list/set_password/change_email/suspend/unsuspend → Edge Function manage-user) --------------------
    async function manageUser(payload) {
        const headers = await getAuthHeaders();
        const res = await fetch(`${FUNCTIONS_BASE}/manage-user`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });
        return await res.json();
    }

    // -------------------- updateUserProfile (name/role/customer_id เท่านั้น — RLS อนุญาต admin แก้ profiles ได้ตรงๆ ไม่ต้องใช้ service role) --------------------
    async function updateUserProfile(userId, profileData) {
        const { error } = await sb.from("profiles").update({
            name: profileData.name,
            role: profileData.role,
            customer_id: profileData.customer_id || null
        }).eq("id", userId);
        if (error) return { status: "error", message: error.message };
        return { status: "success" };
    }

    // -------------------- Main dispatcher (mirrors old doPost switch in Code.gs) --------------------
    async function callCloudAPI(action, payload) {
        switch (action) {
            case "getData":
                return await handleGetData();
            case "saveCustomer":
                return await upsertOne("customers", CUSTOMER_MAP, payload.customerData);
            case "saveWorker": {
                // worker_uid เป็น unique — ค่าว่าง "" ซ้ำกันได้แค่แถวเดียว แต่ NULL ซ้ำกันได้ไม่จำกัด
                // คนงานที่ยังไม่มีเลขประจำตัวจึงต้องบันทึกเป็น NULL ไม่งั้นแก้ไขคนที่สองจะชน "workers_worker_uid_key"
                const workerData = { ...payload.workerData };
                if (workerData.workerUid !== undefined) workerData.workerUid = String(workerData.workerUid || "").trim() || null;
                const res = await upsertOne("workers", WORKER_MAP, workerData);
                if (res.status === "error" && /workers_worker_uid_key/.test(res.message)) {
                    res.message = `เลขประจำตัวคนต่างด้าว ${workerData.workerUid} มีอยู่แล้วในคนงานรายอื่น กรุณาตรวจสอบเลขอีกครั้ง`;
                }
                return res;
            }
            case "bulkSetWorkerStatus": {
                // RLS กรองแถวที่ไม่มีสิทธิ์ทิ้งเงียบๆ (ไม่ error) — คืน id ที่อัปเดตได้จริงให้ app.js เทียบเอง
                const { data, error } = await sb.from("workers").update({ status: payload.status }).in("id", payload.ids).select("id");
                if (error) return { status: "error", message: error.message };
                return { status: "success", updatedIds: (data || []).map(r => r.id) };
            }
            case "saveJob":
                return await upsertOne("jobs", JOB_MAP, payload.jobData);
            case "saveAgent":
                return await upsertOne("agents", AGENT_MAP, payload.agentData);
            case "saveBank":
                return await upsertOne("banks", BANK_MAP, payload.bankData);
            case "saveExpense":
                return await upsertOne("expenses", EXPENSE_MAP, payload.expenseData);
            case "saveFreeInvoice":
                return await upsertOne("free_invoices", FREE_INVOICE_MAP, payload.invoiceData);
            case "nextDocNo": {
                // เลขที่เอกสารเรียงต่อเนื่องรายปี พ.ศ. ออกจากฐานข้อมูลแบบ atomic (กดพร้อมกันหลายเครื่องก็ไม่ซ้ำ)
                const { data, error } = await sb.rpc("next_doc_no", { p_prefix: payload.prefix });
                if (error) return { status: "error", message: error.message };
                return { status: "success", docNo: data };
            }
            case "saveInvoice":
                return await upsertOne("invoices", INVOICE_MAP, payload.invoiceData);
            case "savePayment":
                return await upsertOne("payments", PAYMENT_MAP, payload.paymentData);
            case "saveSetting": {
                const { error } = await sb.from("app_settings")
                    .upsert({ key: payload.key, value: payload.value, updated_at: new Date().toISOString() }, { onConflict: "key" });
                if (error) return { status: "error", message: error.message };
                return { status: "success" };
            }
            case "reorderBanks": {
                // ลากสลับลำดับบัญชี — อัปเดตเฉพาะ sort_order (update ไม่ใช่ upsert เพื่อไม่ต้องส่งคอลัมน์อื่น)
                for (const { id, sortOrder } of payload.order || []) {
                    const { error } = await sb.from("banks").update({ sort_order: sortOrder }).eq("id", id);
                    if (error) return { status: "error", message: error.message };
                }
                return { status: "success" };
            }
            case "setMyWorkerNote": {
                // บัญชีนายจ้างเขียนโน้ตให้คนงานของตัวเอง — ดู 20261002102002_worker_client_note.sql
                const { error } = await sb.rpc("set_my_worker_note", { p_worker_id: payload.workerId, p_note: payload.note || "" });
                if (error) return { status: "error", message: error.message };
                return { status: "success" };
            }
            case "setMyUiLayout": {
                // การจัดหน้าวิดเจ็ต (ลำดับ/ขนาด) ของแถวตัวเอง — ดู 20261002082104_profile_ui_layout.sql
                const { error } = await sb.rpc("set_my_ui_layout", { p_layout: payload.layout });
                if (error) return { status: "error", message: error.message };
                return { status: "success" };
            }
            case "setMyTheme": {
                // แก้ได้เฉพาะธีมของแถวตัวเอง (profiles อื่น ๆ แก้ได้แค่ admin) — ดู 20261002035144_profile_theme.sql
                const { error } = await sb.rpc("set_my_theme", { p_theme: payload.theme });
                if (error) return { status: "error", message: error.message };
                return { status: "success" };
            }
            case "saveReceipt":
                return await upsertOne("receipts", RECEIPT_MAP, payload.receiptData);
            case "saveServicePrice":
                return await upsertOne("service_prices", SERVICE_PRICE_MAP, payload.priceData, "job_type");
            case "deleteServicePrice": {
                const { error } = await sb.from("service_prices").delete().eq("job_type", payload.jobType);
                if (error) return { status: "error", message: error.message };
                return { status: "success" };
            }
            case "saveUser":
                return await saveUser(payload.userData, payload.pin);
            case "updateUserProfile":
                return await updateUserProfile(payload.userId, payload.profileData);
            case "manageUser":
                return await manageUser(payload);
            case "deleteUser":
                return await deleteUserAccount(payload.userId, payload.pin);
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
        login, callCloudAPI, uploadFile, ocrDocument, client: sb,
        isPasswordRecovery, updatePassword, signOut
    };
})();
