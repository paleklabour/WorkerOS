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
        certIssueDate: "cert_issue_date", certExpiry: "cert_expiry", status: "status",
        email: "email", driveShare: "drive_share", // แชร์โฟลเดอร์สำรองใน Google Drive ให้ลูกค้า (drive-backup)
        unlockUnpaidJobDocs: "unlock_unpaid_job_docs", // พอร์ทัล: ให้ดาวน์โหลดเอกสารปิดงานได้แม้ยังไม่ชำระ (20261009030430)
        services: "services" // บริการที่นายจ้างใช้กับเรา → ไฮไลต์เขียวในฟอร์มเปิดใบงาน (20261029041358)
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
        photo: "photo", fatherName: "father_name", motherName: "mother_name", attachmentNames: "attachment_names",
        // ฐานข้อมูลรอขึ้นทะเบียน (20261020092027_registration_pool.sql)
        registrationRoundId: "registration_round_id", submittedByClient: "submitted_by_client"
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
        noChargeReason: "no_charge_reason", noChargeBy: "no_charge_by", noChargeAt: "no_charge_at",
        // หมายเหตุสั้น ≤ 100 ตัวอักษร (20261006140000_job_remark.sql, 20261029032800_job_remark_100.sql)
        remark: "remark", tag: "tag", openedAt: "opened_at",
        // นายจ้างแจ้งออกเองจากพอร์ทัล (20261021040847_client_exit_requests.sql)
        openedByClient: "opened_by_client"
    };
    // ช่องการเงินของใบงาน — saveJob เขียนลงแถวที่มีอยู่แล้วเฉพาะเมื่อส่ง { billing: true } มา
    const JOB_BILLING_COLS = ["invoice_id", "payment_status", "payment_method", "paid_at", "paid_by", "fee", "gov_fee",
        "commission_amount", "commission_paid_at", "commission_expense_id", "no_charge_reason", "no_charge_by", "no_charge_at"];
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
        createdBy: "created_by", createdAt: "created_at", updatedAt: "updated_at",
        shareToken: "share_token" // ลิงก์ใบวางบิลให้ลูกค้า (invoice.html + Edge Function share-invoice)
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
    // โอนระหว่างบัญชีของบริษัท + บรรทัด statement ธนาคาร — ดู 20261027090000_account_transfers_statements.sql
    const TRANSFER_MAP = {
        id: "id", transferDate: "transfer_date", fromAccount: "from_account", toAccount: "to_account",
        amount: "amount", note: "note", createdBy: "created_by", createdAt: "created_at"
    };
    const STATEMENT_LINE_MAP = {
        id: "id", bankId: "bank_id", lineDate: "line_date", description: "description", amount: "amount", balance: "balance",
        matchKind: "match_kind", matchId: "match_id", note: "note", importedBy: "imported_by", createdAt: "created_at"
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
            .select("name, role, customer_id, theme, avatar_url")
            .eq("id", data.user.id)
            .single();
        if (profErr || !profile) {
            await sb.auth.signOut();
            return { status: "error", message: "ไม่พบสิทธิ์ผู้ใช้งาน (profiles) กรุณาติดต่อผู้ดูแลระบบ" };
        }
        return {
            status: "success",
            user: { id: data.user.id, email: data.user.email, name: profile.name, role: profile.role, customer_id: profile.customer_id, theme: profile.theme || null, avatarUrl: profile.avatar_url || null }
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

    // มีเซสชัน Supabase จริงไหม (ผู้ใช้ที่จำไว้ใน localStorage อาจค้างอยู่ทั้งที่เซสชันหลุดแล้ว — บันทึกจะโดนปฏิเสธเงียบๆ)
    async function hasSession() {
        try { const { data } = await sb.auth.getSession(); return !!(data && data.session); } catch (e) { return true; }
    }

    async function getAuthHeaders() {
        const { data } = await sb.auth.getSession();
        const token = data && data.session ? data.session.access_token : window.SUPABASE_ANON_KEY;
        return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    }

    // ดึงทั้งตารางทีละ 1000 แถวจนครบ (PostgREST คืนได้ครั้งละไม่เกิน 1000) — คืนรูปแบบเดียวกับ query ปกติ { data, error }
    async function selectAllRows(table) {
        const out = [];
        for (let from = 0; ; from += 1000) {
            const { data, error } = await sb.from(table).select("*").order("id").range(from, from + 999);
            if (error) return { data: null, error };
            out.push(...(data || []));
            if (!data || data.length < 1000) return { data: out, error: null };
        }
    }

    // -------------------- getData --------------------
    async function handleGetData() {
        const [customersRes, workersRes, jobsRes, banksRes, profilesRes, agentsRes, expensesRes, freeInvoicesRes,
               invoicesRes, paymentsRes, servicePricesRes, receiptsRes, teamRes, settingsRes, transfersRes, statementRes, billingNotesRes] = await Promise.all([
            // เรียงตามวันที่สร้าง (+id) เสมอ — ไม่ระบุลำดับ Postgres คืนแถวที่เพิ่งแก้ไขในตำแหน่งใหม่ ทำให้รายการในตารางกระโดด
            sb.from("customers").select("*").order("created_at", { ascending: true }).order("id", { ascending: true }),
            sb.from("workers").select("*").order("created_at", { ascending: true }).order("id", { ascending: true }),
            sb.from("jobs").select("*").order("created_at", { ascending: true }).order("id", { ascending: true }),
            sb.from("banks").select("*"),
            sb.from("profiles").select("name, role, customer_id, id, theme, avatar_url"),
            sb.from("agents").select("*"),
            sb.from("expenses").select("*"),
            sb.from("free_invoices").select("*"),
            sb.from("invoices").select("*"),
            sb.from("payments").select("*"),
            sb.from("service_prices").select("*"),
            sb.from("receipts").select("*"),
            sb.rpc("list_team"),
            sb.from("app_settings").select("key, value"),
            sb.from("account_transfers").select("*"),
            selectAllRows("bank_statement_lines"),
            sb.from("billing_notes").select("customer_id, note") // RLS คืนเฉพาะ Note ของบัญชีที่ล็อกอิน
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
            // ยังไม่ได้ใช้ migration / ไม่ใช่ฝ่ายการเงิน → error หรือ RLS คืนว่าง = [] (หน้าอื่นทำงานต่อได้)
            transfers: transfersRes.error ? [] : normalizeNumbers(toCamelList(transfersRes.data, TRANSFER_MAP), ["amount"]),
            statementLines: statementRes.error ? [] : normalizeNumbers(toCamelList(statementRes.data, STATEMENT_LINE_MAP), ["amount", "balance"]),
            // Note วางบิลส่วนตัว { customerId: note } — เฉพาะของคนที่ล็อกอิน
            myBillingNotes: billingNotesRes.error ? {} : Object.fromEntries((billingNotesRes.data || []).map((r) => [r.customer_id, r.note])),
            // ทีมงานภายใน (ชื่อ+ตำแหน่ง) สำหรับเลือก/แสดงผู้รับผิดชอบใบงาน — profiles อ่านได้เฉพาะแถวตัวเองถ้าไม่ใช่ admin
            team: teamRes.error ? [] : (teamRes.data || []),
            // ค่าตั้งค่ากลาง { key: value } เช่น cash_card_order
            settings: settingsRes.error ? {} : Object.fromEntries((settingsRes.data || []).map((r) => [r.key, r.value])),
            servicePrices: servicePricesRes.error ? [] : normalizeNumbers(toCamelList(servicePricesRes.data, SERVICE_PRICE_MAP), ["govFee", "serviceFee"]),
            freeInvoices: freeInvoicesRes.error ? [] : toCamelList(freeInvoicesRes.data, FREE_INVOICE_MAP),
            users: profilesRes.error ? [] : (profilesRes.data || []).map((p) => ({
                id: p.id, email: p.id, name: p.name, role: p.role, customer_id: p.customer_id, theme: p.theme || null, avatarUrl: p.avatar_url || null
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
    // เอกสารคนงานใช้ AI เฉพาะ ใบอนุญาตทำงาน / passport / บัตรชมพู / ใบเสร็จ (owner's request 2026-10-08) — บัตรพม่า/วีซ่า/ประกัน แนบอย่างเดียว
    // ต้องเป็นส่วนหนึ่งของ ALLOWED_DOC_TYPES ใน supabase/functions/ocr-document/index.ts
    const OCR_DOC_TYPES = ["worker-passport", "worker-wp-doc", "worker-pink-card", "worker-receipt", "cust-id-card", "cust-cert", "expense-slip", "payment-slip", "job-appointment", "worker-auto"];

    // คืน { parsedData, ocrError } — ocrError: null (สำเร็จ) / "busy" (Gemini ไม่ว่าง/โควตาหมด) / "failed"
    // เอกสารคนงาน: อ่าน QR ของกรมการจัดหางานคู่ไปกับ AI — ถ้าเจอ ข้อมูลจากกรมทับค่าที่ AI อ่าน (แม่นกว่า)
    // และถ้า AI อ่านไม่สำเร็จแต่ QR ได้ข้อมูล ก็ถือว่าอ่านสำเร็จ ไม่ต้องให้ผู้ใช้แนบใหม่
    // -------------------- อ่าน PDF ราชการโดยไม่ใช้ AI (owner 2026-10-13, ไม่ใช้ AI ฟรี) --------------------
    // PDF ที่ระบบกรมการจัดหางานสร้าง มีตัวหนังสือจริงในไฟล์ (ไม่ใช่ภาพสแกน) → ดึงข้อความด้วย pdf.js แล้วจับด้วย regex
    // แม่นกว่า AI และไม่มีค่าใช้จ่าย — ถ้าจับได้ จะไม่เรียก AI เลย; ภาพสแกน/รูปถ่ายยังต้องใช้ AI (หรือกรอกเอง)
    // รูปแบบที่เรียนรู้แล้ว (ตัวอย่างจากแฟ้ม ศรีทร / ชายแดนใต้คอนกรีต):
    //   1) ใบเสร็จรับเงิน กรมการจัดหางาน (Receipt) — ชื่อคนต่างด้าว, RA/เลข 13 หลัก, เลขใบเสร็จ, เลขใบแจ้งชำระ, ยอดรวม, อีเมล
    //   2) ทะเบียนใบอนุญาตทำงานของคนต่างด้าว (ใช้แทนใบอนุญาต) — มติ 2568 (bt_*.pdf), มติ 2565 (ET-67-*), สำเนา (WP-RN-65-*)
    const TH_MONTH_NAMES = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const GOV_DATE_RE = "(\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{4}|\\d{1,2}\\s+[ก-๙]+\\.?\\s+\\d{4})";

    // "29/01/2024", "25/03/2524", "29-06-2569", "13 กุมภาพันธ์ 2570", "25 มีนาคม. 2524" → "DD/MM/YYYY" (ค.ศ.)
    function govDateToDmy(s) {
        const t = String(s || "").trim().replace(/กรกฏาคม/g, "กรกฎาคม");
        let d, m, y;
        let mm = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
        if (mm) { d = +mm[1]; m = +mm[2]; y = +mm[3]; }
        else if ((mm = t.match(/^(\d{1,2})\s+([ก-๙]+)\.?\s+(\d{4})$/))) {
            d = +mm[1]; m = TH_MONTH_NAMES.indexOf(mm[2]) + 1; y = +mm[3];
            if (!m) m = TH_MONTH_NAMES.findIndex(n => n.startsWith(mm[2])) + 1;
        } else return undefined;
        if (y > 2400) y -= 543;
        if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12 && y > 1900)) return undefined;
        return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    }

    async function extractPdfText(bytes, maxPages = 2) {
        if (!window.pdfjsLib) return "";
        const task = window.pdfjsLib.getDocument({ data: bytes.slice() });
        try {
            const pdf = await task.promise;
            let text = "";
            for (let p = 1; p <= Math.min(pdf.numPages, maxPages); p++) {
                const content = await (await pdf.getPage(p)).getTextContent();
                text += content.items.map(it => (it.str || "") + (it.hasEOL ? "\n" : " ")).join("") + "\n";
            }
            return text.replace(/[ \t ]+/g, " ");
        } catch (e) {
            return "";
        } finally {
            try { task.destroy && task.destroy(); } catch (e) { /* ignore */ }
        }
    }

    const govPick = (text, re) => { const m = text.match(re); return m ? m[m.length - 1].trim() : undefined; };
    const GOV_TITLES = { MR: ["นาย", "ชาย"], MRS: ["นาง", "หญิง"], MISS: ["นางสาว", "หญิง"], MS: ["นางสาว", "หญิง"] };
    function govNationality(text) {
        if (/เมียนมา|MYANMAR|พม่า/i.test(text)) return "Myanmar";
        if (/กัมพูชา|CAMBODIA/i.test(text)) return "Cambodia";
        if (/ลาว|LAOS?\b/i.test(text)) return "Laos";
        return undefined;
    }
    function govName(raw) {
        const m = String(raw || "").trim().match(/^(MRS|MR|MISS|MS)\.?\s+(.+)$/i);
        const name = (m ? m[2] : String(raw || "")).replace(/\s+/g, " ").trim().toUpperCase();
        const t = m ? GOV_TITLES[m[1].toUpperCase()] : null;
        return { firstName: /^[A-Z][A-Z .'-]*$/.test(name) ? name : undefined, title: t ? t[0] : undefined, gender: t ? t[1] : undefined };
    }

    function parseDoeReceiptText(text) {
        const nm = govName(govPick(text, /Foreigner Name\)?\s*((?:MRS|MR|MISS|MS)\.?\s+[A-Z][A-Za-z .'-]*?)(?=\s+(?:สัญชาติ|\(Nationality|เลข|ชื่อ|วันที่|\n))/i)
            || govPick(text, /ชื่อคนต่างด้าว\s*((?:MRS|MR|MISS|MS)\.?\s+[A-Z][A-Za-z .'-]*?)(?=\s+(?:\(|สัญชาติ|\n))/i));
        const idv = govPick(text, /Foreigner ID\)?\s*(RA\d{17}|\d{13})/i) || govPick(text, /\b(RA\d{17})\b/);
        const paid = govPick(text, /(\d{2}-\d{2}-\d{4})\s+\d{2}:\d{2}/);
        const d = {
            documentType: "worker-receipt",
            ...nm,
            refNo: idv && /^RA/.test(idv) ? idv : undefined,
            uid: idv && /^\d{13}$/.test(idv) ? idv : undefined,
            receiptNo: govPick(text, /Receipt No\.\)?\s*(\d{10,20})/i),
            billPaymentNo: govPick(text, /Bill Payment No\.\)?\s*(\d{10,20})/i),
            receiptAmount: govPick(text, /รวมเป็นเงินทั้งสิ้น[\s\S]{0,80}?([\d,]+\.\d{2})/),
            paidAt: paid ? govDateToDmy(paid) : undefined,
            // ไม่ดึงอีเมลจากใบเสร็จแล้ว — เป็นอีเมลบัญชี e-WorkPermit ของนายจ้าง ไม่ใช่ของคนงาน (owner 2026-10-22)
            nationality: govNationality(govPick(text, /Nationality\)?\s*(\S+)/i) || ""),
            scriptLanguage: "thai"
        };
        if (d.receiptAmount) d.receiptAmount = d.receiptAmount.replace(/,/g, "");
        return d;
    }

    function parseWpRegisterText(text) {
        const D = GOV_DATE_RE;
        const en = govPick(text, /ชื่อภาษาอังกฤษ\s*:?\s*((?:MRS|MR|MISS|MS)?\.?\s*[A-Z][A-Za-z .'-]*?)(?=\s+(?:วัน|อายุ|สัญชาติ|ข้อมูล|ชื่อ|ที่อยู่)|\s*\n)/)
            || govPick(text, /Name of Applicant\)\s*:?\s*_*\s*((?:MRS|MR|MISS|MS)\.?\s+[A-Z][A-Za-z .'-]*?)(?=\s+(?:เจ้าหน้าที่|นายทะเบียน|\()|\s*\n)/);
        // หัวข้อ "ข้อมูลหนังสือเดินทาง" ตัวจริงคือตัวสุดท้าย (บรรทัดสถานะ "รอข้อมูลหนังสือเดินทาง และ VISA" มาก่อน)
        const passSection = text.slice(text.lastIndexOf("ข้อมูลหนังสือเดินทาง"));
        const d = {
            documentType: "worker-wp-doc",
            ...govName(en),
            uid: govPick(text, /(?:เลขประจำตัวคนต่างด้าว|รหัสคนต่างด้าว)\s*:?\s*(\d{13})/),
            permitNo: govPick(text, /(?:ใบอนุญาตทำงานเลขที่|ใบอนุญาตเลขที่)\s*:?\s*(\d{8,16})/),
            permitExpiry: govDateToDmy(govPick(text, new RegExp(`อนุญาตให้ทำงาน(?:ถึงวันที่|ตั้งแต่วันที่[\\s\\S]{0,160}?ถึงวันที่)\\s*:?\\s*${D}`))),
            dob: govDateToDmy(govPick(text, new RegExp(`เกิด\\s*:?\\s*${D}`))),
            nationality: govNationality(govPick(text, /สัญชาติ\s*:?\s*(\S+)/) || ""),
            passportNo: govPick(text, /เลขที่หนังสือเดินทาง\s*:?\s*([A-Z]{1,3}\d{5,9})/),
            passportType: govPick(text, /ประเภทหนังสือเดินทาง\s*:?\s*(Passport|CI)\b/i),
            passportAuth: govPick(text, /สถานที่ออกหนังสือ(?:เดินทาง)?\s*:?\s*([A-Z][A-Z ,.-]*?)(?=\s+(?:ประเทศ|ประเภท|วันที่)|\s*\n)/),
            passportIssue: govDateToDmy(govPick(text, new RegExp(`วันที่ออกหนังสือเดินทาง\\s*:?\\s*${D}`))),
            passportExpiry: govDateToDmy(govPick(passSection, new RegExp(`วันหมดอายุ\\s*:?\\s*${D}`))),
            position: govPick(text, /ทำงานในตำแหน่ง\s*:?\s*([ก-๙A-Za-z]+)/),
            scriptLanguage: "thai"
        };
        return d;
    }

    // รุ่นที่พิมพ์จากระบบ e-WorkPermit (มติ 2567/2568, "เอกสารฉบับนี้ถูกสรางจาก e-WorkPermit") — ตัวอักษรไทยฝังฟอนต์แปลก
    // (ไม้เอกหาย, ำ เป็น ํา) และวางหัวข้อทั้งหมดก่อน แล้วค่าทั้งหมดต่อกันคั่นด้วย ":" ตามลำดับตายตัว:
    // … : <ประเภทเอกสาร> : <สัญชาติ> : <วันหมดอายุพาสปอร์ต> : <วันออก> : <สถานที่ออก> : <เลขพาสปอร์ต> : <เลขคนต่างด้าว 13 หลัก>
    //   : <ชื่อไทย> : <MR. ชื่ออังกฤษ> : <อายุ> ( ปี ) : <วันเกิด> : <เลขใบอนุญาต> : <ออกให้ ณ> : <ที่อยู่> : <ตำแหน่ง> : <ทำงานถึงวันที่> …
    function parseWpRegisterValueBlock(text) {
        const DMY = "(\\d{1,2}\\/\\d{1,2}\\/\\d{4})";
        const m = text.match(new RegExp(
            `:\\s*([^:]{1,40}?)\\s*:\\s*([^:\\s]{2,20})\\s*:\\s*${DMY}\\s*:\\s*${DMY}\\s*:\\s*([A-Z][A-Z ,.-]*?)\\s*:\\s*([A-Z]{1,3}\\d{5,9})\\s*:\\s*(\\d{13})` +
            `\\s*:\\s*([^:]*?)\\s*:\\s*((?:MRS|MR|MISS|MS)\\.?\\s+[A-Z][A-Z .'-]*?)\\s*:\\s*\\d+\\s*\\(\\s*ปี\\s*\\)\\s*:\\s*${DMY}\\s*:\\s*(\\d{8,16})`));
        if (!m) return null;
        const after = text.slice(m.index + m[0].length);
        const work = after.match(/^\s*:[^:]*:[^:]*:\s*([ก-๙A-Za-z]+)\s*:\s*(\d{1,2}\s+[ก-๙]+\.?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/);
        const isCi = /\bCI\b|เอกสารรับรอง/i.test(m[1]);
        return {
            ...govName(m[9]),
            nationality: govNationality(m[2]),
            passportExpiry: govDateToDmy(m[3]),
            passportIssue: govDateToDmy(m[4]),
            passportAuth: m[5].trim(),
            passportNo: m[6],
            passportType: isCi ? "CI" : "Passport",
            uid: m[7],
            dob: govDateToDmy(m[10]),
            permitNo: m[11],
            position: work ? work[1] : undefined,
            permitExpiry: work ? govDateToDmy(work[2]) : undefined,
            refNo: govPick(text, /\b(RA\d{17})\b/)
        };
    }

    // คืน parsedData (รูปแบบเดียวกับผล AI) ถ้าเป็น PDF ราชการที่รู้จัก ไม่งั้น null
    async function parseGovPdf(base64Data, mimeType) {
        if (mimeType !== "application/pdf") return null;
        let text = "";
        try { text = await extractPdfText(Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))); } catch (e) { return null; }
        if (text.replace(/\s/g, "").length < 80) return null; // ภาพสแกน — ไม่มีตัวหนังสือ
        let d = null;
        if (/ใบเสร็จรับเงิน/.test(text) && /กรมการจัดหางาน/.test(text) && /Bill Payment No|เลขที่ใบแจ้งชำระเงิน/i.test(text)) d = parseDoeReceiptText(text);
        else if (/ทะเบียนใบอนุญาตท[ำํ]+า?งาน/.test(text) && /(เลขประจำตัวคนต่างด้าว|รหัสคนต่างด้าว|รหัสอ[้]?างอิงคนต[่]?างด[้]?าว)/.test(text)) {
            d = parseWpRegisterText(text);
            if (!d.uid || !d.permitNo) { // รุ่นพิมพ์จาก e-WorkPermit — หัวข้อไม่ติดกับค่า
                // หัวข้อในรุ่นนี้ไม่ติดกับค่า ตัวอ่านแบบหัวข้ออาจจับหัวข้อถัดไปมาเป็นค่า → ใช้ค่าจากบล็อกทับทั้งหมด
                const v = parseWpRegisterValueBlock(text);
                if (v) Object.keys(v).forEach(k => { if (v[k]) d[k] = v[k]; });
            }
        }
        if (!d) return null;
        Object.keys(d).forEach(k => { if (d[k] === undefined || d[k] === null || d[k] === "") delete d[k]; });
        if (d.uid && !/^\d{13}$/.test(d.uid)) delete d.uid; // owner's rule: เลขคนต่างด้าวต้อง 13 หลักเท่านั้น
        const useful = d.documentType === "worker-receipt" ? (d.receiptNo || d.billPaymentNo) : (d.uid || d.permitNo);
        if (!useful) return null;
        d.source = "pdf-text";
        return d;
    }

    async function callOcr(base64Data, mimeType, docType) {
        // PDF ราชการที่อ่านตัวหนังสือได้ → ใช้เลย ไม่เรียก AI (QR ของกรม ถ้ามี ยังมาเติมทับ)
        const local = await parseGovPdf(base64Data, mimeType).catch(() => null);
        if (local && (docType === "worker-auto" || docType === local.documentType)) {
            const ewpLocal = EWP_QR_DOC_TYPES.includes(docType) ? await lookupEwpFromFile(base64Data, mimeType) : null;
            const parsedData = ewpLocal ? { ...local, ...ewpCardToParsedData(ewpLocal.card, ewpLocal.ref) } : local;
            if (docType !== "worker-auto") delete parsedData.documentType;
            return { parsedData, ocrError: null };
        }
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
    const MIME_EXT = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
    function sniffFileMime(bytes) {
        const b = i => bytes[i];
        if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return "application/pdf";
        if (b(0) === 0xFF && b(1) === 0xD8 && b(2) === 0xFF) return "image/jpeg";
        if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4E && b(3) === 0x47) return "image/png";
        if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45) return "image/webp";
        if (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46) return "image/gif";
        return null;
    }
    function fixFileExtension(name, mime) {
        const ext = MIME_EXT[mime];
        if (!ext) return name;
        return /\.[a-z0-9]{2,5}$/i.test(name) ? name.replace(/\.[a-z0-9]{2,5}$/i, "." + ext) : `${name}.${ext}`;
    }

    async function uploadFile(fileDataUrl, fileName, customerId, workerId, docType, currentUser, options = {}) {
        const parts = fileDataUrl.split(",");
        if (parts.length < 2) return { status: "error", message: "invalid file data" };
        let mimeType = parts[0].match(/:(.*?);/)[1];
        const base64Data = parts[1];
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        // เบราว์เซอร์เดาประเภทไฟล์จากนามสกุล — รูป JPEG ที่ตั้งชื่อ .pdf (เจอในไฟล์จาก Google Drive) ถูกเก็บเป็น PDF แล้วเปิดไม่ได้
        // ดูจากเนื้อไฟล์จริงแทน แล้วแก้ทั้งประเภทและนามสกุลให้ตรง (2026-10-09)
        const realMime = sniffFileMime(bytes);
        if (realMime && realMime !== mimeType) {
            mimeType = realMime;
            fileName = fixFileExtension(fileName, realMime);
        }

        // ให้ AI อ่านก่อนอัปโหลด — เอกสารประเภทที่ใช้ AI ถ้าอ่านไม่สำเร็จ (Gemini ไม่ว่าง/อ่านไม่ได้) จะไม่เก็บไฟล์เลย
        // ให้ผู้ใช้แนบใหม่ทีหลัง แทนที่จะมีไฟล์ค้างในระบบแล้วแนบซ้ำจนไฟล์ซ้ำซ้อน
        let parsedData = null;
        const ocrAttempted = !options.skipOcr && OCR_DOC_TYPES.includes(docType);
        // options.onStage('ocr' | 'upload') = บอกหน้าเว็บว่าถึงขั้นไหน (ตัวหมุนในช่องแนบ — beginUploadUi ใน app.js)
        const stage = s => { try { if (typeof options.onStage === "function") options.onStage(s); } catch (e) {} };
        if (ocrAttempted) {
            stage("ocr");
            const ocr = await callOcr(base64Data, mimeType, docType);
            if (!ocr.parsedData) {
                return { status: "error", aiRejected: true, ocrError: ocr.ocrError, message: "AI อ่านเอกสารไม่สำเร็จ ยังไม่ได้บันทึกไฟล์" };
            }
            parsedData = ocr.parsedData;
        }
        // options.confirmParsed(parsedData) = ถามผู้ใช้หลัง AI อ่านเสร็จ ก่อนอัปโหลดจริง — ตอบ false = ยกเลิก ไม่เก็บไฟล์
        // (เช่น เลข 13 หลักในเอกสารไม่ตรงกับคนงาน — ดู confirmWorkerUidChange ใน app.js)
        // ตอบ 'keep' = อัปโหลดไฟล์แต่ไม่ใช้ข้อมูลที่ AI อ่าน (parsedData = null → หน้าเว็บไม่เติม/ไม่ทับข้อมูลคนงาน)
        if (typeof options.confirmParsed === "function" && parsedData) {
            const decision = await options.confirmParsed(parsedData);
            if (!decision) return { status: "cancelled", message: "ผู้ใช้ยกเลิก ไม่ได้อัปโหลดไฟล์" };
            if (decision === "keep") parsedData = null;
        }
        // options.nameFromOcr(parsedData) = ตั้งชื่อไฟล์ใหม่จากข้อมูลที่ AI อ่านได้ (เช่น ใบอนุญาตทำงาน → เลข 13 หลัก_ชื่อ)
        if (typeof options.nameFromOcr === "function") {
            const renamed = options.nameFromOcr(parsedData);
            if (renamed) fileName = realMime ? fixFileExtension(renamed, realMime) : renamed;
        }

        stage("upload");
        const path =`${customerId || "misc"}/${workerId || "employer"}/${Date.now()}_${sanitizeStorageFileName(fileName)}`;
        const { error: upErr } = await sb.storage.from("worker-documents").upload(path, bytes, { contentType: mimeType, upsert: true });
        if (upErr) return { status: "error", message: upErr.message };

        const { data: pub } = sb.storage.from("worker-documents").getPublicUrl(path);
        const fileUrl = pub.publicUrl;

        return { status: "success", fileUrl, viewUrl: fileUrl, fileId: path, fileName, parsedData, ocrAttempted };
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
        const row = {
            name: profileData.name,
            role: profileData.role,
            customer_id: profileData.customer_id || null
        };
        if (profileData.avatarUrl !== undefined) row.avatar_url = profileData.avatarUrl || null; // รูปโปรไฟล์ (2026-10-13)
        const { error } = await sb.from("profiles").update(row).eq("id", userId);
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
            case "saveJob": {
                // แก้ใบงานที่มีอยู่แล้วด้วย update ก่อน — upsert (INSERT ... ON CONFLICT) ต้องผ่าน RLS ของ INSERT ด้วย
                // ซึ่ง Account Manager ไม่มี (เพิ่มใบงานไม่ได้ แต่แก้ช่องการเงินได้) → ออกบิล/รับเงินแล้วผูกใบงานไม่ได้
                // (พบกับ INV-2569-0004, 2026-10-06) — ไม่เจอแถว (ใบงานใหม่) ค่อย upsert ตามเดิม
                const row = toRow(payload.jobData, JOB_MAP);
                if (row.id) {
                    // ช่องการเงินของใบงานที่มีอยู่แล้ว เขียนได้เฉพาะงานบัญชี (payload.billing: ออกบิล/แก้บิล/รับเงิน/ยกเลิกบิล/
                    // ไม่เรียกเก็บเงิน/ปรับราคามาตรฐาน/จ่ายค่าคอม) — ที่อื่นส่งใบงานทั้งก้อน หน้าเว็บที่ค้างข้อมูลเก่าจึงเขียนทับบิลได้
                    // (2026-10-19: ใบงาน LOR CHAN ใน INV-2569-0010 กลับเป็น "ยังไม่ออกบิล" ค่าบริการ 0)
                    if (!payload.billing) JOB_BILLING_COLS.forEach(c => delete row[c]);
                    const { data: upd, error: updErr } = await sb.from("jobs").update(row).eq("id", row.id).select();
                    if (updErr) return { status: "error", message: updErr.message };
                    if (upd && upd.length) return { status: "success", data: toCamel(upd[0], JOB_MAP) };
                }
                return await upsertOne("jobs", JOB_MAP, payload.jobData);
            }
            case "saveAgent":
                return await upsertOne("agents", AGENT_MAP, payload.agentData);
            case "saveTransfer":
                return await upsertOne("account_transfers", TRANSFER_MAP, payload.transferData);
            case "deleteTransfer": {
                const { error, count } = await sb.from("account_transfers").delete({ count: "exact" }).eq("id", payload.id);
                if (error) return { status: "error", message: error.message };
                if (!count) return { status: "error", message: "ไม่พบรายการโอน หรือไม่มีสิทธิ์ลบ" };
                return { status: "success" };
            }
            case "importStatementLines": {
                // บรรทัดที่เคยนำเข้าแล้ว (id เดิม) ข้าม — ไม่ทับผลจับคู่ที่ทำไว้
                const rows = (payload.lines || []).map((l) => toRow(l, STATEMENT_LINE_MAP));
                for (let i = 0; i < rows.length; i += 500) {
                    const { error } = await sb.from("bank_statement_lines").upsert(rows.slice(i, i + 500), { onConflict: "id", ignoreDuplicates: true });
                    if (error) return { status: "error", message: error.message };
                }
                return { status: "success" };
            }
            case "setStatementMatch": {
                const { error } = await sb.from("bank_statement_lines")
                    .update({ match_kind: payload.matchKind || null, match_id: payload.matchId || null, note: payload.note ?? null })
                    .in("id", payload.ids || []);
                if (error) return { status: "error", message: error.message };
                return { status: "success" };
            }
            case "deleteStatementLines": {
                const { error } = await sb.from("bank_statement_lines").delete().in("id", payload.ids || []);
                if (error) return { status: "error", message: error.message };
                return { status: "success" };
            }
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
            case "setMyBillingNote": {
                // Note วางบิลส่วนตัว (owner 2026-10-27) — ว่าง = ลบ Note ของตัวเอง
                const note = String(payload.note || "").trim().slice(0, 2000);
                const { data: u } = await sb.auth.getUser();
                const uid = u && u.user ? u.user.id : null;
                if (!uid) return { status: "error", message: "ไม่พบผู้ใช้ที่ล็อกอิน" };
                const q = note
                    ? sb.from("billing_notes").upsert({ customer_id: payload.customerId, user_id: uid, note, updated_at: new Date().toISOString() }, { onConflict: "customer_id,user_id" })
                    : sb.from("billing_notes").delete().eq("customer_id", payload.customerId).eq("user_id", uid);
                const { error } = await q;
                if (error) return { status: "error", message: error.message };
                return { status: "success" };
            }
            case "setCustomerBillingNote": {
                // Note วางบิล — การเงิน/ปฏิบัติการ แก้ได้ตอนออกบิล ดู 20261013060106_customer_billing_note_finance.sql
                const { error } = await sb.rpc("set_customer_billing_note", { p_customer_id: payload.customerId, p_note: payload.note || "" });
                if (error) return { status: "error", message: error.message };
                return { status: "success" };
            }
            case "getJobShareToken": {
                // ลิงก์โฟลเดอร์เอกสารปิดงาน (พนักงาน + ลูกค้าเจ้าของใบงาน) ดู 20261026055749_job_close_docs_share_link.sql
                const { data, error } = await sb.rpc("job_share_token", { p_job_id: payload.jobId });
                if (error) return { status: "error", message: error.message };
                return { status: "success", token: data };
            }
            case "getLargeFiles": {
                // ไฟล์ขนาดใหญ่ผิดปกติ (Admin) ดู 20261013055112_admin_large_files.sql
                const { data, error } = await sb.rpc("admin_large_files", { p_min_bytes: payload.minBytes || 2097152 });
                if (error) return { status: "error", message: error.message };
                return { status: "success", files: (data || []).map(f => ({ ...f, url: sb.storage.from("worker-documents").getPublicUrl(f.name).data.publicUrl })) };
            }
            case "replaceStorageFile": {
                // เขียนทับไฟล์เดิมที่ path เดิม (ลิงก์ในข้อมูลไม่เปลี่ยน) — ใช้กับเครื่องมือย่อขนาดไฟล์ใหญ่ (Admin)
                const { error } = await sb.storage.from("worker-documents")
                    .upload(payload.path, payload.blob, { contentType: payload.contentType, upsert: true, cacheControl: "60" });
                if (error) return { status: "error", message: error.message };
                return { status: "success" };
            }
            case "getCalendarNotes": {
                // ปฏิทินทีม: ผู้ใช้ภายในทุกคนเห็น/แก้ร่วมกัน หลายรายการต่อวัน + เวลา ดู 20261014030000_team_calendar_notes.sql
                const { data, error } = await sb.from("calendar_notes")
                    .select("id, note_date, note_end_date, note_time, note, user_id, updated_by, updated_at")
                    .order("note_date").order("note_time", { nullsFirst: true });
                if (error) return { status: "error", message: error.message };
                return { status: "success", notes: data || [] };
            }
            case "saveCalendarNote": {
                const note = String(payload.note || "").trim().slice(0, 200);
                if (!note) return { status: "error", message: "ยังไม่ได้พิมพ์โน้ต" };
                const row = { note_date: payload.date, note_end_date: payload.endDate || null, note_time: payload.time || null, note };
                const q = payload.id
                    ? sb.from("calendar_notes").update(row).eq("id", payload.id)
                    : sb.from("calendar_notes").insert(row);
                const { data, error } = await q.select("id, note_date, note_end_date, note_time, note, user_id, updated_by, updated_at").single();
                if (error) return { status: "error", message: error.message };
                return { status: "success", note: data };
            }
            case "deleteCalendarNote": {
                const { error } = await sb.from("calendar_notes").delete().eq("id", payload.id);
                if (error) return { status: "error", message: error.message };
                return { status: "success" };
            }
            // งานต่ออายุใบอนุญาตทำงาน (1 แถว = 1 รอบของคนงาน 1 คน) — ดู 20261020062529_renewals.sql
            case "getRenewals": {
                const { data, error } = await sb.from("renewals").select("*").order("started_at", { ascending: false });
                if (error) return { status: "error", message: error.message };
                return { status: "success", rows: data || [] };
            }
            case "startRenewals": {
                // status 'external' = ต่อที่อื่น (ไม่มีใบงานเก็บเงิน) — ดู 20261020074716_renewals_external.sql
                const rows = (payload.rows || []).map(r => ({
                    worker_id: r.workerId, customer_id: r.customerId || null,
                    old_permit_expiry: r.oldPermitExpiry || null, with_book: !!r.withBook,
                    status: r.status || 'active', note: r.note || null,
                    kind: r.kind || 'renewal', registration_round_id: r.registrationRoundId || null
                }));
                if (!rows.length) return { status: "error", message: "ยังไม่ได้เลือกคนงาน" };
                const { data, error } = await sb.from("renewals").insert(rows).select("*");
                if (error) return { status: "error", message: /renewals_one_active_per_worker/.test(error.message) ? "มีคนงานที่เริ่มรอบต่ออายุไว้แล้ว กรุณารีเฟรชหน้า" : error.message };
                return { status: "success", rows: data || [] };
            }
            // ฐานข้อมูลรอขึ้นทะเบียน: รอบ มติ ครม. (20261020092027_registration_pool.sql)
            case "getRegistrationRounds": {
                const { data, error } = await sb.from("registration_rounds").select("*").order("created_at", { ascending: false });
                if (error) return { status: "error", message: error.message };
                return { status: "success", rows: data || [] };
            }
            case "deleteRegistrationRound": {
                // ลบรอบได้เฉพาะ Admin (RLS) — คนงานในรอบกลับไปรอขึ้นทะเบียน (workers.registration_round_id on delete set null)
                const { error } = await sb.from("registration_rounds").delete().eq("id", payload.id);
                if (error) return { status: "error", message: error.message };
                return { status: "success" };
            }
            case "saveRegistrationRound": {
                const r = payload.round || {};
                const row = { name: r.name, announced_on: r.announcedOn || null, permit_expiry: r.permitExpiry || null, status: r.status || 'open' };
                const q = r.id ? sb.from("registration_rounds").update(row).eq("id", r.id) : sb.from("registration_rounds").insert(row);
                const { data, error } = await q.select("*").single();
                if (error) return { status: "error", message: error.message };
                return { status: "success", row: data };
            }
            case "clientSavePendingWorker": {
                const { data, error } = await sb.rpc("client_save_pending_worker", { p: payload.worker || {} });
                if (error) return { status: "error", message: error.message };
                return { status: "success", data: toCamel(data, WORKER_MAP) };
            }
            // พอร์ทัลลูกค้า: เปิด/ยกเลิกรอบต่ออายุเอง — ตรวจสิทธิ์และเงื่อนไขในฐานข้อมูล (20261020072944_renewals_client_portal.sql)
            case "clientStartRenewals": {
                const { data, error } = await sb.rpc("client_start_renewals", { p_rows: payload.rows || [], p_note: payload.note || null });
                if (error) return { status: "error", message: error.message };
                return { status: "success", rows: data || [] };
            }
            case "clientMarkExternal": {
                const { data, error } = await sb.rpc("client_mark_external", { p_worker_ids: payload.workerIds || [], p_note: payload.note || null });
                if (error) return { status: "error", message: error.message };
                return { status: "success", rows: data || [] };
            }
            case "clientBookExternal": {
                const { data, error } = await sb.rpc("client_book_external", { p_id: payload.id });
                if (error) return { status: "error", message: error.message };
                return { status: "success", row: data };
            }
            // พอร์ทัลลูกค้า: แจ้งออก/ยกเลิกคำขอแจ้งออก — ตรวจสิทธิ์และเงื่อนไขในฐานข้อมูล (20261021040847_client_exit_requests.sql)
            case "clientRequestExit": {
                const { data, error } = await sb.rpc("client_request_exit", { p_worker_id: payload.workerId });
                if (error) return { status: "error", message: error.message };
                return { status: "success", row: toCamel(data, JOB_MAP) };
            }
            case "clientCancelExit": {
                const { error } = await sb.rpc("client_cancel_exit", { p_job_id: payload.jobId });
                if (error) return { status: "error", message: error.message };
                return { status: "success" };
            }
            case "clientCancelRenewal": {
                const { data, error } = await sb.rpc("client_cancel_renewal", { p_id: payload.id });
                if (error) return { status: "error", message: error.message };
                return { status: "success", row: data };
            }
            case "saveRenewal": {
                const r = payload.renewal || {};
                const row = {
                    status: r.status, with_book: !!r.withBook, steps: r.steps || {},
                    appointment_date: r.appointmentDate || null, new_permit_expiry: r.newPermitExpiry || null,
                    done_at: r.doneAt || null, note: r.note || null
                };
                const { data, error } = await sb.from("renewals").update(row).eq("id", r.id).select("*").single();
                if (error) return { status: "error", message: error.message };
                return { status: "success", row: data };
            }
            case "claimSession": {
                // ห้ามล็อกอินซ้อน: จองเซสชันนี้เป็นเซสชันเดียวของบัญชี + ยกเลิก refresh token ของเครื่องอื่น
                // ดู 20261013043530_profile_single_session.sql
                const { error } = await sb.rpc("claim_session", { p_session: payload.sessionId });
                if (error) return { status: "error", message: error.message };
                try { await sb.auth.signOut({ scope: "others" }); } catch (e) { /* ไม่เป็นไร — เช็คด้วย active_session อยู่แล้ว */ }
                return { status: "success" };
            }
            case "getActiveSession": {
                const { data, error } = await sb.rpc("my_active_session");
                if (error) return { status: "error", message: error.message };
                return { status: "success", sessionId: data || null };
            }
            case "setMyAvatar": {
                // รูปโปรไฟล์ของตัวเอง (ทุกบทบาท) — แก้ได้เฉพาะ avatar_url ของแถวตัวเอง ดู 20261013042307_profile_avatar.sql
                const { error } = await sb.rpc("set_my_avatar", { p_url: payload.url || "" });
                if (error) return { status: "error", message: error.message };
                return { status: "success" };
            }
            case "getDriveBackupIndex": {
                // ไฟล์/โฟลเดอร์ที่สำรองขึ้น Google Drive แล้ว (อ่านได้เฉพาะผู้ใช้ภายใน ตาม RLS is_internal()) — ใช้ทำปุ่ม "เปิดใน Google Drive"
                // ดึงทีละ 1000 แถวจนครบ (PostgREST คืนได้ครั้งละไม่เกิน 1000 แถว)
                const all = async (q) => {
                    const out = [];
                    for (let from = 0; ; from += 1000) {
                        const { data, error } = await q().range(from, from + 999);
                        if (error) return { error };
                        out.push(...(data || []));
                        if (!data || data.length < 1000) return { data: out };
                    }
                };
                const [files, folders] = await Promise.all([
                    all(() => sb.from("drive_backup_files").select("source_key, drive_id").eq("deleted", false).order("source_key")),
                    all(() => sb.from("drive_backup_folders").select("key, drive_id").order("key"))
                ]);
                if (files.error || folders.error) return { status: "error", message: (files.error || folders.error).message };
                return { status: "success", files: files.data || [], folders: folders.data || [] };
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
            case "deleteVoidInvoice": {
                // Admin ลบบิลที่ยกเลิกแล้วถาวร — payments.invoice_id เป็น on delete restrict จึงลบการรับเงินของบิลนี้ก่อน
                // (บิลที่ยกเลิกได้ต้องยกเลิกการรับเงินทุกงวดแล้ว — ถ้ายังมีงวดที่ไม่ได้ยกเลิก ไม่ลบอะไรเลย)
                const id = payload.invoiceId;
                const { data: inv, error: invErr } = await sb.from("invoices").select("id, status").eq("id", id).maybeSingle();
                if (invErr) return { status: "error", message: invErr.message };
                if (!inv || inv.status !== "void") return { status: "error", message: "ลบได้เฉพาะบิลที่ยกเลิกแล้ว" };
                const { data: live, error: liveErr } = await sb.from("payments").select("id").eq("invoice_id", id).eq("voided", false);
                if (liveErr) return { status: "error", message: liveErr.message };
                if (live && live.length) return { status: "error", message: "บิลนี้ยังมีการรับเงินที่ยังไม่ได้ยกเลิก" };
                const { error: payErr } = await sb.from("payments").delete().eq("invoice_id", id);
                if (payErr) return { status: "error", message: payErr.message };
                const { error, count } = await sb.from("invoices").delete({ count: "exact" }).eq("id", id);
                if (error) return { status: "error", message: error.message };
                if (!count) return { status: "error", message: "ไม่มีสิทธิ์ลบบิลนี้ (เฉพาะ Admin)" };
                return { status: "success" };
            }
            case "deleteRecordByRow":
                // แนวคิด "แถวที่เท่าไหร่" ไม่มีอยู่แล้วใน SQL (ไม่ใช่ชีต) — ใช้ id แทนเสมอ
                return { status: "error", message: "deleteRecordByRow ไม่รองรับแล้วบน Supabase — กรุณาใช้ deleteRecord ด้วย id" };
            default:
                return { status: "error", message: `Action '${action}' not found.` };
        }
    }

    window.supabaseAdapter = {
        login, callCloudAPI, uploadFile, ocrDocument, client: sb,
        isPasswordRecovery, updatePassword, signOut, hasSession
    };
})();
