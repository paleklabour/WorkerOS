// ==================== APP STATE & DATA MODEL ====================
let currentUser = null;
let currentJobView = 'table';

// Mock database structures
let customers = [];
let workers = [];
let jobs = [];
let banks = [];
let lineGroups = [];
let users = [];

// Thai provinces selection constraint
const PROVINCES = ["สงขลา", "ปัตตานี", "ยะลา", "พัทลุง"];

const SOUTHERN_ADDRESS_DB = {
    "สงขลา": {
        "เมืองสงขลา": { "zip": "90000", "subs": ["บ่อยาง", "เขารูปช้าง", "เกาะแต้ว", "พะวง", "เกาะยอ", "ทุ่งหวัง"] },
        "หาดใหญ่": { "zip": "90110", "subs": ["หาดใหญ่", "คลองอู่ตะเภา", "ควนลัง", "ทุ่งใหญ่", "น้ำน้อย", "คลองแห", "ท่าข้าม", "บ้านพรุ", "คอหงส์", "พะตง", "ฉลุง", "ทุ่งตำเสา"] },
        "สะเดา": { "zip": "90120", "subs": ["สะเดา", "ปริก", "พังลา", "สำนักขาม", "สำนักแต้ว", "เขามีเกียรติ"] },
        "จะนะ": { "zip": "90130", "subs": ["บ้านนา", "สะพานไม้แก่น", "สะคอม", "จะโหนง", "ป่าชิง", "คู", "ท่าหมอไทร", "ตลิ่งชัน"] },
        "เทพา": { "zip": "90150", "subs": ["เทพา", "ปากบาง", "วังใหญ่", "ลำไพล", "ท่าม่วง"] },
        "นาทวี": { "zip": "90160", "subs": ["นาทวี", "ฉลอง", "คลองทราย", "คลองกวาง", "ท่าประดู่"] },
        "รัตภูมิ": { "zip": "90180", "subs": ["กำแพงเพชร", "ท่าชะมวง", "ควนรู", "เขาพระ"] },
        "ระโนด": { "zip": "90140", "subs": ["ระโนด", "คลองแดน", "ท่าบอน", "บ้านขาว", "บ่อตรุ"] },
        "สทิงพระ": { "zip": "90190", "subs": ["จะทิ้งพระ", "กระดังงา", "คลองรี", "คูขุด", "ท่าหิน"] },
        "สะบ้าย้อย": { "zip": "90210", "subs": ["สะบ้าย้อย", "ทุ่งพอ", "บาโหย", "เขาแดง", "คูหา"] },
        "ควนเนียง": { "zip": "90220", "subs": ["รัตภูมิ", "ควนโส", "ห้วยลึก", "บางเหรียง"] },
        "คลองหอยโข่ง": { "zip": "90230", "subs": ["คลองหอยโข่ง", "ทุ่งลาน", "โคกม่วง", "คลองหลา"] },
        "บางกล่ำ": { "zip": "90110", "subs": ["บางกล่ำ", "ท่าช้าง", "แม่ทอม", "บ้านหาร"] },
        "กระแสสินธุ์": { "zip": "90270", "subs": ["กระแสสินธุ์", "เกาะใหญ่", "โรง", "เชิงแส"] },
        "นาหม่อม": { "zip": "90310", "subs": ["นาหม่อม", "พิจิตร", "ทุ่งขมิ้น", "คลองหรัง"] },
        "สิงหนคร": { "zip": "90330", "subs": ["หัวเขา", "สทิงหม้อ", "ทำนบ", "ป่าขาด", "ชิงโค"] }
    },
    "ปัตตานี": {
        "เมืองปัตตานี": { "zip": "94000", "subs": ["สะบารัง", "อาโนรู", "จะบังติกอ", "บานา", "รูสะมิแล", "คลองมานิง", "ตันหยงลุโละ", "กะมิยอ", "บาราโหม", "มะกรูด", "ปุยุด", "ตะลุโบะ"] },
        "โคกโพธิ์": { "zip": "94120", "subs": ["โคกโพธิ์", "ท่าเรือ", "มะกรูด", "นาประดู่", "คลองใหม่", "ป่าบอน"] },
        "หนองจิก": { "zip": "94170", "subs": ["ตุยง", "บางเขา", "ท่ากำชำ", "ปุโละปุโย", "บ่อทอง", "คลองใหม่"] },
        "ปะนาเระ": { "zip": "94130", "subs": ["ปะนาเระ", "ท่าข้าม", "ควน", "พ่อมิ่ง", "ดอน", "บ้านนอก"] },
        "มายอ": { "zip": "94140", "subs": ["มายอ", "ถนน", "ลุโบะยิไร", "เกาะจัน", "กระหวะ"] },
        "ทุ่งยางแดง": { "zip": "94140", "subs": ["ตะโละแมะนา", "พิเทน", "น้ำดำ", "ปากู"] },
        "สายบุรี": { "zip": "94110", "subs": ["ตะลุบัน", "ละหาร", "มะนังดาลำ", "ตะบิ้ง", "กะดุนง"] },
        "ไม้แก่น": { "zip": "94220", "subs": ["ไทรทอง", "ไม้แก่น", "ดอนทราย"] },
        "ยะหริ่ง": { "zip": "94150", "subs": ["ยะหริ่ง", "ยามู", "ตะโล๊ะกาโปร์", "ปิยามุมัง", "ตันหยงจึงงา"] },
        "ยะรัง": { "zip": "94160", "subs": ["ยะรัง", "ประจัน", "สะดาวา", "ระแว้ง", "ปิตูมุดี", "เมาะมาวี"] },
        "แม่ลาน": { "zip": "94180", "subs": ["แม่ลาน", "ป่าไร่", "ม่วงเตี้ย"] },
        "กะพ้อ": { "zip": "94230", "subs": ["กะรุบี", "ตะโละดือรามัน", "ปล่องหอย"] }
    },
    "ยะลา": {
        "เมืองยะลา": { "zip": "95000", "subs": ["สะเตง", "สะเตงนอก", "หน้าถ้ำ", "ลิดล", "ยะลา", "ท่าสาป", "ลำใหม่", "ลำพะยา", "โกตาบารู", "พร่อน", "บันนังสาเรง", "บุดี", "เปาะเส้ง"] },
        "เบตง": { "zip": "95110", "subs": ["เบตง", "ยะรม", "ตาเนาะแมเราะ", "อัยเยอร์เวง", "แม่หวาด"] },
        "บันนังสตา": { "zip": "95130", "subs": ["บันนังสตา", "บาเจาะ", "เขื่อนบางลาง", "ถ้ำทะลุ", "ตลิ่งชัน"] },
        "ยะหา": { "zip": "95120", "subs": ["ยะหา", "ละแอ", "บาโร๊ะ", "ปะแต", "กาตอง"] },
        "รามัน": { "zip": "95140", "subs": ["กายูบอเกาะ", "กะรุบี", "ตะโล๊ะหะลอ", "ท่าธง", "บาลอ", "บือมัง", "ยะต๊ะ", "รามัน", "วังพญา", "อาซ่อง", "เนินงาม"] },
        "ธารโต": { "zip": "95150", "subs": ["ธารโต", "บ้านแหร", "แม่หวาด", "คีรีเขต"] },
        "กรงปินัง": { "zip": "95000", "subs": ["กรงปินัง", "สะเอะ", "ห้วยกระทิง", "ปุโรง"] },
        "กาบัง": { "zip": "95120", "subs": ["กาบัง", "บาละ"] }
    },
    "พัทลุง": {
        "เมืองพัทลุง": { "zip": "93000", "subs": ["คูหาสวรรค์", "เขาเจียก", "ท่ามิหรำ", "โคกชะงาย", "นาหม่อม", "นาโหนด", "ปรางหมู่", "ท่าแค", "ควนมะพร้าว", "ลำปำ", "ตำนาน", "ชัยบุรี", "พญาขัน"] },
        "ควนขนุน": { "zip": "93110", "subs": ["ควนขนุน", "โตนดด้วน", "ดอนทราย", "มะกอกเหนือ", "พนมวังก์", "แหลมโตนด", "ปันแต", "ทะเลน้อย", "นาขยาด", "ชะรัด", "แพรกหา"] },
        "ปากพะยูน": { "zip": "93120", "subs": ["ปากพะยูน", "ดอนประดู่", "สำเภาชัย", "เกาะนางคำ", "เกาะหมาก", "หานโพธิ์", "ฝาละมี"] },
        "เขาชัยสน": { "zip": "93130", "subs": ["เขาชัยสน", "โคกม่วง", "จองถนน", "หารโพธิ์"] },
        "บางแก้ว": { "zip": "93140", "subs": ["ท่ามะเดื่อ", "นาปะขอ", "โคกสัก"] },
        "ตะโหมด": { "zip": "93160", "subs": ["แม่ขรี", "ตะโหมด", "คลองใหญ่"] },
        "ป่าบอน": { "zip": "93170", "subs": ["ป่าบอน", "โคกทราย", "หนองธง", "ทุ่งนารี"] },
        "กงหรา": { "zip": "93180", "subs": ["กงหรา", "ชะรัด", "คลองเฉลิม", "คลองทรายขาว", "สมหวัง"] },
        "ศรีบรรพต": { "zip": "93190", "subs": ["เขาย่า", "เขามรกต", "ตะแพน"] },
        "ป่าพะยอม": { "zip": "93110", "subs": ["ป่าพะยอม", "ลานข่อย", "เกาะเต่า", "บ้านพร้าว"] },
        "ศรีนครินทร์": { "zip": "93000", "subs": ["ชุมพล", "บ้านนา", "ลำสินธุ์", "อ่างทอง"] }
    }
};

// Standard Business Types
const BUSINESS_TYPES = [
    "ก่อสร้าง",
    "เกษตรและปศุสัตว์",
    "ประมงและแปรรูปสัตว์น้ำ",
    "จำหน่ายอาหารและเครื่องดื่ม",
    "การให้บริการต่างๆ",
    "ผู้รับใช้ในบ้าน",
    "การค้าส่ง/ค้าปลีก",
    "โรงงาน/อุตสาหกรรมแปรรูป"
];

// Local offline mock accounts — ONLY used when this app is opened without a
// cloud backend URL saved (see handleLogin below). These are NOT the real
// production credentials; real credentials live only in the Users sheet on
// the server and are checked via Code.gs / doPost. Do not reuse these
// values as real passwords, and do not expose them on the login screen.
const USERS = {
    "demo-admin@local.test": { email: "demo-admin@local.test", name: "Demo Admin (Offline)", role: "admin", password: "demo-only-local-1" },
    "demo-manager@local.test": { email: "demo-manager@local.test", name: "Demo Manager (Offline)", role: "manager", password: "demo-only-local-2" },
    "demo-staff@local.test": { email: "demo-staff@local.test", name: "Demo Staff (Offline)", role: "staff", password: "demo-only-local-3" }
};

// ==================== JOB RULES: 1 ประเภทงาน = 1 ใบงาน ====================
// กติกาธุรกิจ:
// 1) ทุกครั้งที่แจ้งงาน ถ้าติ๊กเลือกหลายประเภทงาน ระบบจะแตกเป็นคนละ "ใบงาน" (job)
//    แยกอิสระต่อกัน 1 ประเภทงาน ต่อ 1 ใบงานเสมอ (เปิดพร้อมกันได้ในครั้งเดียว)
// 2) คนงาน 1 คน จะ "เปิดงานประเภทเดียวกันซ้อนกัน" ไม่ได้ ถ้างานเดิมยังไม่ปิด/ยังไม่แก้ไข
//    (สถานะยังอยู่ในกลุ่ม "เปิดอยู่ (Open)") ต้องแก้ไขหรือปิดงานเดิมก่อน จึงจะเปิดงาน
//    ประเภทเดียวกันซ้ำให้คนงานคนนั้นได้อีกครั้ง
const JOB_OPEN_STATUSES = ["รอดำเนินการ", "กำลังดำเนินการ", "รอเอกสารเพิ่มเติม"];

function isJobStatusOpen(status) {
    return JOB_OPEN_STATUSES.includes(status);
}

// ตัดราคาที่ต่อท้ายในชื่อประเภทงาน เช่น "แจ้งเข้าคนงานต่างด้าว (2500)" -> "แจ้งเข้าคนงานต่างด้าว"
function getCleanJobTypeName(jobTypeStr) {
    return (jobTypeStr || "").replace(/\s*\(\d+\)/g, "").trim();
}

// หา "ใบงานเดิมที่ยังเปิดอยู่" ของคนงานคนเดียวกัน + ประเภทงานเดียวกัน (ถ้ามี)
// excludeJobId ใช้ตอนแก้ไขใบงาน เพื่อไม่ให้ชนกับตัวมันเอง
function findOpenJobConflict(workerId, typeName, excludeJobId) {
    if (!workerId || !typeName) return null;
    return jobs.find(j =>
        j.workerId === workerId &&
        j.id !== excludeJobId &&
        isJobStatusOpen(j.status) &&
        getCleanJobTypeName(j.jobType) === typeName
    ) || null;
}

// ดึง "ใบงานพี่น้อง" ที่ถูกเปิดมาพร้อมกันในการแจ้งงานครั้งเดียวกัน (batch เดียวกัน)
function getJobBatchSiblings(job) {
    if (!job || !job.batchId) return [];
    return jobs.filter(j => j.batchId === job.batchId && j.id !== job.id);
}

// ==================== CLOUD API CONNECTOR (Supabase) ====================
// ระบบเดิมยิง fetch() ไปหา Google Apps Script Web App URL ทุก action ผ่าน
// callCloudAPI(action, payload) เดียว — ทั้งไฟล์นี้เรียกผ่านฟังก์ชันนี้จุดเดียว
// จึงย้ายไปใช้ Supabase ได้โดยแก้ตรงนี้ที่เดียว ไม่ต้องแตะโค้ดส่วนอื่นเลย
// การตั้งค่าจริง (URL/Key) และการ map action → ตาราง Supabase อยู่ใน
// supabase-client.js (โหลดก่อนไฟล์นี้ใน index.html)
function getApiUrl() {
    // คงไว้เพื่อความเข้ากันได้กับโค้ดเดิมที่ยังเรียก getApiUrl() อยู่บางจุด
    // (เช่นหน้าตั้งค่า/ทดสอบการเชื่อมต่อ) — ให้ถือว่า "มีการเชื่อมต่อคลาวด์" เสมอ
    // เมื่อตั้งค่า Supabase ไว้แล้ว (ดู window.SUPABASE_URL ใน index.html)
    return window.SUPABASE_URL || null;
}

async function callCloudAPI(action, payload = {}) {
    if (!window.supabaseAdapter) {
        showToast("⚠️ ยังไม่ได้โหลด supabase-client.js หรือยังไม่ได้ตั้งค่า Supabase", "danger");
        return null;
    }
    try {
        const result = await window.supabaseAdapter.callCloudAPI(action, payload, currentUser);
        if (result && result.status === "success") {
            return result;
        }
        const errMsg = result ? result.message : "เกิดข้อผิดพลาดในการเรียกใช้ API";
        if (errMsg && errMsg.indexOf("Unauthorized") > -1) {
            showToast("⚠️ เซสชันหมดอายุหรือสิทธิ์มีการเปลี่ยนแปลง กรุณาเข้าสู่ระบบใหม่", "danger");
            logout();
            return null;
        }
        showToast("❌ ข้อผิดพลาดคลาวด์: " + errMsg, "danger");
        return null;
    } catch (e) {
        console.error("Cloud API error:", e);
        showToast("⚠️ ไม่สามารถเชื่อมต่อ Supabase ได้", "danger");
        return null;
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (window.supabaseAdapter && window.supabaseAdapter.isPasswordRecovery()) {
            // Password-recovery link landed here — supabase-js already opened a
            // session from the URL hash. Force a new-password prompt instead of
            // silently trusting any cached login (see handleResetPassword).
            showResetPasswordView();
        } else {
            // Check if user is logged in
            const cachedUser = localStorage.getItem("mw_current_user");
            if (cachedUser && cachedUser !== "undefined") {
                currentUser = JSON.parse(cachedUser);
                await initApp();
            } else {
                showLoginView();
            }
        }
    } catch (err) {
        console.error("Failed to parse cached user or initialize:", err);
        localStorage.removeItem("mw_current_user");
        showLoginView();
    }

    try {
        // Set Date in Header
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const headerDate = document.getElementById("header-date");
        if (headerDate) {
            headerDate.innerText = new Date().toLocaleDateString('th-TH', dateOptions);
        }

        // Setup Login Form Handler
        const loginForm = document.getElementById("login-form");
        if (loginForm) {
            loginForm.addEventListener("submit", handleLogin);
        }

        // Setup Reset Password Form Handler
        const resetForm = document.getElementById("reset-password-form");
        if (resetForm) {
            resetForm.addEventListener("submit", handleResetPassword);
        }
    } catch (err) {
        console.error("Failed to set header date or login listener:", err);
    }
});

function cleanupLargeAttachments() {
    let changed = false;
    const cachedWorkers = localStorage.getItem("mw_workers");
    if (cachedWorkers) {
        try {
            const wList = JSON.parse(cachedWorkers);
            wList.forEach(w => {
                if (w.attachments) {
                    Object.keys(w.attachments).forEach(key => {
                        let list = w.attachments[key];
                        if (Array.isArray(list)) {
                            list.forEach(item => {
                                  if (item.data && item.data.startsWith("data:") && item.data.length > 50000) {
                                      // Truncate to save localStorage quota
                                      const mime = item.data.split(';')[0];
                                      item.data = `${mime};base64,JVBERi0xLjQK... [TRUNCATED DUE TO LOCALSTORAGE QUOTA]`;
                                      changed = true;
                                  }
                            });
                        } else if (typeof list === 'string' && list.startsWith("data:") && list.length > 50000) {
                            w.attachments[key] = "data:application/pdf;base64,JVBERi0x... [TRUNCATED]";
                            changed = true;
                        }
                    });
                }
            });
            if (changed) {
                localStorage.setItem("mw_workers", JSON.stringify(wList));
                console.log("🧹 Cleaned up large base64 attachments in localStorage to recover quota.");
            }
        } catch (e) {
            console.error("Cleanup failed:", e);
        }
    }
}

// Seed data if empty
async function loadData() {
    // Free up space if quota is exceeded by legacy files
    cleanupLargeAttachments();

    const url = getApiUrl();
    if (url && currentUser) {
        showToast("⏳ กำลังดึงข้อมูลจาก Google Sheets...", "warning");
        const res = await callCloudAPI("getData");
        if (res) {
            customers = res.customers || [];
            workers = res.workers || [];
            jobs = res.jobs || [];
            banks = res.banks || [];
            lineGroups = res.lineGroups || [];
            users = res.users || [];
            
            // Cache locally
            localStorage.setItem("mw_customers", JSON.stringify(customers));
            localStorage.setItem("mw_workers", JSON.stringify(workers));
            localStorage.setItem("mw_jobs", JSON.stringify(jobs));
            localStorage.setItem("mw_banks", JSON.stringify(banks));
            localStorage.setItem("mw_line_groups", JSON.stringify(lineGroups));
            localStorage.setItem("mw_users", JSON.stringify(users));
            
            showToast("⚡ ดึงข้อมูลออนไลน์เรียบร้อยแล้ว", "success");
            return;
        }
    }

    const cachedCustomers = localStorage.getItem("mw_customers");
    const cachedWorkers = localStorage.getItem("mw_workers");
    const cachedJobs = localStorage.getItem("mw_jobs");
    const cachedBanks = localStorage.getItem("mw_banks");
    const cachedLineGroups = localStorage.getItem("mw_line_groups");

    if (cachedCustomers && cachedWorkers && cachedJobs && cachedBanks) {
        customers = JSON.parse(cachedCustomers);
        workers = JSON.parse(cachedWorkers);
        jobs = JSON.parse(cachedJobs);
        banks = JSON.parse(cachedBanks);
        lineGroups = cachedLineGroups ? JSON.parse(cachedLineGroups) : [];
    } else {
        // Generate Mock Data for immediate usage & wow factor
        seedMockData();
    }
}

function saveData() {
    localStorage.setItem("mw_customers", JSON.stringify(customers));
    localStorage.setItem("mw_workers", JSON.stringify(workers));
    localStorage.setItem("mw_jobs", JSON.stringify(jobs));
    localStorage.setItem("mw_banks", JSON.stringify(banks));
    localStorage.setItem("mw_line_groups", JSON.stringify(lineGroups));
}

function seedMockData() {
    customers = [
        {
            id: "cust-1",
            taxId: "0105563024859",
            companyName: "บริษัท แปรรูปทะเลสงขลา จำกัด",
            businessType: "ประมงและแปรรูปสัตว์น้ำ",
            coordinator: "คุณนิพนธ์ ขาวสะอาด",
            phone: "081-555-9081",
            createdAt: "2026-07-02",
            branches: [
                {
                    name: "สำนักงานใหญ่ (หาดใหญ่)",
                    houseNo: "45/12",
                    moo: "3",
                    soi: "ซอย 5",
                    road: "กาญจนวณิชย์",
                    subdistrict: "คอหงส์",
                    district: "หาดใหญ่",
                    province: "สงขลา",
                    postalCode: "90110"
                },
                {
                    name: "สาขาโรงพ่นเกลือ (จะนะ)",
                    houseNo: "88",
                    moo: "1",
                    soi: "-",
                    road: "จะนะ-ปัตตานี",
                    subdistrict: "นาทับ",
                    district: "จะนะ",
                    province: "สงขลา",
                    postalCode: "90130"
                }
            ]
        },
        {
            id: "cust-2",
            taxId: "0994000182736",
            companyName: "ยะลาการเกษตร พาร์ทเนอร์",
            businessType: "เกษตรและปศุสัตว์",
            coordinator: "คุณปิยะ เจริญผล",
            phone: "073-221-482",
            createdAt: "2026-06-15",
            branches: [
                {
                    name: "สวนยางพารา 1",
                    houseNo: "9/9",
                    moo: "2",
                    soi: "-",
                    road: "เพชรเกษม",
                    subdistrict: "บันนังสตา",
                    district: "บันนังสตา",
                    province: "ยะลา",
                    postalCode: "95130"
                }
            ]
        },
        {
            id: "cust-3",
            taxId: "0945561008273",
            companyName: "หจก. ปัตตานีคอนกรีตพัฒนา",
            businessType: "ก่อสร้าง",
            coordinator: "คุณอามีน สาและ",
            phone: "089-776-5541",
            createdAt: "2026-07-05",
            branches: [
                {
                    name: "โรงหล่อคอนกรีต",
                    houseNo: "204",
                    moo: "6",
                    soi: "ซอยอัสลาม",
                    road: "ยะรัง",
                    subdistrict: "รูสะมิแล",
                    district: "เมืองปัตตานี",
                    province: "ปัตตานี",
                    postalCode: "94000"
                }
            ]
        }
    ];

    // Expiry calculation helper to generate upcoming alerts
    const today = new Date();
    
    // 1. Worker with passport expiring in 120 days (triggers 180-day alert)
    const expiryPassportSoon = new Date();
    expiryPassportSoon.setDate(today.getDate() + 120);

    // 2. Worker with Work permit expiring in 25 days (triggers 60-day alert)
    const expiryPermitSoon = new Date();
    expiryPermitSoon.setDate(today.getDate() + 25);

    // 3. Worker with already expired passport
    const expiryPassportExpired = new Date();
    expiryPassportExpired.setDate(today.getDate() - 15);

    workers = [
        {
            id: "work-1",
            employerId: "cust-1",
            title: "นาย",
            nationality: "Myanmar",
            workerUid: "1234567890112",
            permitNo: "WP-88901",
            permitExpiry: new Date(today.getFullYear(), today.getMonth() + 8, today.getDate()).toISOString().split('T')[0], // normal
            firstName: "Aung",
            lastName: "San",
            dob: "1994-08-15",
            passportNo: "CC1234567",
            passportPob: "Yangon",
            passportAuth: "Ministry of Labour",
            passportIssue: "2022-05-20",
            passportExpiry: expiryPassportSoon.toISOString().split('T')[0], // Alert (180 days)
            status: "active",
            createdAt: "2026-07-03",
            attachments: {
                "worker-wp-doc": "Aung_San_WorkPermit.pdf",
                "worker-passport": "Aung_San_Passport.pdf"
            }
        },
        {
            id: "work-2",
            employerId: "cust-3",
            title: "นางสาว",
            nationality: "Cambodia",
            workerUid: "0029988776655",
            permitNo: "WP-77215",
            permitExpiry: expiryPermitSoon.toISOString().split('T')[0], // Alert (60 days)
            firstName: "Sokha",
            lastName: "Meas",
            dob: "1997-12-04",
            passportNo: "KH9081273",
            passportPob: "Phnom Penh",
            passportAuth: "GD of Passport",
            passportIssue: "2023-04-12",
            passportExpiry: new Date(today.getFullYear(), today.getMonth() + 10, today.getDate()).toISOString().split('T')[0],
            status: "active",
            createdAt: "2026-07-06",
            attachments: {
                "worker-wp-doc": "Sokha_Meas_WorkPermit.pdf",
                "worker-passport": "Sokha_Meas_Passport.pdf"
            }
        },
        {
            id: "work-3",
            employerId: "cust-2",
            title: "นาย",
            nationality: "Laos",
            workerUid: "0038877112233",
            permitNo: "WP-66127",
            permitExpiry: new Date(today.getFullYear(), today.getMonth() + 5, today.getDate()).toISOString().split('T')[0],
            firstName: "Khamphou",
            lastName: "Sivilay",
            dob: "1991-03-22",
            passportNo: "LA8817263",
            passportPob: "Vientiane",
            passportAuth: "Ministry of FA",
            passportIssue: "2021-08-10",
            passportExpiry: expiryPassportExpired.toISOString().split('T')[0], // Expired
            status: "active",
            createdAt: "2026-06-20",
            attachments: {
                "worker-wp-doc": "Khamphou_Sivilay_WorkPermit.pdf",
                "worker-passport": "Khamphou_Sivilay_Passport.pdf"
            }
        },
        {
            id: "work-4",
            employerId: "cust-1",
            title: "นาย",
            nationality: "Myanmar",
            workerUid: "",
            permitNo: "",
            permitExpiry: "",
            firstName: "Min",
            lastName: "Thura",
            dob: "2000-01-10",
            passportNo: "",
            passportPob: "",
            passportAuth: "",
            passportIssue: "",
            passportExpiry: "",
            status: "active",
            createdAt: "2026-07-08",
            attachments: {} // Empty attachments list! Missing files!
        }
    ];

    banks = [
        {
            id: "bank-1",
            bankName: "ธนาคารกสิกรไทย",
            accountName: "นาย ศรุต คุณารักษ์",
            accountNumber: "026-1-82736-2",
            promptPayId: "0815559081"
        },
        {
            id: "bank-2",
            bankName: "ธนาคารไทยพาณิชย์",
            accountName: "นาย ศรุต คุณารักษ์",
            accountNumber: "408-2-99812-7",
            promptPayId: "1102988776655"
        }
    ];

    const todayDateStr = today.toISOString().split('T')[0];
    jobs = [
        // ตัวอย่างตามสถานการณ์จริง: คนงานเลขประจำตัว 1234567890112 (work-1) แจ้งงาน
        // 3 ประเภทพร้อมกันในครั้งเดียว (แจ้งเข้า / ซื้อประกัน / ย้ายตรา) ระบบแตกเป็น
        // 3 ใบงานแยกอิสระ แต่ผูกกันด้วย batchId เดียวกัน เพื่อให้เห็นว่าเปิดมาพร้อมกัน
        {
            id: "job-1",
            batchId: "batch-demo0001",
            createdAt: "2026-07-20",
            customerId: "cust-1",
            workerId: "work-1",
            jobType: "แจ้งเข้าคนงานต่างด้าว (2500)",
            fee: 2500,
            status: "กำลังดำเนินการ",
            notes: "แจ้งเข้าคนงานต่างด้าว - อยู่ระหว่างยื่นเรื่องที่สำนักงานจัดหางาน",
            orderNo: "",
            updatedAt: todayDateStr
        },
        {
            id: "job-2",
            batchId: "batch-demo0001",
            createdAt: "2026-07-20",
            customerId: "cust-1",
            workerId: "work-1",
            jobType: "ซื้อประกัน (1200)",
            fee: 1200,
            status: "รอดำเนินการ",
            notes: "รอเลือกแพ็กเกจประกันสุขภาพกับบริษัทประกัน",
            orderNo: "",
            updatedAt: todayDateStr
        },
        {
            id: "job-3",
            batchId: "batch-demo0001",
            createdAt: "2026-07-20",
            customerId: "cust-1",
            workerId: "work-1",
            jobType: "ย้ายตรา (3500)",
            fee: 3500,
            status: "เสร็จสิ้น",
            notes: "ย้ายตราเรียบร้อยแล้ว รอออกใบแจ้งหนี้",
            orderNo: "",
            updatedAt: todayDateStr
        },
        // ตัวอย่างที่ 2: คนงานอีกคน (work-2) มีงาน "แจ้งเข้าคนงานต่างด้าว" ค้างอยู่แล้ว
        // (สถานะ "รอเอกสารเพิ่มเติม" ซึ่งนับเป็น Open) ใช้สาธิตกฎห้ามเปิดงาน
        // ประเภทเดียวกันซ้อนกันให้คนงานคนเดิม จนกว่าจะแก้ไข/ปิดงานนี้ก่อน
        {
            id: "job-4",
            batchId: null,
            createdAt: "2026-07-18",
            customerId: "cust-2",
            workerId: "work-3",
            jobType: "แจ้งเข้าคนงานต่างด้าว (2500)",
            fee: 2500,
            status: "รอเอกสารเพิ่มเติม",
            notes: "รอสำเนาพาสปอร์ตฉบับเต็มจากนายจ้างเพื่อยื่นแจ้งเข้า",
            orderNo: "",
            updatedAt: todayDateStr
        },
        {
            id: "job-5",
            batchId: null,
            createdAt: "2026-07-10",
            customerId: "cust-3",
            workerId: "work-2",
            jobType: "เปลี่ยน/แก้ไข ใบอนุญาตทำงาน (1500)",
            fee: 1500,
            status: "ชำระเงินแล้ว",
            notes: "แก้ไขคำสะกดชื่อ-วันเดือนปีเกิด ยอดชำระเงินเรียบร้อยแล้ว",
            orderNo: "",
            updatedAt: todayDateStr
        }
    ];

    lineGroups = [
        {
            groupId: "c-mock-group-1",
            groupName: "ใบอนุญาตทำงานถึงวันที่ 13 ก.พ. 2570",
            createdAt: "2026-07-01"
        },
        {
            groupId: "c-mock-group-2",
            groupName: "ใบอนุญาตทำงานถึงวันที่ 31 มี.ค. 2570",
            createdAt: "2026-07-02"
        },
        {
            groupId: "c-mock-group-3",
            groupName: "ใบอนุญาตทำงานถึงวันที่ 11 ธ.ค. 2569",
            createdAt: "2026-07-03"
        },
        {
            groupId: "c-mock-group-4",
            groupName: "กลุ่มประสานงานทั่วไป (แอดมิน)",
            createdAt: "2026-07-04"
        }
    ];

    saveData();
}

async function initApp() {
    try {
        await loadData();
        hideLoginView();
        showMainLayout();
        
        // Set user UI info
        document.getElementById("user-display-name").innerText = currentUser ? currentUser.name : "User";
        document.getElementById("user-role-display").innerText = currentUser ? getRoleLabel(currentUser.role) : "";
        document.getElementById("user-avatar-initial").innerText = currentUser && currentUser.name ? currentUser.name.charAt(0) : "U";

        // Initial View
        switchView('dashboard');
        setupFormPermissions();
    } catch (e) {
        console.error("Error initializing app: ", e);
        logout(); // force logout to clear corrupted state
    }
}

function getRoleLabel(role) {
    if (role === 'admin') return 'Administrator (สิทธิ์เต็ม)';
    if (role === 'manager') return 'Manager (สิทธิ์เขียน)';
    if (role === 'client') return 'ลูกค้า/นายจ้าง (เฉพาะข้อมูลตนเอง)';
    return 'Staff (สิทธิ์ดูอย่างเดียว)';
}

function setupFormPermissions() {
    // Hide buttons if user has no permission
    const btnAddCust = document.getElementById("btn-add-customer");
    const btnAddWork = document.getElementById("btn-add-worker");
    const btnAddJob = document.getElementById("btn-add-job");
    const btnAddBank = document.getElementById("btn-add-bank");
    const menuUsers = document.getElementById("menu-users");

    const isStaff = currentUser.role === 'staff';
    const isClient = currentUser.role === 'client';
    
    if (btnAddCust) btnAddCust.style.display = (isStaff || isClient) ? 'none' : 'flex';
    if (btnAddWork) btnAddWork.style.display = isStaff ? 'none' : 'flex';
    if (btnAddJob) btnAddJob.style.display = isStaff ? 'none' : 'flex';
    if (btnAddBank) btnAddBank.style.display = (isStaff || isClient) ? 'none' : 'flex';
    if (menuUsers) menuUsers.classList.toggle('hidden', currentUser.role !== 'admin');
}

// ==================== AUTHENTICATION ====================
function fillDemoLogin(email, password) {
    document.getElementById("login-username").value = email;
    document.getElementById("login-password").value = password;
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const errorEl = document.getElementById("login-error");
    const btn = document.getElementById("btn-login");

    if (window.supabaseAdapter) {
        // Online login using Supabase Auth
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = "<span>⏳ กำลังเข้าสู่ระบบ...</span>";
        }
        try {
            const result = await window.supabaseAdapter.login(email, password);
            if (result && result.status === "success") {
                errorEl.style.display = 'none';
                // หมายเหตุ: ไม่เก็บรหัสผ่านไว้ในเครื่องอีกต่อไป — Supabase Auth จัดการ
                // session/token ให้เองผ่าน supabase-js (ปลอดภัยกว่าระบบเดิม)
                currentUser = {
                    email: result.user.email,
                    name: result.user.name,
                    role: result.user.role,
                    customer_id: result.user.customer_id
                };
                localStorage.setItem("mw_current_user", JSON.stringify(currentUser));
                showToast(`เข้าสู่ระบบสำเร็จในสิทธิ์ ${getRoleLabel(currentUser.role)}`, 'success');
                await initApp();
            } else {
                errorEl.style.display = 'block';
                errorEl.innerText = (result && result.message) || "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
            }
        } catch (err) {
            console.error("Cloud login error:", err);
            errorEl.style.display = 'block';
            errorEl.innerText = "ไม่สามารถเชื่อมต่อ Supabase ได้";
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = "<span>เข้าสู่ระบบ</span>";
            }
        }
        return;
    }

    // Fallback: Offline Mock login
    const matchedUser = USERS[email];
    if (matchedUser && matchedUser.password === password) {
        errorEl.style.display = 'none';
        currentUser = {
            email: matchedUser.email,
            name: matchedUser.name,
            role: matchedUser.role,
            customer_id: "ALL" // Mock admin has access to all
        };
        localStorage.setItem("mw_current_user", JSON.stringify(currentUser));
        showToast(`เข้าสู่ระบบสำเร็จในสิทธิ์ ${getRoleLabel(currentUser.role)}`, 'success');
        await initApp();
    } else {
        errorEl.style.display = 'block';
        errorEl.innerText = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    }
}

function logout() {
    localStorage.removeItem("mw_current_user");
    currentUser = null;
    hideMainLayout();
    showLoginView();
    showToast("ออกจากระบบเรียบร้อยแล้ว", "success");
}

function showLoginView() {
    document.getElementById("login-view").classList.add("active");
    document.getElementById("login-view").classList.remove("hidden");
}

function showResetPasswordView() {
    document.getElementById("login-view").classList.remove("active");
    document.getElementById("login-view").classList.add("hidden");
    document.getElementById("reset-password-view").classList.add("active");
    document.getElementById("reset-password-view").classList.remove("hidden");
}

async function handleResetPassword(e) {
    e.preventDefault();
    const newPassword = document.getElementById("reset-password-new").value;
    const confirmPassword = document.getElementById("reset-password-confirm").value;
    const errorEl = document.getElementById("reset-password-error");
    const btn = document.getElementById("btn-reset-password");

    if (newPassword.length < 8) {
        errorEl.innerText = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
        errorEl.style.display = 'block';
        return;
    }
    if (newPassword !== confirmPassword) {
        errorEl.innerText = "รหัสผ่านทั้งสองช่องไม่ตรงกัน";
        errorEl.style.display = 'block';
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = "<span>⏳ กำลังบันทึก...</span>";
    }
    try {
        const result = await window.supabaseAdapter.updatePassword(newPassword);
        if (result.status === "success") {
            await window.supabaseAdapter.signOut();
            // Drop the recovery token from the URL so a refresh doesn't loop back here
            history.replaceState(null, "", window.location.pathname + window.location.search);
            document.getElementById("reset-password-view").classList.remove("active");
            document.getElementById("reset-password-view").classList.add("hidden");
            showLoginView();
            showToast("ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง", "success");
        } else {
            errorEl.innerText = result.message || "ไม่สามารถตั้งรหัสผ่านใหม่ได้";
            errorEl.style.display = 'block';
        }
    } catch (err) {
        console.error("Reset password error:", err);
        errorEl.innerText = "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง";
        errorEl.style.display = 'block';
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = "<span>บันทึกรหัสผ่านใหม่</span>";
        }
    }
}

function hideLoginView() {
    document.getElementById("login-view").classList.remove("active");
    document.getElementById("login-view").classList.add("hidden");
}

function showMainLayout() {
    document.getElementById("main-layout").classList.remove("hidden");
}

function hideMainLayout() {
    document.getElementById("main-layout").classList.add("hidden");
}

// ==================== NAVIGATION / ROUTING ====================
function switchView(viewName) {
    // Toggles sections
    const sections = document.querySelectorAll(".content-section");
    sections.forEach(sec => sec.classList.add("hidden"));
    
    const activeSection = document.getElementById(`view-${viewName}`);
    if (activeSection) {
        activeSection.classList.remove("hidden");
    }

    // Toggle Sidebar active menu item
    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach(item => item.classList.remove("active"));
    
    const activeMenu = document.getElementById(`menu-${viewName}`);
    if (activeMenu) {
        activeMenu.classList.add("active");
    }

    // Update Topbar Title
    const titleEl = document.getElementById("topbar-title");
    if (viewName === 'dashboard') titleEl.innerText = "แดชบอร์ดระบบและการแจ้งเตือน";
    if (viewName === 'customers') titleEl.innerText = "ฐานข้อมูลนายจ้าง / ลูกค้าผู้ว่าจ้าง";
    if (viewName === 'workers') titleEl.innerText = "ฐานข้อมูลคนงานต่างด้าว";
    if (viewName === 'jobs') titleEl.innerText = "ระบบจัดการแจ้งงานและออกบิล";
    if (viewName === 'banks') titleEl.innerText = "จัดการบัญชีธนาคารผู้รับเงิน";
    if (viewName === 'users') titleEl.innerText = "จัดการบัญชีผู้ใช้งานระบบ";
    if (viewName === 'backup') titleEl.innerText = "สำรองและกู้คืนข้อมูลระบบ";

    // Refresh contents
    if (viewName === 'dashboard') {
        renderDashboard();
    } else if (viewName === 'customers') {
        renderCustomers();
    } else if (viewName === 'workers') {
        renderWorkers();
        updateEmployerDropdownOptions();
    } else if (viewName === 'jobs') {
        renderJobs();
    } else if (viewName === 'banks') {
        renderBanks();
    } else if (viewName === 'users') {
        renderUsers();
    } else if (viewName === 'backup') {
        renderLineGroups();
    }
}

// ==================== DASHBOARD ENGINE & CALCULATIONS ====================
function calculateDeadlines() {
    const alerts = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    workers.forEach(w => {
        const emp = customers.find(c => c.id === w.employerId);
        const empName = emp ? emp.companyName : "ไม่ระบุนายจ้าง";

        // 1. Passport / CI Expiry Check (180 days limit)
        const expPassDate = safeParseDate(w.passportExpiry);
        if (expPassDate) {
            expPassDate.setHours(0,0,0,0);
            const timeDiff = expPassDate - today;
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (daysDiff < 0) {
                alerts.push({
                    type: 'danger',
                    title: `พาสปอร์ตหมดอายุแล้ว (Expired)`,
                    message: `คนงาน: ${w.firstName} ${w.lastName} (${w.nationality}) หมดอายุเมื่อ ${expPassDate.toLocaleDateString('th-TH')}`,
                    target: w,
                    empName: empName,
                    daysLeft: daysDiff
                });
            } else if (daysDiff <= 180) {
                alerts.push({
                    type: 'warning',
                    title: `พาสปอร์ตใกล้หมดอายุ (ภายใน 180 วัน)`,
                    message: `คนงาน: ${w.firstName} ${w.lastName} (${w.nationality}) จะหมดอายุในอีก ${daysDiff} วัน (${expPassDate.toLocaleDateString('th-TH')})`,
                    target: w,
                    empName: empName,
                    daysLeft: daysDiff
                });
            }
        }

        // 2. Work Permit Expiry Check (60 days limit)
        const expPermitDate = safeParseDate(w.permitExpiry);
        if (expPermitDate) {
            expPermitDate.setHours(0,0,0,0);
            const timeDiff = expPermitDate - today;
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (daysDiff < 0) {
                alerts.push({
                    type: 'danger',
                    title: `ใบอนุญาตทำงานหมดอายุแล้ว (Expired)`,
                    message: `คนงาน: ${w.firstName} ${w.lastName} (${w.nationality}) หมดอายุเมื่อ ${expPermitDate.toLocaleDateString('th-TH')}`,
                    target: w,
                    empName: empName,
                    daysLeft: daysDiff
                });
            } else if (daysDiff <= 60) {
                alerts.push({
                    type: 'warning',
                    title: `ใบอนุญาตทำงานใกล้หมดอายุ (ภายใน 60 วัน)`,
                    message: `คนงาน: ${w.firstName} ${w.lastName} (${w.nationality}) จะหมดอายุในอีก ${daysDiff} วัน (${expPermitDate.toLocaleDateString('th-TH')})`,
                    target: w,
                    empName: empName,
                    daysLeft: daysDiff
                });
            }
        }
    });

    return alerts;
}

// วาดกราฟวงกลม (SVG โดนัท) แสดงสัดส่วนรายรับแยกตามประเภทงาน — ไม่ใช้ไลบรารีภายนอก
function renderJobTypesPieChart(jobTypeStats) {
    const container = document.getElementById("db-finance-jobtypes-chart");
    if (!container) return;

    const entries = Object.entries(jobTypeStats || {}).sort((a, b) => b[1].revenue - a[1].revenue);
    const total = entries.reduce((sum, [, stat]) => sum + stat.revenue, 0);

    if (entries.length === 0 || total <= 0) {
        container.innerHTML = `<p class="text-muted" style="text-align:center; padding: 25px;">❌ ไม่มีข้อมูลรายรับสำหรับแสดงกราฟ</p>`;
        return;
    }

    const colors = ['#d4af37', '#1e3a5f', '#16a34a', '#dc2626', '#7c3aed', '#0891b2', '#ea580c', '#64748b', '#db2777', '#65a30d'];
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let offsetAcc = 0;

    const circles = entries.map(([name, stat], idx) => {
        const fraction = stat.revenue / total;
        const dash = fraction * circumference;
        const gap = circumference - dash;
        const circle = `<circle r="${radius}" cx="100" cy="100" fill="transparent" stroke="${colors[idx % colors.length]}" stroke-width="36" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offsetAcc}"></circle>`;
        offsetAcc += dash;
        return circle;
    }).join('');

    const legend = entries.map(([name, stat], idx) => {
        const pct = ((stat.revenue / total) * 100).toFixed(1);
        return `
            <div style="display:flex; align-items:center; gap:6px; font-size:12px; margin-bottom:6px;">
                <span style="width:12px; height:12px; border-radius:3px; background:${colors[idx % colors.length]}; display:inline-block; flex-shrink:0;"></span>
                <span>${name} — ${stat.revenue.toLocaleString('th-TH')} บ. (${pct}%)</span>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <svg viewBox="0 0 200 200" width="220" height="220" style="transform: rotate(-90deg); flex-shrink: 0;">
            ${circles}
        </svg>
        <div>${legend}</div>
    `;
}

// สลับมุมมองแดชบอร์ดระหว่างตารางเดิมกับกราฟวงกลม
function toggleJobTypesView(mode) {
    const tableWrap = document.getElementById("db-finance-jobtypes-table-wrap");
    const chartWrap = document.getElementById("db-finance-jobtypes-chart-wrap");
    const btnTable = document.getElementById("btn-jobtypes-view-table");
    const btnChart = document.getElementById("btn-jobtypes-view-chart");
    if (!tableWrap || !chartWrap || !btnTable || !btnChart) return;

    if (mode === 'chart') {
        tableWrap.classList.add("hidden");
        chartWrap.classList.remove("hidden");
        btnChart.classList.remove("btn-outline"); btnChart.classList.add("btn-gold");
        btnTable.classList.remove("btn-gold"); btnTable.classList.add("btn-outline");
    } else {
        chartWrap.classList.add("hidden");
        tableWrap.classList.remove("hidden");
        btnTable.classList.remove("btn-outline"); btnTable.classList.add("btn-gold");
        btnChart.classList.remove("btn-gold"); btnChart.classList.add("btn-outline");
    }
}

function renderDashboard() {
    // 1. Calculations
    const totalCustomers = customers.length;
    const totalWorkers = workers.length;
    const alerts = calculateDeadlines();
    const expiryWarnings = alerts.length;
    
    const missingWorkersCount = workers.filter(w => isWorkerMissingDocs(w)).length;

    // Update Stats Card Numbers
    document.getElementById("stat-total-customers").innerText = totalCustomers;
    document.getElementById("stat-total-workers").innerText = totalWorkers;
    document.getElementById("stat-expiry-warnings").innerText = expiryWarnings;
    
    const statMissingEl = document.getElementById("stat-missing-docs");
    if (statMissingEl) statMissingEl.innerText = missingWorkersCount;

    // Bell alerts badges
    const bellBadge = document.getElementById("bell-alert-badge");
    const navBadge = document.getElementById("nav-alert-badge");
    if (expiryWarnings > 0) {
        bellBadge.innerText = expiryWarnings;
        bellBadge.style.display = 'flex';
        navBadge.innerText = expiryWarnings;
        navBadge.style.display = 'inline-block';
    } else {
        bellBadge.style.display = 'none';
        navBadge.style.display = 'none';
    }

    // Default Tab
    switchDashboardTab('overview');
}

function switchDashboardTab(tabName) {
    const tabs = ['overview', 'monthly', 'finance'];
    tabs.forEach(t => {
        const pane = document.getElementById(`db-tab-${t}`);
        const btn = document.getElementById(`btn-tab-${t}`);
        if (pane) {
            if (t === tabName) {
                pane.classList.remove('hidden');
            } else {
                pane.classList.add('hidden');
            }
        }
        if (btn) {
            if (t === tabName) {
                btn.classList.add('btn-gold');
                btn.classList.remove('btn-outline');
            } else {
                btn.classList.remove('btn-gold');
                btn.classList.add('btn-outline');
            }
        }
    });

    if (tabName === 'overview') {
        renderDashboardOverview();
    } else if (tabName === 'monthly') {
        renderMonthlyStats();
    } else if (tabName === 'finance') {
        renderFinanceStats();
    }
}

function renderDashboardOverview() {
    // 1. Render Grouped Alerts by Employer
    renderEmployerAlerts();

    // 2. Render Nationality Charts (CSS Progress Bars)
    const nationalityCounts = {};
    workers.forEach(w => {
        nationalityCounts[w.nationality] = (nationalityCounts[w.nationality] || 0) + 1;
    });

    const nationalityBarsEl = document.getElementById("nationality-bars");
    if (workers.length === 0) {
        nationalityBarsEl.innerHTML = '<p class="text-muted">ไม่มีข้อมูลคนงานต่างด้าวสำหรับวิเคราะห์สัญชาติ</p>';
    } else {
        nationalityBarsEl.innerHTML = Object.entries(nationalityCounts).map(([nat, count]) => {
            const pct = Math.round((count / workers.length) * 100);
            let colorClass = nat.toLowerCase();
            let label = nat;
            if (nat === 'Myanmar') label = 'เมียนมา (Myanmar)';
            if (nat === 'Cambodia') label = 'กัมพูชา (Cambodia)';
            if (nat === 'Laos') label = 'ลาว (Laos)';
            if (nat === 'Vietnam') label = 'เวียดนาม (Vietnam)';

            return `
                <div class="chart-bar-item">
                    <div class="bar-info">
                        <span>${label}</span>
                        <span>${count} คน (${pct}%)</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill ${colorClass}" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 3. Render Province Location distribution
    const locationCounts = {};
    customers.forEach(c => {
        c.branches.forEach(b => {
            if (b.province) {
                locationCounts[b.province] = (locationCounts[b.province] || 0) + 1;
            }
        });
    });

    const customerLocsEl = document.getElementById("customer-locations");
    const provincesList = PROVINCES.map(p => {
        const count = locationCounts[p] || 0;
        return `
            <div class="location-item">
                <span class="location-name">📍 จังหวัด ${p}</span>
                <span class="badge badge-gold" style="font-weight: 500;">${count} สาขา/กิจการ</span>
            </div>
        `;
    }).join('');
    customerLocsEl.innerHTML = provincesList;
    
    // Render missing docs list
    renderMissingDocsOverview();
}

function renderEmployerAlerts() {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const tbody = document.getElementById("dashboard-employer-alerts-tbody");
    if (!tbody) return;

    // Filter employers who have document warnings/expires
    const rows = customers.map(c => {
        const empWorkers = workers.filter(w => w.employerId === c.id && w.status !== 'archived');
        
        let expiredCount = 0;
        let warningCount = 0;
        
        empWorkers.forEach(w => {
            let passDaysDiff = 9999;
            let permitDaysDiff = 9999;

            if (w.passportExpiry) {
                const exp = new Date(w.passportExpiry);
                passDaysDiff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
            }
            if (w.permitExpiry) {
                const exp = new Date(w.permitExpiry);
                permitDaysDiff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
            }

            const isExpired = passDaysDiff < 0 || permitDaysDiff < 0;
            const isWarning = (passDaysDiff >= 0 && passDaysDiff <= 180) || (permitDaysDiff >= 0 && permitDaysDiff <= 60);
            
            if (isExpired) expiredCount++;
            else if (isWarning) warningCount++;
        });

        return {
            customer: c,
            expiredCount,
            warningCount,
            totalAlerts: expiredCount + warningCount
        };
    }).filter(item => item.totalAlerts > 0)
      .sort((a, b) => b.totalAlerts - a.totalAlerts);

    document.getElementById("alert-employer-count-badge").innerText = `${rows.length} บริษัท`;

    if (rows.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-muted" style="text-align: center; padding: 20px;">
                    ✅ เอกสารคนงานทุกบริษัทอยู่ในสถานะปกติเรียบร้อยดี
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = rows.map(r => {
        const expiredBadge = r.expiredCount > 0 ? 
            `<span class="badge badge-danger" style="font-weight: 600;">⚠️ หมดอายุแล้ว ${r.expiredCount} คน</span>` : 
            `<span class="text-muted">ไม่มี</span>`;
            
        const warningBadge = r.warningCount > 0 ? 
            `<span class="badge badge-warning" style="font-weight: 600; color: var(--navy-medium); border-color: var(--navy-medium);">⏰ ใกล้หมดอายุ ${r.warningCount} คน</span>` : 
            `<span class="text-muted">ไม่มี</span>`;

        return `
            <tr>
                <td><strong>${r.customer.companyName}</strong></td>
                <td>${warningBadge}</td>
                <td>${expiredBadge}</td>
                <td style="text-align: center;">
                    <button class="btn btn-sm btn-gold" onclick="viewEmployerAlertedWorkers('${r.customer.id}')" style="font-size: 11.5px; padding: 4px 10px;">
                        🔎 ตรวจสอบรายชื่อ
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function viewEmployerAlertedWorkers(employerId) {
    switchView('workers');
    const selectEmp = document.getElementById("filter-worker-employer");
    if (selectEmp) {
        selectEmp.value = employerId;
    }
    const selectStatus = document.getElementById("filter-worker-employment-status");
    if (selectStatus) {
        selectStatus.value = "all"; // show all to find both active and archived workers
    }
    renderWorkers();
}

// ==================== CUSTOMER (EMPLOYER) VIEW MANAGEMENT ====================
let customersCurrentPage = 1;
const customersPageSize = 50; // Optimized for 300+ customers

function changeCustomersPage(direction) {
    const totalPages = Math.ceil(customers.length / customersPageSize) || 1;
    customersCurrentPage += direction;
    if (customersCurrentPage < 1) customersCurrentPage = 1;
    if (customersCurrentPage > totalPages) customersCurrentPage = totalPages;
    renderCustomers();
}

function renderCustomers() {
    const query = document.getElementById("search-customer").value.toLowerCase();
    const tbody = document.getElementById("customers-list-tbody");
    
    // Filter
    const filtered = customers.filter(c => {
        const isDeleted = c.status === 'deleted';
        if (!query) {
            return !isDeleted;
        }
        return (c.companyName || "").toLowerCase().includes(query) ||
               (c.taxId || "").toLowerCase().includes(query) ||
               (c.coordinator || "").toLowerCase().includes(query) ||
               (c.businessType || "").toLowerCase().includes(query);
    });

    // Pagination calculations
    const totalPages = Math.ceil(filtered.length / customersPageSize) || 1;
    if (customersCurrentPage > totalPages) customersCurrentPage = totalPages;
    if (customersCurrentPage < 1) customersCurrentPage = 1;

    const pageInfo = document.getElementById("customers-page-info");
    const prevBtn = document.getElementById("btn-prev-customers");
    const nextBtn = document.getElementById("btn-next-customers");

    if (pageInfo) pageInfo.innerText = `หน้า ${customersCurrentPage} จาก ${totalPages}`;
    if (prevBtn) prevBtn.disabled = customersCurrentPage === 1;
    if (nextBtn) nextBtn.disabled = customersCurrentPage === totalPages;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-muted" style="text-align: center; padding: 40px;">
                    ❌ ไม่พบข้อมูลลูกค้า/นายจ้างตามคำค้นหา
                </td>
            </tr>
        `;
        return;
    }

    const startIdx = (customersCurrentPage - 1) * customersPageSize;
    const paginated = filtered.slice(startIdx, startIdx + customersPageSize);

    tbody.innerHTML = paginated.map(c => {
        const hqBranch = c.branches.find(b => b.name.includes("สำนักงานใหญ่")) || c.branches[0];
        const hqAddress = hqBranch ? 
            `เลขที่ ${hqBranch.houseNo} ม.${hqBranch.moo} ต.${hqBranch.subdistrict} อ.${hqBranch.district} จ.${hqBranch.province}` : 
            "ไม่ได้ระบุที่อยู่";
        
        // Exclude delete buttons for managers/staff
        let deleteBtn = '';
        if (currentUser.role === 'admin') {
            deleteBtn = `
                <button class="action-icon-btn delete-btn" onclick="deleteCustomer('${c.id}', ${c._rowNum || 'null'})" title="ลบข้อมูล">
                    🗑️
                </button>
            `;
        }

        let editBtn = '';
        if (currentUser.role !== 'staff') {
            editBtn = `
                <button class="action-icon-btn" onclick="openCustomerModal('${c.id}')" title="แก้ไขข้อมูล">
                    ✏️
                </button>
            `;
        }

        const activeWorkersCount = workers.filter(w => w.employerId === c.id && w.status !== 'archived' && w.status !== 'deleted').length;
        const totalWorkersCount = workers.filter(w => w.employerId === c.id && w.status !== 'deleted').length;
        
        const statusLabel = c.status === 'deleted' ? 
            ' <span class="badge" style="background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); font-size: 10px; padding: 2px 6px; margin-left: 4px;">ลบแล้ว/เก็บถาวร</span>' : 
            '';
        
        const attachHtml = `
            <div style="display: flex; gap: 4px; justify-content: center;">
                <button class="action-icon-btn" onclick="openDriveFolder('${c.drive_folder_id || ''}')" title="เปิดโฟลเดอร์เอกสารของนายจ้างรายนี้ใน Google Drive">📁</button>
            </div>
        `;

        return `
            <tr>
                <td><strong>${c.taxId}</strong></td>
                <td><strong>${c.companyName}${statusLabel}</strong></td>
                <td><span class="badge badge-gold">${c.businessType}</span></td>
                <td>${hqAddress}</td>
                <td>
                    <div>${c.coordinator}</div>
                    <small class="text-muted">${c.phone}</small>
                </td>
                <td>
                    <span class="badge badge-gold" style="cursor: pointer;" onclick="filterWorkersByEmployer('${c.id}')" title="คลิกเพื่อสืบค้นรายชื่อคนงาน">
                        👤 ${activeWorkersCount} คน (ทั้งหมด ${totalWorkersCount} คน)
                    </span>
                </td>
                <td>${attachHtml}</td>
                <td class="actions-col">
                    <div class="actions-cell">
                        ${editBtn}
                        ${deleteBtn}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== WORKERS VIEW MANAGEMENT ====================
function updateEmployerDropdownOptions() {
    const filterEmpSelect = document.getElementById("filter-worker-employer");
    const modalEmpSelect = document.getElementById("worker-employer-id");

    const optionsHTML = customers.map(c => `<option value="${c.id}">${c.companyName}</option>`).join('');
    
    if (filterEmpSelect) {
        filterEmpSelect.innerHTML = '<option value="">ทุกนายจ้าง/บริษัท</option>' + optionsHTML;
    }
    if (modalEmpSelect) {
        modalEmpSelect.innerHTML = '<option value="" disabled selected>--- เลือกนายจ้าง/บริษัท ---</option>' + optionsHTML;
    }
}

let workersCurrentPage = 1;
const workersPageSize = 50; // optimized for 3,000+ migrant workers

function changeWorkersPage(direction) {
    const totalPages = Math.ceil(workers.length / workersPageSize) || 1;
    workersCurrentPage += direction;
    if (workersCurrentPage < 1) workersCurrentPage = 1;
    if (workersCurrentPage > totalPages) workersCurrentPage = totalPages;
    renderWorkers();
}

function renderWorkers() {
    const searchVal = document.getElementById("search-worker").value.toLowerCase();
    const natFilter = document.getElementById("filter-worker-nationality").value;
    const empFilter = document.getElementById("filter-worker-employer").value;
    const statusFilter = document.getElementById("filter-worker-status").value;
    const empStatusFilter = document.getElementById("filter-worker-employment-status") ? 
        document.getElementById("filter-worker-employment-status").value : "active";

    const tbody = document.getElementById("workers-list-tbody");
    const today = new Date();
    today.setHours(0,0,0,0);

    // Filtering logic
    const filtered = workers.filter(w => {
        const emp = customers.find(c => c.id === w.employerId);
        const empName = emp ? (emp.companyName || "").toLowerCase() : "";
        
        const matchSearch = 
            (w.firstName || "").toLowerCase().includes(searchVal) ||
            (w.lastName || "").toLowerCase().includes(searchVal) ||
            (w.workerUid || "").includes(searchVal) ||
            (w.nationality || "").toLowerCase().includes(searchVal) ||
            (w.passportNo || "").toLowerCase().includes(searchVal) ||
            (w.permitNo && w.permitNo.toLowerCase().includes(searchVal)) ||
            empName.includes(searchVal);

        // Nationality filter
        const matchNat = natFilter === "" || w.nationality === natFilter;

        // Employer filter
        const matchEmp = empFilter === "" || w.employerId === empFilter;

        // Expiry status filter logic
        let passDaysDiff = 9999;
        let permitDaysDiff = 9999;

        if (w.passportExpiry) {
            const exp = new Date(w.passportExpiry);
            passDaysDiff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        }
        if (w.permitExpiry) {
            const exp = new Date(w.permitExpiry);
            permitDaysDiff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        }

        const isExpired = passDaysDiff < 0 || permitDaysDiff < 0;
        const isWarning = (passDaysDiff >= 0 && passDaysDiff <= 180) || (permitDaysDiff >= 0 && permitDaysDiff <= 60);
        const isNormal = !isExpired && !isWarning;

        let matchStatus = true;
        if (statusFilter === 'normal') matchStatus = isNormal;
        if (statusFilter === 'warning') matchStatus = isWarning;
        if (statusFilter === 'expired') matchStatus = isExpired;

        // Employment status filter (active/pending_register/archived)
        const wStatus = w.status || 'active';
        let matchEmpStatus = true;
        if (!searchVal) {
            if (wStatus === 'deleted') return false; // Hide completely in default view
            if (empStatusFilter === 'active') matchEmpStatus = wStatus === 'active';
            if (empStatusFilter === 'pending_register') matchEmpStatus = wStatus === 'pending_register';
            if (empStatusFilter === 'archived') matchEmpStatus = wStatus === 'archived';
        } else {
            // Search query matches both active and deleted
            matchEmpStatus = true;
        }

        return matchSearch && matchNat && matchEmp && matchStatus && matchEmpStatus;
    });

    // Pagination calculations
    const totalPages = Math.ceil(filtered.length / workersPageSize) || 1;
    if (workersCurrentPage > totalPages) workersCurrentPage = totalPages;
    if (workersCurrentPage < 1) workersCurrentPage = 1;

    const pageInfo = document.getElementById("workers-page-info");
    const prevBtn = document.getElementById("btn-prev-workers");
    const nextBtn = document.getElementById("btn-next-workers");

    if (pageInfo) pageInfo.innerText = `หน้า ${workersCurrentPage} จาก ${totalPages}`;
    if (prevBtn) prevBtn.disabled = workersCurrentPage === 1;
    if (nextBtn) nextBtn.disabled = workersCurrentPage === totalPages;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-muted" style="text-align: center; padding: 40px;">
                    ❌ ไม่พบข้อมูลคนงานต่างด้าวตามตัวกรอง
                </td>
            </tr>
        `;
        return;
    }

    const startIdx = (workersCurrentPage - 1) * workersPageSize;
    const paginated = filtered.slice(startIdx, startIdx + workersPageSize);

    tbody.innerHTML = paginated.map(w => {
        const emp = customers.find(c => c.id === w.employerId);
        const empName = emp ? emp.companyName : "ไม่ระบุนายจ้าง";

        // Status badges logic
        const pExpDate = safeParseDate(w.passportExpiry);
        const wpExpDate = safeParseDate(w.permitExpiry);
        const pDiff = pExpDate && !isNaN(pExpDate.getTime()) ? Math.ceil((pExpDate - today) / (1000 * 60 * 60 * 24)) : 9999;
        const wpDiff = wpExpDate && !isNaN(wpExpDate.getTime()) ? Math.ceil((wpExpDate - today) / (1000 * 60 * 60 * 24)) : 9999;

        let statusBadge = '<span class="badge badge-success">ปกติ</span>';
        if (w.status === 'deleted') {
            statusBadge = '<span class="badge" style="background-color: #ef4444; color: white;">ลบแล้ว/เก็บถาวร</span>';
        } else if (w.status === 'archived') {
            statusBadge = '<span class="badge" style="background-color: #64748b; color: white;">พ้นสภาพ/แจ้งออก</span>';
        } else if ((pExpDate && pDiff < 0) || (wpExpDate && wpDiff < 0)) {
            statusBadge = '<span class="badge badge-danger">หมดอายุ</span>';
        } else if ((pExpDate && pDiff <= 180) || (wpExpDate && wpDiff <= 60)) {
            statusBadge = '<span class="badge badge-warning">ใกล้หมดอายุ</span>';
        }

        // Attachments logic: In-app folder manager + real Google Drive folder
        const attachHtml = `
            <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                <button class="btn btn-sm btn-gold" onclick="openWorkerFolderModal('${w.id}')" style="font-size: 11.5px; padding: 5px 12px; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px;">
                    📂 เปิดแฟ้มเอกสาร
                </button>
                <button class="action-icon-btn" onclick="openDriveFolder('${w.drive_folder_id || ''}')" title="เปิดโฟลเดอร์เอกสารของคนงานรายนี้ใน Google Drive">📁</button>
            </div>
        `;

        // Exclude delete buttons for managers/staff
        let deleteBtn = '';
        if (currentUser.role === 'admin') {
            deleteBtn = `
                <button class="action-icon-btn delete-btn" onclick="deleteWorker('${w.id}', ${w._rowNum || 'null'})" title="ลบข้อมูล">
                    🗑️
                </button>
            `;
        }

        let editBtn = '';
        if (currentUser.role !== 'staff') {
            editBtn = `
                <button class="action-icon-btn" onclick="openWorkerModal('${w.id}')" title="แก้ไขข้อมูล">
                    ✏️
                </button>
            `;
        }

        const avatarUrl = w.photo ? w.photo : 'data:image/svg+xml;utf8,<svg xmlns="http:' + '/' + '/www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="%2394a3b8"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 3.58-8 8v1h16v-1c0-4.42-3.58-8-8-8z"/></svg>';

        return `
            <tr>
                <td>
                    <div><strong>${w.workerUid || '-'}</strong></div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background-color: #f1f5f9; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div>
                            <strong>${w.title ? w.title + ' ' : ''}${w.firstName || '-'} ${w.lastName || ''}</strong>
                            ${(w.fatherName || w.motherName) ? `<div style="font-size:10px; color:var(--text-muted); margin-top:2px;">พ่อ: ${w.fatherName || '-'} / แม่: ${w.motherName || '-'}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td><span class="badge badge-gold">${w.nationality || '-'}</span></td>
                <td>
                    <div>เล่ม: ${w.passportNo || '-'}</div>
                    ${pExpDate ? `
                    <small class="${pDiff < 0 ? 'text-danger' : (pDiff <= 180 ? 'text-warning' : 'text-muted')}">
                        หมดอายุ: ${pExpDate.toLocaleDateString('th-TH')} (${pDiff < 0 ? 'หมดอายุแล้ว' : `อีก ${pDiff} วัน`})
                    </small>
                    ` : '<small class="text-muted">หมดอายุ: -</small>'}
                </td>
                <td>
                    <div>เลขที่: ${w.permitNo || '-'}</div>
                    ${wpExpDate ? `
                    <small class="${wpDiff < 0 ? 'text-danger' : (wpDiff <= 60 ? 'text-warning' : 'text-muted')}">
                        หมดอายุ: ${wpExpDate.toLocaleDateString('th-TH')} (${wpDiff < 0 ? 'หมดอายุแล้ว' : `อีก ${wpDiff} วัน`})
                    </small>
                    ` : '<small class="text-muted">หมดอายุ: -</small>'}
                </td>
                <td>${empName}</td>
                <td>${statusBadge}</td>
                <td>${attachHtml}</td>
                <td class="actions-col">
                    <div class="actions-cell">
                        ${editBtn}
                        ${deleteBtn}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}


// ==================== BRANCH MANAGEMENT SYSTEM ====================
let customerBranches = [];

function renderBranchesInputs() {
    const container = document.getElementById("branches-list-container");
    if (customerBranches.length === 0) {
        // Always enforce at least one headquarters branch
        customerBranches.push({
            name: "สำนักงานใหญ่",
            houseNo: "", moo: "", soi: "", road: "", subdistrict: "", district: "", province: "สงขลา", postalCode: ""
        });
    }

    container.innerHTML = customerBranches.map((b, idx) => `
        <div class="branch-card" data-index="${idx}">
            <div class="branch-card-header">
                <span class="branch-card-title">📍 สาขาที่ ${idx + 1}: </span>
                <input type="text" class="branch-name-input" value="${b.name}" placeholder="ชื่อสาขา เช่น สำนักงานใหญ่, คลังสินค้า" style="width: 250px; font-weight: 600; padding: 4px 8px; border: 1px dashed var(--gold-primary);" oninput="updateBranchField(${idx}, 'name', this.value)">
                ${idx > 0 ? `<button type="button" class="btn-remove-branch" onclick="removeBranchInput(${idx})">ลบสาขานี้</button>` : ''}
            </div>
            
            <div class="form-row">
                <div class="form-group col-4">
                    <label>เลขที่ บ้านเลขที่</label>
                    <input type="text" value="${b.houseNo}" oninput="updateBranchField(${idx}, 'houseNo', this.value)" placeholder="เช่น 123/4" required>
                </div>
                <div class="form-group col-4">
                    <label>หมู่ที่</label>
                    <input type="text" value="${b.moo}" oninput="updateBranchField(${idx}, 'moo', this.value)" placeholder="เช่น 5">
                </div>
                <div class="form-group col-4">
                    <label>ซอย</label>
                    <input type="text" value="${b.soi}" oninput="updateBranchField(${idx}, 'soi', this.value)" placeholder="เช่น ซอย 2">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group col-4">
                    <label>ถนน</label>
                    <input type="text" value="${b.road}" oninput="updateBranchField(${idx}, 'road', this.value)" placeholder="เช่น ถ.สุขุมวิท">
                </div>
                <div class="form-group col-4">
                    <label>จังหวัด</label>
                    <select onchange="updateBranchProvince(${idx}, this.value)" required>
                        <option value="">-- เลือกจังหวัด --</option>
                        ${Object.keys(SOUTHERN_ADDRESS_DB).map(p => `<option value="${p}" ${b.province === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group col-4">
                    <label>อำเภอ / เขต</label>
                    <select onchange="updateBranchDistrict(${idx}, this.value)" required ${!b.province ? 'disabled' : ''}>
                        <option value="">-- เลือกอำเภอ --</option>
                        ${b.province && SOUTHERN_ADDRESS_DB[b.province] ? Object.keys(SOUTHERN_ADDRESS_DB[b.province]).map(d => `<option value="${d}" ${b.district === d ? 'selected' : ''}>${d}</option>`).join('') : ''}
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group col-6">
                    <label>ตำบล / แขวง</label>
                    <select onchange="updateBranchSubdistrict(${idx}, this.value)" required ${!b.district ? 'disabled' : ''}>
                        <option value="">-- เลือกตำบล --</option>
                        ${b.province && b.district && SOUTHERN_ADDRESS_DB[b.province][b.district] ? SOUTHERN_ADDRESS_DB[b.province][b.district].subs.map(s => `<option value="${s}" ${b.subdistrict === s ? 'selected' : ''}>${s}</option>`).join('') : ''}
                    </select>
                </div>
                <div class="form-group col-6">
                    <label>รหัสไปรษณีย์</label>
                    <input type="text" value="${b.postalCode}" placeholder="รหัสไปรษณีย์" readonly required style="background-color: #f1f5f9; cursor: not-allowed;">
                </div>
            </div>
        </div>
    `).join('');
}

function addNewBranchInput() {
    customerBranches.push({
        name: `สาขาเพิ่มเติม ${customerBranches.length + 1}`,
        houseNo: "", moo: "", soi: "", road: "", subdistrict: "", district: "", province: "", postalCode: ""
    });
    renderBranchesInputs();
}

function removeBranchInput(idx) {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบที่อยู่สาขานี้ออกจากฟอร์ม?")) return;
    customerBranches.splice(idx, 1);
    renderBranchesInputs();
}

function updateBranchField(idx, field, value) {
    if (customerBranches[idx]) {
        customerBranches[idx][field] = value;
    }
}

function updateBranchProvince(idx, province) {
    if (customerBranches[idx]) {
        customerBranches[idx].province = province;
        customerBranches[idx].district = "";
        customerBranches[idx].subdistrict = "";
        customerBranches[idx].postalCode = "";
        renderBranchesInputs();
    }
}

function updateBranchDistrict(idx, district) {
    if (customerBranches[idx]) {
        customerBranches[idx].district = district;
        customerBranches[idx].subdistrict = "";
        customerBranches[idx].postalCode = "";
        renderBranchesInputs();
    }
}

function updateBranchSubdistrict(idx, subdistrict) {
    if (customerBranches[idx]) {
        customerBranches[idx].subdistrict = subdistrict;
        const prov = customerBranches[idx].province;
        const dist = customerBranches[idx].district;
        if (prov && dist && SOUTHERN_ADDRESS_DB[prov] && SOUTHERN_ADDRESS_DB[prov][dist]) {
            customerBranches[idx].postalCode = SOUTHERN_ADDRESS_DB[prov][dist].zip;
        }
        renderBranchesInputs();
    }
}


// ==================== MOCK AI OCR DRAG AND DROP HANDLERS ====================
function dragOverHandler(e) {
    e.preventDefault();
    e.currentTarget.classList.add("dragover");
}

function dragLeaveHandler(e) {
    e.currentTarget.classList.remove("dragover");
}

function dropDocHandler(e, docType) {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processUploadedFile(e.dataTransfer.files[0], docType);
    }
}

function fileSelectHandler(e, docType) {
    if (e.target.files && e.target.files.length > 0) {
        processUploadedFile(e.target.files[0], docType);
    }
}

let tempWorkerAttachments = {};
let tempCustomerAttachments = {}; // ไฟล์แนบของนายจ้างที่ยังไม่ได้อัปโหลด รอจนกว่าจะบันทึกลูกค้า/นายจ้างสำเร็จก่อน (มี id + โฟลเดอร์ Drive จริง)

function dropCustomerDocHandler(e, docType) {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processCustomerDocFile(e.dataTransfer.files[0], docType);
    }
}

function customerFileSelectHandler(e, docType) {
    if (e.target.files && e.target.files.length > 0) {
        processCustomerDocFile(e.target.files[0], docType);
    }
}

// เก็บไฟล์แนบของนายจ้างไว้ในหน่วยความจำก่อน (ยังไม่อัปโหลดขึ้น Drive ทันที) เพราะตอนนี้ลูกค้า/นายจ้าง
// อาจยังไม่มี id หรือโฟลเดอร์ Drive จริง (กรณีเพิ่มนายจ้างใหม่) — ไฟล์จะถูกอัปโหลดจริงหลังกด "บันทึกข้อมูล"
// สำเร็จแล้วเท่านั้น เพื่อให้ไฟล์ไปอยู่ในโฟลเดอร์ของนายจ้างรายนั้นถูกต้อง ไม่มีการอ่านข้อมูลด้วย AI ใดๆ
function processCustomerDocFile(file, docType) {
    const statusEl = document.getElementById(`status-${docType}`);
    const uploadBox = document.getElementById(`drop-${docType}`);
    if (!statusEl) return;

    statusEl.innerHTML = `<span class="ai-processing">📎 กำลังแนบไฟล์...</span>`;

    const reader = new FileReader();
    reader.onload = function(e) {
        const fileContent = e.target.result;
        tempCustomerAttachments[docType] = { name: file.name, data: fileContent };
        statusEl.innerHTML = `<span class="ai-success">✅ แนบไฟล์แล้ว (จะอัปโหลดตอนกดบันทึก)</span>`;
        if (uploadBox) uploadBox.classList.add("success-upload");
    };
    reader.readAsDataURL(file);
}

// เติมข้อมูลลงฟอร์มคนงานจากผลลัพธ์ AI (Gemini) เท่านั้น — เติมเฉพาะฟิลด์ที่ AI อ่านเจอจริงๆ
// ไม่มีการเดา/สุ่มข้อมูลใดๆ ถ้า AI อ่านฟิลด์ไหนไม่เจอ ฟิลด์นั้นจะถูกข้ามไปเฉยๆ
function applyGeminiDataToWorkerForm(docType, parsedData) {
    if (!parsedData) return;
    const setVal = (id, val) => {
        if (val === undefined || val === null || val === "") return;
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    if (docType === 'worker-wp-doc') {
        setVal("worker-uid", parsedData.uid);
        setVal("worker-permit-no", parsedData.permitNo);
        setVal("worker-permit-expiry", parsedData.permitExpiry);
        setVal("worker-first-name", parsedData.firstName);
        setVal("worker-last-name", parsedData.lastName);
        setVal("worker-dob", parsedData.dob);
        setVal("worker-ref-no", parsedData.refNo);
        setVal("worker-position", parsedData.position);
        setVal("worker-workplace", parsedData.workplace);
        if (parsedData.nationality) {
            const natSelect = document.getElementById("worker-nationality");
            const validOption = Array.from(natSelect.options).some(o => o.value === parsedData.nationality);
            if (validOption) natSelect.value = parsedData.nationality;
        }
        if (parsedData.gender) {
            const g = parsedData.gender.toLowerCase();
            const genderSelect = document.getElementById("worker-gender");
            if (genderSelect) {
                if (g.includes("female") || g.includes("หญิง")) genderSelect.value = "Female";
                else if (g.includes("male") || g.includes("ชาย")) genderSelect.value = "Male";
            }
        }
    } else if (docType === 'worker-passport') {
        setVal("worker-passport-no", parsedData.passportNo);
        setVal("worker-passport-pob", parsedData.passportPob);
        setVal("worker-passport-auth", parsedData.passportAuth);
        setVal("worker-passport-issue", parsedData.passportIssue);
        setVal("worker-passport-expiry", parsedData.passportExpiry);
        setVal("worker-dob", parsedData.dob);
    }
}

// แนบไฟล์เอกสารคนงาน แล้วอัปโหลดขึ้น Google Drive (ไม่มีการอ่านข้อมูลด้วย AI ปลอมๆ อีกต่อไป — ใช้ Gemini จริงเท่านั้น)
function processUploadedFile(file, docType) {
    const statusEl = document.getElementById(`status-${docType}`);
    const uploadBox = document.getElementById(`drop-${docType}`);
    
    if (!statusEl) return;

    statusEl.innerHTML = `<span class="ai-processing">📎 กำลังแนบไฟล์...</span>`;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const fileContent = e.target.result;
        
        const editId = document.getElementById("worker-edit-id").value;
        const employerId = document.getElementById("worker-employer-id").value;
        const firstName = document.getElementById("worker-first-name").value.trim() || "worker";
        const nameClean = firstName.replace(/\s+/g, '_');
        const fileName = `${nameClean}_${docType}`;
        
        const uploadResult = await uploadFileToGoogleDrive(fileContent, fileName, employerId, editId, docType);
        const driveUrl = uploadResult ? uploadResult.fileUrl : null;
        const serverUrl = driveUrl || await uploadFileToServer(fileContent, fileName);
        tempWorkerAttachments[docType] = [{ name: fileName, data: serverUrl || fileContent }];
        
        if (uploadResult && uploadResult.parsedData) {
            applyGeminiDataToWorkerForm(docType, uploadResult.parsedData);
            showToast("✨ AI อ่านข้อมูลจากเอกสารและกรอกฟอร์มให้อัตโนมัติแล้ว กรุณาตรวจสอบความถูกต้องอีกครั้ง", "success");
        }

        if (uploadResult) {
            statusEl.innerHTML = `<span class="ai-success">✅ แนบไฟล์สำเร็จ</span>`;
            uploadBox.classList.add("success-upload");
        } else {
            statusEl.innerHTML = `<span class="ai-error">❌ อัปโหลดไม่สำเร็จ (ไฟล์ถูกเก็บไว้ในเครื่องชั่วคราว)</span>`;
        }
    };
    reader.readAsDataURL(file);
}

// ==================== MODAL ACTIONS (SAVE, EDIT, DELETE) ====================

// --- CUSTOMERS ---
function openCustomerModal(id = null) {
    // Reset forms
    document.getElementById("customer-form").reset();
    const modalTitle = document.getElementById("customer-modal-title");
    const editIdInput = document.getElementById("customer-edit-id");
    tempCustomerAttachments = {};
    
    // Clear upload boxes highlights
    document.querySelectorAll("#customer-modal .upload-box").forEach(box => {
        box.classList.remove("success-upload");
    });
    document.querySelectorAll("#customer-modal .ocr-status").forEach(st => st.innerHTML = '');

    if (id) {
        modalTitle.innerText = "แก้ไขข้อมูลลูกค้า / นายจ้าง";
        editIdInput.value = id;
        
        // Fill fields
        const c = customers.find(item => item.id === id);
        document.getElementById("cust-tax-id").value = c.taxId;
        document.getElementById("cust-company-name").value = c.companyName;
        document.getElementById("cust-director-id").value = c.directorId || "";
        document.getElementById("cust-business-type").value = c.businessType;
        document.getElementById("cust-coordinator").value = c.coordinator;
        document.getElementById("cust-phone").value = c.phone;
        
        customerBranches = JSON.parse(JSON.stringify(c.branches)); // Clone
    } else {
        modalTitle.innerText = "เพิ่มลูกค้า / นายจ้างใหม่";
        editIdInput.value = "";
        
        // Initialize with default empty branch
        customerBranches = [{
            name: "สำนักงานใหญ่",
            houseNo: "", moo: "", soi: "", road: "", subdistrict: "", district: "", province: "สงขลา", postalCode: ""
        }];
    }
    
    renderBranchesInputs();
    document.getElementById("customer-modal").classList.remove("hidden");
}

function closeCustomerModal() {
    document.getElementById("customer-modal").classList.add("hidden");
}

async function saveCustomer(e) {
    e.preventDefault();
    const editId = document.getElementById("customer-edit-id").value;
    const taxId = document.getElementById("cust-tax-id").value;
    const companyName = document.getElementById("cust-company-name").value;
    const directorId = document.getElementById("cust-director-id").value.trim();
    const businessType = document.getElementById("cust-business-type").value;
    const coordinator = document.getElementById("cust-coordinator").value;
    const phone = document.getElementById("cust-phone").value;

    // Validate branches
    for (let b of customerBranches) {
        if (!b.houseNo || !b.subdistrict || !b.district || !b.province || !b.postalCode) {
            alert("กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วนในทุกสาขาที่เปิดอยู่");
            return;
        }
        if (!PROVINCES.includes(b.province)) {
            alert(`จังหวัดต้องอยู่ใน 4 จังหวัดนี้เท่านั้น: ${PROVINCES.join(', ')}`);
            return;
        }
        if (!/^\d{5}$/.test(b.postalCode)) {
            alert("รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก");
            return;
        }
    }

    let customerData;
    if (editId) {
        // Edit Mode
        const idx = customers.findIndex(item => item.id === editId);
        if (idx !== -1) {
            const oldCreatedAt = customers[idx].createdAt || new Date().toISOString().split('T')[0];
            const oldDriveId = customers[idx].drive_folder_id || "";
            customerData = {
                id: editId, taxId, companyName, directorId, businessType, coordinator, phone, branches: customerBranches, createdAt: oldCreatedAt, drive_folder_id: oldDriveId
            };
        }
    } else {
        // Add Mode
        const newId = 'cust-' + Date.now();
        const createdAt = new Date().toISOString().split('T')[0];
        customerData = {
            id: newId, taxId, companyName, directorId, businessType, coordinator, phone, branches: customerBranches, createdAt, drive_folder_id: ""
        };
    }

    if (!customerData) return;

    // Cloud Sync
    showToast("💾 กำลังบันทึกข้อมูลเข้าคลาวด์...", "warning");
    const res = await callCloudAPI("saveCustomer", { customerData: customerData });
    if (!res) {
        showToast("❌ บันทึกไม่สำเร็จ ข้อมูลยังไม่ถูกบันทึกลงชีต กรุณาลองใหม่", "danger");
        return;
    }
    if (res && res.data) {
        // อัปเดตข้อมูลที่ได้กลับจากคลาวด์ เช่น drive_folder_id
        if (res.data.drive_folder_id) {
            customerData.drive_folder_id = res.data.drive_folder_id;
        }
    }

    if (editId) {
        const idx = customers.findIndex(item => item.id === editId);
        if (idx !== -1) {
            customers[idx] = customerData;
            showToast("แก้ไขข้อมูลนายจ้าง/ลูกค้าสำเร็จ", "success");
        }
    } else {
        customers.push(customerData);
        showToast("เพิ่มข้อมูลนายจ้าง/ลูกค้าคนใหม่สำเร็จ", "success");
    }

    // อัปโหลดไฟล์แนบที่ค้างไว้ (ถ้ามี) ตอนนี้ลูกค้ามี id และโฟลเดอร์ Drive จริงแล้ว
    const stagedDocTypes = Object.keys(tempCustomerAttachments);
    if (stagedDocTypes.length > 0) {
        showToast(`📎 กำลังอัปโหลดไฟล์แนบ ${stagedDocTypes.length} ไฟล์เข้า Drive...`, "warning");
        for (const docType of stagedDocTypes) {
            const staged = tempCustomerAttachments[docType];
            const statusEl = document.getElementById(`status-${docType}`);
            try {
                const uploadResult = await uploadFileToGoogleDrive(staged.data, staged.name, customerData.id, "", docType);
                if (statusEl) {
                    statusEl.innerHTML = uploadResult
                        ? `<span class="ai-success">✅ อัปโหลดสำเร็จ</span>`
                        : `<span class="ai-error">❌ อัปโหลดไม่สำเร็จ</span>`;
                }
            } catch (err) {
                if (statusEl) statusEl.innerHTML = `<span class="ai-error">❌ อัปโหลดไม่สำเร็จ</span>`;
            }
        }
        tempCustomerAttachments = {};
    }

    saveData();
    closeCustomerModal();
    renderCustomers();
    // Also refresh workers listings & dashboards in case dependencies changed
    updateEmployerDropdownOptions();
}

async function deleteCustomer(id, rowNum = null) {
    if (currentUser.role !== 'admin') {
        showToast("❌ คุณไม่มีสิทธิ์ลบข้อมูลนี้ (สำหรับสิทธิ์ Admin เท่านั้น)", "danger");
        return;
    }

    // Check if customer has workers
    const relatedWorkers = workers.filter(w => w.employerId === id);
    if (relatedWorkers.length > 0) {
        alert("ไม่สามารถลบลูกค้านี้ได้ เนื่องจากมีคนงานต่างด้าวผูกกับบริษัทนี้อยู่ กรุณาย้ายหรือลบคนงานก่อน");
        return;
    }

    if (confirm("คุณแน่ใจหรือไม่ที่จะลบข้อมูลผู้ว่าจ้าง/ลูกค้ารายนี้? ข้อมูลทั้งหมดของเขาจะหายไป")) {
        showToast("🗑️ กำลังลบข้อมูลออกจากคลาวด์...", "warning");
        let res = await callCloudAPI("deleteRecord", { sheetName: "Customers", id: id });

        // ถ้าลบด้วย id ไม่สำเร็จ (เช่น id เพี้ยน/undefined จากปัญหาหัวตาราง) ให้ลองลบตามตำแหน่งแถวจริงแทน
        if (!res && rowNum) {
            res = await callCloudAPI("deleteRecordByRow", { sheetName: "Customers", rowNum: rowNum });
        }

        if (res) {
            customers = customers.filter(c => c.id !== id && c._rowNum !== rowNum);
            saveData();
            renderCustomers();
            showToast("ลบข้อมูลลูกค้าเรียบร้อยแล้ว", "success");
        }
    }
}

function toggleNationalityOtherInput() {
    const val = document.getElementById("worker-nationality").value;
    const row = document.getElementById("worker-nationality-other-row");
    if (val === 'Other') {
        row.classList.remove("hidden");
    } else {
        row.classList.add("hidden");
    }
}

function formatDateForInput(val) {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return val;
}

function safeParseDate(dateStr) {
    if (!dateStr || dateStr === "-" || dateStr === "null" || dateStr === "undefined") return null;
    if (dateStr instanceof Date) {
        return isNaN(dateStr.getTime()) ? null : dateStr;
    }
    const cleanStr = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
        const d = new Date(cleanStr);
        if (!isNaN(d.getTime())) {
            if (d.getFullYear() > 2400) {
                d.setFullYear(d.getFullYear() - 543);
            }
            return d;
        }
    }
    const parts = cleanStr.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            if (year > 2400) {
                year = year - 543;
            }
            const d = new Date(year, month, day);
            return isNaN(d.getTime()) ? null : d;
        }
    }
    const fallbackD = new Date(cleanStr);
    if (!isNaN(fallbackD.getTime())) {
        if (fallbackD.getFullYear() > 2400) {
            fallbackD.setFullYear(fallbackD.getFullYear() - 543);
        }
        return fallbackD;
    }
    return null;
}

function parseDateInput(val) {
    if (!val) return '';
    const parts = val.split('/');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        if (day && month && year && year.length === 4) {
            return `${year}-${month}-${day}`;
        }
    }
    return val;
}

function isValidDate(val) {
    if (!val) return true; // optional fields are fine
    const parts = val.split('/');
    if (parts.length !== 3) return false;
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return false;
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return false;
    
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function setupDateMask(elementId) {
    const input = document.getElementById(elementId);
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        let val = e.target.value.replace(/\D/g, ''); // digits only
        if (val.length > 8) val = val.substring(0, 8);
        
        let formatted = '';
        if (val.length > 0) {
            formatted += val.substring(0, 2);
        }
        if (val.length > 2) {
            formatted += '/' + val.substring(2, 4);
        }
        if (val.length > 4) {
            formatted += '/' + val.substring(4, 8);
        }
        e.target.value = formatted;
    });
}

// --- WORKERS ---
function openWorkerModal(id = null) {
    if (customers.length === 0) {
        alert("กรุณาเพิ่มข้อมูล นายจ้าง/ลูกค้า อย่างน้อย 1 รายการก่อนจัดการคนงาน");
        return;
    }

    document.getElementById("worker-form").reset();
    updateEmployerDropdownOptions();

    const modalTitle = document.getElementById("worker-modal-title");
    const editIdInput = document.getElementById("worker-edit-id");

    const photoPreview = document.getElementById("worker-photo-preview");
    const photoIcon = document.getElementById("worker-photo-icon");

    // Clear upload boxes
    document.querySelectorAll("#worker-modal .upload-box").forEach(box => {
        box.classList.remove("success-upload");
    });
    document.querySelectorAll("#worker-modal .ocr-status").forEach(st => st.innerHTML = '');

    // Reset nationality row
    document.getElementById("worker-nationality-other-row").classList.add("hidden");

    if (id) {
        modalTitle.innerText = "แก้ไขข้อมูลคนงานต่างด้าว";
        editIdInput.value = id;

        const w = workers.find(item => item.id === id);
        
        // Load existing attachments to temp store
        tempWorkerAttachments = JSON.parse(JSON.stringify(w.attachments || {}));

        // Display existing attachments status visually in the modal
        ['worker-wp-doc', 'worker-passport'].forEach(key => {
            const list = getAttachments(w, key);
            if (list.length > 0) {
                const dropBox = document.getElementById(`drop-${key}`);
                const statusBox = document.getElementById(`status-${key}`);
                if (dropBox) dropBox.classList.add("success-upload");
                if (statusBox) statusBox.innerHTML = `<span class="ai-success">✅ มีไฟล์แนบอยู่แล้ว (${list.length} ไฟล์)</span>`;
            }
        });

        document.getElementById("worker-employer-id").value = w.employerId;
        
        // Nationality logic
        const standardNationalities = ["Myanmar", "Cambodia", "Laos", "Vietnam"];
        if (standardNationalities.includes(w.nationality)) {
            document.getElementById("worker-nationality").value = w.nationality;
        } else {
            document.getElementById("worker-nationality").value = "Other";
            document.getElementById("worker-nationality-other-row").classList.remove("hidden");
            document.getElementById("worker-nationality-other").value = w.nationality;
        }

        document.getElementById("worker-title").value = w.title || '';
        document.getElementById("worker-uid").value = w.workerUid || '';
        document.getElementById("worker-permit-no").value = w.permitNo || '';
        document.getElementById("worker-permit-expiry").value = formatDateForInput(w.permitExpiry || '');
        document.getElementById("worker-first-name").value = w.firstName;
        document.getElementById("worker-last-name").value = w.lastName || '';
        document.getElementById("worker-dob").value = formatDateForInput(w.dob);
        document.getElementById("worker-ref-no").value = w.refNo || '';
        document.getElementById("worker-gender").value = w.gender || '';
        document.getElementById("worker-position").value = w.position || '';
        document.getElementById("worker-workplace").value = w.workplace || '';
        
        // Parent names
        document.getElementById("worker-father-name").value = w.fatherName || '';
        document.getElementById("worker-mother-name").value = w.motherName || '';

        // Photo preview binding
        if (w.photo) {
            photoPreview.src = w.photo;
            photoPreview.classList.remove("hidden");
            photoIcon.classList.add("hidden");
        } else {
            photoPreview.src = "";
            photoPreview.classList.add("hidden");
            photoIcon.classList.remove("hidden");
        }

        // Passport Info
        document.getElementById("worker-passport-no").value = w.passportNo || '';
        document.getElementById("worker-passport-pob").value = w.passportPob || '';
        document.getElementById("worker-passport-auth").value = w.passportAuth || '';
        document.getElementById("worker-passport-issue").value = formatDateForInput(w.passportIssue || '');
        document.getElementById("worker-passport-expiry").value = formatDateForInput(w.passportExpiry || '');
        document.getElementById("worker-employment-status").value = w.status || 'active';
    } else {
        modalTitle.innerText = "เพิ่มคนงานต่างด้าวใหม่";
        editIdInput.value = "";
        document.getElementById("worker-title").value = '';
        document.getElementById("worker-employment-status").value = 'active';
        
        // Reset temp store for new worker
        tempWorkerAttachments = {};

        // Reset photo preview
        photoPreview.src = "";
        photoPreview.classList.add("hidden");
        photoIcon.classList.remove("hidden");
    }

    document.getElementById("worker-modal").classList.remove("hidden");
}

function closeWorkerModal() {
    document.getElementById("worker-modal").classList.add("hidden");
}

async function saveWorker(e) {
    e.preventDefault();
    const editId = document.getElementById("worker-edit-id").value;
    const employerId = document.getElementById("worker-employer-id").value;
    
    // Nationality custom logic
    let nationality = document.getElementById("worker-nationality").value;
    if (nationality === "Other") {
        nationality = document.getElementById("worker-nationality-other").value.trim();
        if (!nationality) {
            alert("กรุณาระบุระบุสัญชาติคนงานต่างด้าวในกล่องระบุเพิ่มเติม");
            return;
        }
    }

    const title = document.getElementById("worker-title").value;
    const workerUid = document.getElementById("worker-uid").value;
    const permitNo = document.getElementById("worker-permit-no").value;
    const permitExpiry = document.getElementById("worker-permit-expiry").value.trim();
    const firstName = document.getElementById("worker-first-name").value;
    const lastName = document.getElementById("worker-last-name").value;
    const dob = document.getElementById("worker-dob").value.trim();
    const refNo = document.getElementById("worker-ref-no").value.trim();
    const gender = document.getElementById("worker-gender").value;
    const position = document.getElementById("worker-position").value.trim();
    const workplace = document.getElementById("worker-workplace").value.trim();
    
    // Parent info
    const fatherName = document.getElementById("worker-father-name").value.trim();
    const motherName = document.getElementById("worker-mother-name").value.trim();
    
    // Photo info
    const photoPreview = document.getElementById("worker-photo-preview");
    const photo = photoPreview.classList.contains("hidden") ? "" : photoPreview.src;

    // Passport
    const passportNo = document.getElementById("worker-passport-no").value;
    const passportPob = document.getElementById("worker-passport-pob").value;
    const passportAuth = document.getElementById("worker-passport-auth").value;
    const passportIssue = document.getElementById("worker-passport-issue").value.trim();
    const passportExpiry = document.getElementById("worker-passport-expiry").value.trim();
    const status = document.getElementById("worker-employment-status").value;

    // Validate date formats (DD/MM/YYYY)
    if (dob && !isValidDate(dob)) {
        alert("วันเดือนปีเกิด ไม่ถูกต้อง (รูปแบบคือ วัน/เดือน/ปี ค.ศ. เช่น 15/08/1994)");
        return;
    }
    if (permitExpiry && !isValidDate(permitExpiry)) {
        alert("วันหมดอายุใบอนุญาตทำงาน ไม่ถูกต้อง (รูปแบบคือ วัน/เดือน/ปี ค.ศ. เช่น 31/12/2026)");
        return;
    }
    if (passportIssue && !isValidDate(passportIssue)) {
        alert("วันออกเล่มพาสปอร์ต ไม่ถูกต้อง (รูปแบบคือ วัน/เดือน/ปี ค.ศ. เช่น 20/05/2022)");
        return;
    }
    if (passportExpiry && !isValidDate(passportExpiry)) {
        alert("วันหมดอายุพาสปอร์ต ไม่ถูกต้อง (รูปแบบคือ วัน/เดือน/ปี ค.ศ. เช่น 20/05/2027)");
        return;
    }

    // Relaxed required validation: only check employer, nationality, title, first name, and birth date
    if (!employerId || !nationality || !title || !firstName || !dob) {
        alert("กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน");
        return;
    }

    // Convert dates back to YYYY-MM-DD for standard database storage
    const storedDob = parseDateInput(dob);
    const storedPermitExpiry = parseDateInput(permitExpiry);
    const storedPassportIssue = parseDateInput(passportIssue);
    const storedPassportExpiry = parseDateInput(passportExpiry);

    const workerData = {
        id: editId || 'work-' + Date.now(),
        employerId, title, nationality, workerUid, permitNo, 
        permitExpiry: storedPermitExpiry, 
        firstName, lastName, 
        dob: storedDob,
        passportNo, passportPob, passportAuth, 
        passportIssue: storedPassportIssue, 
        passportExpiry: storedPassportExpiry,
        fatherName, motherName, photo,
        attachments: tempWorkerAttachments,
        status,
        gender,
        position,
        workplace,
        refNo
    };

    const finalWorkerData = editId ? { ...workerData, createdAt: workers.find(item => item.id === editId).createdAt || new Date().toISOString().split('T')[0] } : { ...workerData, createdAt: new Date().toISOString().split('T')[0] };

    showToast("💾 กำลังบันทึกข้อมูลคนงานเข้าคลาวด์...", "warning");
    const workerSaveRes = await callCloudAPI("saveWorker", { workerData: finalWorkerData });
    if (!workerSaveRes) {
        showToast("❌ บันทึกไม่สำเร็จ ข้อมูลคนงานยังไม่ถูกบันทึกลงชีต กรุณาลองใหม่", "danger");
        return;
    }

    if (editId) {
        const idx = workers.findIndex(item => item.id === editId);
        if (idx !== -1) {
            workers[idx] = finalWorkerData;
            showToast("แก้ไขข้อมูลคนงานต่างด้าวสำเร็จ", "success");
        }
    } else {
        workers.push(finalWorkerData);
        showToast("เพิ่มข้อมูลคนงานต่างด้าวคนใหม่สำเร็จ", "success");
    }

    saveData();
    closeWorkerModal();
    renderWorkers();
}

async function deleteWorker(id, rowNum = null) {
    if (currentUser.role !== 'admin') {
        showToast("❌ คุณไม่มีสิทธิ์ลบข้อมูลนี้ (สำหรับสิทธิ์ Admin เท่านั้น)", "danger");
        return;
    }

    if (confirm("คุณแน่ใจหรือไม่ที่จะลบข้อมูลคนงานต่างด้าวรายนี้?")) {
        showToast("🗑️ กำลังลบข้อมูลออกจากคลาวด์...", "warning");
        let res = await callCloudAPI("deleteRecord", { sheetName: "Workers", id: id });

        // ถ้าลบด้วย id ไม่สำเร็จ (เช่น id เพี้ยน/undefined จากปัญหาหัวตาราง) ให้ลองลบตามตำแหน่งแถวจริงแทน
        if (!res && rowNum) {
            res = await callCloudAPI("deleteRecordByRow", { sheetName: "Workers", rowNum: rowNum });
        }

        if (res) {
            workers = workers.filter(w => w.id !== id && w._rowNum !== rowNum);
            saveData();
            renderWorkers();
            showToast("ลบข้อมูลคนงานเรียบร้อยแล้ว", "success");
        }
    }
}

// ==================== TOAST COMPONENT ====================
function showToast(message, type = 'success') {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = '✨';
    if (type === 'success') icon = '✅';
    if (type === 'danger') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
        <span>${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s reverse';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// ==================== JOBS MODULE LOGIC ====================
let jobsCurrentPage = 1;
const jobsPageSize = 50; // optimized for larger loads (e.g. 3,000+ jobs)

function changeJobsPage(direction) {
    const totalPages = Math.ceil(jobs.length / jobsPageSize) || 1;
    jobsCurrentPage += direction;
    if (jobsCurrentPage < 1) jobsCurrentPage = 1;
    if (jobsCurrentPage > totalPages) jobsCurrentPage = totalPages;
    renderJobs();
}

// สร้าง "เลขที่แจ้งงาน" สำหรับแสดงผล = วันที่แจ้งงาน ตามด้วยเลขงานของระบบ (ไม่กระทบ job.id ที่ใช้อ้างอิงข้อมูลจริงภายใน)
function getJobDisplayNo(job) {
    if (!job) return '';
    // ใช้วันที่ "เปิดงานครั้งแรก" (createdAt) เสมอ ไม่ใช้ updatedAt เพราะจะเปลี่ยนทุกครั้งที่แก้ไขงาน
    // (รองรับใบงานเก่าที่ยังไม่มี createdAt ด้วยการ fallback ไป updatedAt ครั้งเดียวตอนนั้น)
    const dateStr = (job.createdAt || job.updatedAt || new Date().toISOString().split('T')[0]).replace(/-/g, '');
    const numPart = (job.id || '').replace(/\D/g, '').slice(-6) || '000000';
    return `${dateStr}-${numPart}`;
}

function renderJobs() {
    const query = document.getElementById("search-job").value.toLowerCase();
    const typeFilter = document.getElementById("filter-job-type").value;
    const statusFilter = document.getElementById("filter-job-status").value;
    const tbody = document.getElementById("jobs-list-tbody");

    const filtered = jobs.filter(j => {
        const cust = customers.find(c => c.id === j.customerId);
        const work = workers.find(w => w.id === j.workerId);
        
        const custName = cust ? cust.companyName.toLowerCase() : "";
        const workName = work ? `${work.firstName} ${work.lastName}`.toLowerCase() : "";
        const matchSearch = j.id.toLowerCase().includes(query) || custName.includes(query) || workName.includes(query);
        
        const matchType = typeFilter === "" || (j.jobType && j.jobType.includes(typeFilter));
        const matchStatus = statusFilter === "" || j.status === statusFilter;

        return matchSearch && matchType && matchStatus;
    });

    if (currentJobView === 'kanban') {
        renderJobsKanban(filtered);
        return;
    }

    // Pagination calculations
    const totalPages = Math.ceil(filtered.length / jobsPageSize) || 1;
    if (jobsCurrentPage > totalPages) jobsCurrentPage = totalPages;
    if (jobsCurrentPage < 1) jobsCurrentPage = 1;

    const pageInfo = document.getElementById("jobs-page-info");
    const prevBtn = document.getElementById("btn-prev-jobs");
    const nextBtn = document.getElementById("btn-next-jobs");

    if (pageInfo) pageInfo.innerText = `หน้า ${jobsCurrentPage} จาก ${totalPages}`;
    if (prevBtn) prevBtn.disabled = jobsCurrentPage === 1;
    if (nextBtn) nextBtn.disabled = jobsCurrentPage === totalPages;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-muted" style="text-align: center; padding: 40px;">
                    ❌ ไม่พบข้อมูลการสั่งงานตามตัวกรอง
                </td>
            </tr>
        `;
        return;
    }

    const startIdx = (jobsCurrentPage - 1) * jobsPageSize;
    const paginated = filtered.slice(startIdx, startIdx + jobsPageSize);

    tbody.innerHTML = paginated.map(j => {
        const cust = customers.find(c => c.id === j.customerId);
        const work = workers.find(w => w.id === j.workerId);
        const custName = cust ? cust.companyName : "ไม่พบนายจ้าง";
        const workName = work ? `${work.firstName} ${work.lastName} (${work.nationality})` : "ไม่พบข้อมูลคนงาน";

        // Status styling and display
        let displayStatus = j.status;
        let statusClass = 'badge-gold';
        
        if (j.status === 'รอดำเนินการ') {
            statusClass = 'badge-warning';
        } else if (j.status === 'กำลังดำเนินการ') {
            statusClass = 'badge-gold';
        } else if (j.status === 'รอเอกสารเพิ่มเติม') {
            statusClass = 'badge-danger';
        } else if (j.status === 'เสร็จสิ้น') {
            statusClass = 'badge-success';
        } else if (j.status === 'เสร็จสิ้น/รอออกบิล') {
            statusClass = 'badge-success';
            displayStatus = 'เสร็จสิ้น (รอออกบิล)';
        } else if (j.status === 'ออกบิลแล้ว') {
            statusClass = 'badge-success';
            displayStatus = 'เสร็จสิ้น (ออกบิลแล้ว)';
        } else if (j.status === 'ชำระเงินแล้ว') {
            statusClass = 'badge-success';
            displayStatus = 'เสร็จสิ้น (ชำระเงินแล้ว)';
        }

        // Action buttons
        let editBtn = '';
        let deleteBtn = '';
        let billBtn = '';

        if (currentUser.role !== 'staff') {
            editBtn = `
                <button class="action-icon-btn" onclick="openJobModal('${j.id}')" title="แก้ไขขั้นตอน">
                    ✏️
                </button>
            `;
        }

        if (currentUser.role === 'admin') {
            deleteBtn = `
                <button class="action-icon-btn delete-btn" onclick="deleteJob('${j.id}')" title="ลบงาน">
                    🗑️
                </button>
            `;
        }

        // Universal Billing: shown in all statuses!
        billBtn = `
            <button class="btn btn-sm btn-gold" onclick="openInvoiceModal('${j.id}')" style="white-space: nowrap;">
                🧾 ออกบิล/รับเงิน
            </button>
        `;

        const cleanJobType = (j.jobType || "").replace(/\s*\(\d+\)/g, "");
        const siblings = getJobBatchSiblings(j);
        const batchBadge = siblings.length > 0
            ? `<br><span class="badge" style="font-size:10px; margin-top:3px; background:#eef2ff; color:#4338ca; display:inline-block;">📎 ชุดงานเดียวกัน • ${siblings.length + 1} รายการ</span>`
            : '';
        const siblingPills = siblings.length > 0
            ? `<div style="margin-top:5px; display:flex; flex-wrap:wrap; gap:4px;">${siblings.map(s => {
                const sClean = (s.jobType || "").replace(/\s*\(\d+\)/g, "");
                const dotColor = isJobStatusOpen(s.status) ? '#f59e0b' : '#22c55e';
                return `<span title="${sClean}: ${s.status}" style="font-size:10px; padding:1px 7px; border-radius:10px; background:#f1f5f9; color:#475569; display:inline-flex; align-items:center; gap:4px;"><span style="width:6px;height:6px;border-radius:50%;background:${dotColor};display:inline-block;"></span>${sClean}</span>`;
            }).join('')}</div>`
            : '';

        return `
            <tr>
                <td><strong>${getJobDisplayNo(j)}</strong>${j.orderNo ? `<br><span style="font-size: 11px; color: var(--text-muted);">Order No: ${j.orderNo}</span>` : ''}${batchBadge}</td>
                <td><span class="badge badge-gold">${cleanJobType}</span>${siblingPills}</td>
                <td>${custName}</td>
                <td>${workName}</td>
                <td><strong>${j.fee.toLocaleString()} บาท</strong></td>
                <td><span class="badge ${statusClass}">${displayStatus}</span></td>
                <td><small>${j.updatedAt}</small></td>
                <td class="actions-col">
                    <div class="actions-cell">
                        ${billBtn}
                        ${editBtn}
                        ${deleteBtn}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleJobTypePriceInput(cb) {
    const wrapper = cb.closest('div');
    const priceInput = wrapper.querySelector("input[name='job-type-price']");
    if (priceInput) {
        priceInput.disabled = !cb.checked;
        if (!cb.checked) {
            priceInput.value = "";
        } else if (!priceInput.value) {
            priceInput.value = "";
        }
    }
}

function parseJobTypeItems(jobTypeStr, defaultFee) {
    if (!jobTypeStr) return [];
    
    // Split by comma
    const items = jobTypeStr.split(/,\s*/);
    const parsed = [];
    
    items.forEach(item => {
        // Matches e.g. "แจ้งเข้า (2000)" or "แจ้งเข้า (2,000)"
        const match = item.match(/^(.*?)\s*\(?([\d,]+)?\s*(?:บาท|บ\.)?\)?$/);
        if (match) {
            const name = match[1].trim();
            const priceStr = match[2] ? match[2].replace(/,/g, '') : '';
            const price = parseFloat(priceStr);
            parsed.push({
                name: name,
                price: isNaN(price) ? 0 : price
            });
        } else {
            parsed.push({
                name: item.trim(),
                price: 0
            });
        }
    });
    
    const totalParsed = parsed.reduce((sum, x) => sum + x.price, 0);
    if (totalParsed === 0 && defaultFee !== undefined && defaultFee !== null && defaultFee !== "") {
        const fallback = parseFloat(defaultFee);
        if (!isNaN(fallback) && fallback > 0 && parsed.length > 0) {
            parsed[0].price = fallback;
        }
    }
    
    return parsed;
}

function openJobModal(id = null) {
    if (customers.length === 0) {
        alert("กรุณาเพิ่มข้อมูลนายจ้างอย่างน้อย 1 รายก่อนสั่งงาน");
        switchView('customers');
        return;
    }

    document.getElementById("job-form").reset();
    
    // Fill customer dropdown selection
    const custSelect = document.getElementById("job-customer-id");
    custSelect.innerHTML = '<option value="" disabled selected>--- เลือกนายจ้าง ---</option>' + 
        customers.map(c => `<option value="${c.id}">${c.companyName}</option>`).join('');

    const modalTitle = document.getElementById("job-modal-title");
    const editIdInput = document.getElementById("job-edit-id");
    const checkBoxes = document.querySelectorAll("input[name='job-type-checkbox']");
    checkBoxes.forEach(cb => {
        cb.checked = false;
        const wrapper = cb.closest('div');
        const priceInput = wrapper.querySelector("input[name='job-type-price']");
        if (priceInput) {
            priceInput.value = "";
            priceInput.disabled = true;
        }
    });

    const statusSelect = document.getElementById("job-status");
    // Clear custom status options if any
    Array.from(statusSelect.options).forEach(opt => {
        if (opt.dataset.custom) opt.remove();
    });

    if (id) {
        modalTitle.innerText = "แก้ไขข้อมูลขั้นตอนและรายละเอียดงาน";
        editIdInput.value = id;

        const j = jobs.find(item => item.id === id);
        custSelect.value = j.customerId;
        
        // Trigger worker dropdown generation
        onJobCustomerChange(j.workerId);
        
        // Populate checkboxes and prices
        if (j.jobType) {
            const parsedItems = parseJobTypeItems(j.jobType, j.fee);
            checkBoxes.forEach(cb => {
                const matchedItem = parsedItems.find(item => item.name === cb.value);
                if (matchedItem) {
                    cb.checked = true;
                    const wrapper = cb.closest('div');
                    const priceInput = wrapper.querySelector("input[name='job-type-price']");
                    if (priceInput) {
                        priceInput.value = matchedItem.price;
                        priceInput.disabled = false;
                    }
                }
            });
        }
        
        // If status is a background billing/finance status, append it temporarily
        if (j.status === 'ออกบิลแล้ว' || j.status === 'ชำระเงินแล้ว' || j.status === 'เสร็จสิ้น/รอออกบิล') {
            const opt = document.createElement("option");
            opt.value = j.status;
            opt.text = j.status + " (สถานะทางบัญชี)";
            opt.dataset.custom = "true";
            statusSelect.add(opt);
        }
        
        statusSelect.value = j.status;
        document.getElementById("job-notes").value = j.notes || '';
        document.getElementById("job-order-no").value = j.orderNo || '';

        // Show batch siblings (other job types opened together in the same batch)
        renderJobBatchHint(j);
    } else {
        modalTitle.innerText = "แจ้งสั่งงานใหม่ / ขั้นตอนดำเนินการ";
        editIdInput.value = "";
        
        // Reset worker select
        document.getElementById("job-worker-id").innerHTML = '<option value="" disabled selected>--- เลือกคนงาน ---</option>';
        statusSelect.value = "รอดำเนินการ";
        document.getElementById("job-notes").value = "";
        renderJobBatchHint(null);
    }

    refreshJobTypeLocks();
    document.getElementById("job-modal").classList.remove("hidden");
}

function closeJobModal() {
    document.getElementById("job-modal").classList.add("hidden");
}

function onJobCustomerChange(selectedWorkerId = null) {
    const custId = document.getElementById("job-customer-id").value;
    const workerSelect = document.getElementById("job-worker-id");
    
    // Filter workers under this customer
    const custWorkers = workers.filter(w => w.employerId === custId);
    
    if (custWorkers.length === 0) {
        workerSelect.innerHTML = '<option value="" disabled selected>--- ไม่พบข้อมูลคนงานต่างด้าวของลูกค้านี้ ---</option>';
        refreshJobTypeLocks();
        return;
    }

    workerSelect.innerHTML = '<option value="" disabled selected>--- เลือกคนงาน ---</option>' +
        custWorkers.map(w => `<option value="${w.id}">${w.firstName} ${w.lastName} (${w.nationality})</option>`).join('');
        
    if (selectedWorkerId) {
        workerSelect.value = selectedWorkerId;
    }
    refreshJobTypeLocks();
}

function onJobWorkerChange() {
    refreshJobTypeLocks();
    const editId = document.getElementById("job-edit-id").value;
    if (!editId) {
        // Only relevant for brand-new job notifications: show whether this
        // worker already has other jobs sitting open right now.
        const workerId = document.getElementById("job-worker-id").value;
        renderJobBatchHint(null, workerId);
    }
}

// ==================== JOB TYPE LOCKING (ป้องกันเปิดงานประเภทเดียวกันซ้อนกัน) ====================
// ล็อกช่องติ๊กประเภทงานที่คนงานคนนี้มี "ใบงานเดิมค้างอยู่แล้ว" (สถานะยังเปิดอยู่)
// ผู้ใช้ต้องไปแก้ไข/ปิดใบงานเดิมก่อน จึงจะเปิดใบงานประเภทเดิมซ้ำให้คนงานคนนี้ได้อีก
function refreshJobTypeLocks() {
    const workerId = document.getElementById("job-worker-id").value;
    const editId = document.getElementById("job-edit-id").value || null;
    const checkBoxes = document.querySelectorAll("input[name='job-type-checkbox']");

    checkBoxes.forEach(cb => {
        const wrapper = cb.closest('div');
        if (!wrapper) return;

        const existingNote = wrapper.querySelector('.job-type-lock-note');
        if (existingNote) existingNote.remove();

        if (!workerId) {
            cb.disabled = false;
            wrapper.style.opacity = '';
            wrapper.style.background = '';
            wrapper.style.flexWrap = '';
            return;
        }

        const conflict = findOpenJobConflict(workerId, cb.value, editId);
        if (conflict) {
            cb.checked = false;
            cb.disabled = true;
            wrapper.style.opacity = '0.55';
            wrapper.style.background = '#fef2f2';
            wrapper.style.flexWrap = 'wrap';

            const priceInput = wrapper.querySelector("input[name='job-type-price']");
            if (priceInput) {
                priceInput.disabled = true;
                priceInput.value = "";
            }

            const note = document.createElement('div');
            note.className = 'job-type-lock-note';
            note.style.cssText = 'width:100%; font-size:10.5px; color:#b91c1c; margin-top:2px; line-height:1.4;';
            note.innerHTML = `🔒 มีงานนี้ค้างอยู่แล้ว (เลขที่ ${getJobDisplayNo(conflict)} • สถานะ: ${conflict.status}) — กรุณาแก้ไขหรือปิดงานเดิมก่อน`;
            wrapper.appendChild(note);
        } else {
            cb.disabled = false;
            wrapper.style.opacity = '';
            wrapper.style.background = '';
            wrapper.style.flexWrap = '';
        }
    });
}

// แสดงกล่องเตือน/สรุปในโมดัลว่าคนงานคนนี้มีงานอื่นเปิดอยู่กี่รายการ หรือถ้าเป็นการแก้ไข
// ใบงานที่มี batchId ให้แสดงว่า "ใบงานนี้ถูกเปิดมาพร้อมกับงานอื่นอีกกี่รายการ"
function renderJobBatchHint(job, workerIdForNew) {
    let hintBox = document.getElementById("job-batch-hint");
    if (!hintBox) {
        hintBox = document.createElement("div");
        hintBox.id = "job-batch-hint";
        hintBox.style.cssText = "font-size:12px; border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: 14px; display:none;";
        const container = document.getElementById("job-type-checkboxes-container");
        if (container && container.parentNode) {
            container.parentNode.insertBefore(hintBox, container);
        }
    }

    if (job && job.batchId) {
        const siblings = getJobBatchSiblings(job);
        if (siblings.length > 0) {
            hintBox.style.display = 'block';
            hintBox.style.background = '#eef2ff';
            hintBox.style.color = '#3730a3';
            hintBox.style.border = '1px solid #c7d2fe';
            hintBox.innerHTML = `📎 ใบงานนี้ถูกแจ้งมาพร้อมกับอีก <strong>${siblings.length}</strong> รายการในครั้งเดียวกัน: ` +
                siblings.map(s => `<span style="display:inline-block; margin:2px 4px; padding:2px 8px; border-radius:10px; background:white; border:1px solid #c7d2fe;">${getCleanJobTypeName(s.jobType)} <em style="font-style:normal; color:#64748b;">(${s.status})</em></span>`).join('');
            return;
        }
    }

    if (workerIdForNew) {
        const openJobs = jobs.filter(j => j.workerId === workerIdForNew && isJobStatusOpen(j.status));
        if (openJobs.length > 0) {
            hintBox.style.display = 'block';
            hintBox.style.background = '#fffbeb';
            hintBox.style.color = '#92400e';
            hintBox.style.border = '1px solid #fde68a';
            hintBox.innerHTML = `⚠️ คนงานคนนี้มีงานที่ยังเปิดอยู่ <strong>${openJobs.length}</strong> รายการ: ` +
                openJobs.map(s => `<span style="display:inline-block; margin:2px 4px; padding:2px 8px; border-radius:10px; background:white; border:1px solid #fde68a;">${getCleanJobTypeName(s.jobType)} <em style="font-style:normal; color:#64748b;">(${s.status})</em></span>`).join('') +
                ` — ประเภทที่ซ้ำกับรายการเหล่านี้จะถูกล็อกไว้ด้านล่าง`;
            return;
        }
    }

    hintBox.style.display = 'none';
    hintBox.innerHTML = '';
}

async function saveJob(e) {
    e.preventDefault();
    const editId = document.getElementById("job-edit-id").value;
    const customerId = document.getElementById("job-customer-id").value;
    const workerId = document.getElementById("job-worker-id").value;
    
    // Read checkboxes and their prices
    const checkBoxes = document.querySelectorAll("input[name='job-type-checkbox']:checked");
    if (checkBoxes.length === 0) {
        alert("กรุณาเลือกประเภทงานที่แจ้งอย่างน้อย 1 รายการ");
        return;
    }

    // ป้องกันเปิดงานประเภทเดียวกันซ้อนกัน: ตรวจซ้ำอีกครั้งฝั่ง JS ตอนบันทึกจริง
    // (การล็อกช่องติ๊กใน UI ป้องกันไว้ชั้นหนึ่งแล้ว แต่ตรวจซ้ำเผื่อข้อมูลเปลี่ยนระหว่างเปิดฟอร์มค้างไว้)
    const conflicts = [];
    checkBoxes.forEach(cb => {
        const conflict = findOpenJobConflict(workerId, cb.value, editId || null);
        if (conflict) {
            conflicts.push(`• "${cb.value}" — ค้างอยู่ที่ใบงานเลขที่ ${getJobDisplayNo(conflict)} (สถานะ: ${conflict.status})`);
        }
    });
    if (conflicts.length > 0) {
        alert(`⚠️ ไม่สามารถเปิดงานซ้ำได้\n\nคนงานคนนี้มีงานประเภทต่อไปนี้ค้างอยู่แล้ว กรุณาแก้ไขหรือปิดงานเดิมก่อน:\n\n${conflicts.join('\n')}`);
        return;
    }

    let totalFee = 0;
    const selectedItems = [];
    checkBoxes.forEach(cb => {
        const wrapper = cb.closest('div');
        const priceInput = wrapper.querySelector("input[name='job-type-price']");
        const price = priceInput && priceInput.value ? parseFloat(priceInput.value) : 0;
        totalFee += price;
        selectedItems.push(`${cb.value} (${price})`);
    });

    const jobType = selectedItems.join(", ");
    const fee = totalFee;
    const status = document.getElementById("job-status").value;
    const notes = document.getElementById("job-notes").value;
    const orderNo = document.getElementById("job-order-no").value.trim();
    const updatedAt = new Date().toISOString().split('T')[0];

    if (!customerId || !workerId || !jobType || isNaN(fee)) {
        alert("กรุณากรอกข้อมูลสั่งงานและเลือกประเภทงานพร้อมระบุราคาอย่างน้อย 1 รายการ");
        return;
    }

    if (editId) {
        // Edit mode: save as a single job (คงค่า batchId และ createdAt เดิมไว้เสมอ
        // เพื่อไม่ให้ "เลขที่แจ้งงาน" ซึ่งอิงวันที่เปิดงานครั้งแรกเปลี่ยนไปตอนแก้ไข)
        const originalJob = jobs.find(item => item.id === editId);
        const jobData = {
            id: editId,
            batchId: originalJob ? (originalJob.batchId || null) : null,
            createdAt: originalJob ? (originalJob.createdAt || originalJob.updatedAt) : updatedAt,
            customerId, workerId, jobType, fee, status, notes, orderNo, updatedAt
        };
        showToast("💾 กำลังบันทึกการแก้ไขใบสั่งงานเข้าคลาวด์...", "warning");
        const jobSaveRes = await callCloudAPI("saveJob", { jobData: jobData });
        if (!jobSaveRes) {
            showToast("❌ บันทึกไม่สำเร็จ การแก้ไขยังไม่ถูกบันทึกลงชีต กรุณาลองใหม่", "danger");
            return;
        }
        
        const idx = jobs.findIndex(item => item.id === editId);
        if (idx !== -1) {
            jobs[idx] = jobData;
            showToast("อัปเดตงานและขั้นตอนสำเร็จ", "success");
        }
    } else {
        // Add mode: if multiple items are checked, split them into separate job cards!
        // ทุกใบงานที่แตกออกมาในการแจ้งงานครั้งนี้ ผูกกันด้วย batchId เดียวกัน
        // (1 ประเภทงาน = 1 ใบงานอิสระ แต่รู้ว่ามาจากการแจ้งงานครั้งเดียวกัน)
        const batchId = 'batch-' + Date.now().toString().slice(-8);
        showToast(`💾 กำลังสร้างใบสั่งงานย่อย ${checkBoxes.length} รายการเข้าคลาวด์...`, "warning");
        
        let failedCount = 0;
        for (let i = 0; i < checkBoxes.length; i++) {
            const cb = checkBoxes[i];
            const wrapper = cb.closest('div');
            const priceInput = wrapper.querySelector("input[name='job-type-price']");
            const price = priceInput && priceInput.value ? parseFloat(priceInput.value) : 0;
            
            const subJobType = `${cb.value} (${price})`;
            const subJobData = {
                id: 'job-' + (Date.now() + i).toString().slice(-6),
                batchId: batchId,
                createdAt: updatedAt,
                customerId,
                workerId,
                jobType: subJobType,
                fee: price,
                status: status,
                notes: notes,
                orderNo: orderNo,
                updatedAt: updatedAt
            };
            
            const subJobRes = await callCloudAPI("saveJob", { jobData: subJobData });
            if (subJobRes) {
                jobs.push(subJobData);
            } else {
                failedCount++;
            }
        }
        if (failedCount > 0) {
            showToast(`⚠️ บันทึกไม่สำเร็จ ${failedCount} จาก ${checkBoxes.length} รายการ (ยังไม่ถูกบันทึกลงชีต)`, "danger");
        } else {
            showToast(`เปิดจ๊อบใบสั่งงานย่อย ${checkBoxes.length} รายการสำเร็จ`, "success");
        }
    }

    saveData();
    closeJobModal();
    renderJobs();
    
    // Update dashboard alerts
    renderDashboard();
}

async function deleteJob(id) {
    if (currentUser.role !== 'admin') {
        showToast("❌ คุณไม่มีสิทธิ์ลบข้อมูลนี้", "danger");
        return;
    }

    if (confirm("คุณแน่ใจหรือไม่ที่จะลบใบแจ้งงานนี้?")) {
        showToast("🗑️ กำลังลบข้อมูลออกจากคลาวด์...", "warning");
        const res = await callCloudAPI("deleteRecord", { sheetName: "Jobs", id: id });
        if (res) {
            jobs = jobs.filter(j => j.id !== id);
            saveData();
            renderJobs();
            showToast("ลบข้อมูลสั่งงานเรียบร้อยแล้ว", "success");
        }
    }
}


// ==================== BANK ACCOUNTS MODULE LOGIC ====================
function renderBanks() {
    const query = document.getElementById("search-bank").value.toLowerCase();
    const grid = document.getElementById("banks-list-grid");

    const filtered = banks.filter(b => 
        b.bankName.toLowerCase().includes(query) ||
        b.accountName.toLowerCase().includes(query) ||
        b.accountNumber.includes(query)
    );

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <p>❌ ไม่พบบัญชีธนาคารรับโอน</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(b => {
        let deleteBtn = '';
        let editBtn = '';

        if (currentUser.role !== 'staff') {
            editBtn = `
                <button class="action-icon-btn btn-sm" onclick="openBankModal('${b.id}')" title="แก้ไข">
                    ✏️
                </button>
            `;
        }

        if (currentUser.role === 'admin') {
            deleteBtn = `
                <button class="action-icon-btn btn-sm delete-btn" onclick="deleteBank('${b.id}')" title="ลบ">
                    🗑️
                </button>
            `;
        }

        return `
            <div class="bank-card">
                <div class="bank-card-actions">
                    ${editBtn}
                    ${deleteBtn}
                </div>
                <div class="bank-card-info">
                    <span class="badge badge-gold" style="margin-bottom: 8px;">${b.bankName}</span>
                    <h4>${b.accountName}</h4>
                    <div class="bank-card-acc-no">${b.accountNumber}</div>
                </div>
                <div class="bank-card-meta">
                    <div>💬 พร้อมเพย์ ID: <strong>${b.promptPayId}</strong></div>
                    <small class="text-muted">ระบบจะแสดง QR Code ชำระเงินด้วยเบอร์นี้</small>
                </div>
            </div>
        `;
    }).join('');
}

function openBankModal(id = null) {
    document.getElementById("bank-form").reset();
    const modalTitle = document.getElementById("bank-modal-title");
    const editIdInput = document.getElementById("bank-edit-id");

    if (id) {
        modalTitle.innerText = "แก้ไขข้อมูลบัญชีธนาคาร";
        editIdInput.value = id;

        const b = banks.find(item => item.id === id);
        document.getElementById("bank-name").value = b.bankName;
        document.getElementById("bank-account-name").value = b.accountName;
        document.getElementById("bank-account-number").value = b.accountNumber;
        document.getElementById("bank-promptpay-id").value = b.promptPayId;
    } else {
        modalTitle.innerText = "เพิ่มบัญชีธนาคารรับเงินใหม่";
        editIdInput.value = "";
    }

    document.getElementById("bank-modal").classList.remove("hidden");
}

function closeBankModal() {
    document.getElementById("bank-modal").classList.add("hidden");
}

function saveBank(e) {
    e.preventDefault();
    const editId = document.getElementById("bank-edit-id").value;
    const bankName = document.getElementById("bank-name").value;
    const accountName = document.getElementById("bank-account-name").value;
    const accountNumber = document.getElementById("bank-account-number").value;
    const promptPayId = document.getElementById("bank-promptpay-id").value.trim();

    if (!bankName || !accountName || !accountNumber || !promptPayId) {
        alert("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
        return;
    }

    const bankData = {
        id: editId || 'bank-' + Date.now(),
        bankName, accountName, accountNumber, promptPayId
    };

    if (editId) {
        const idx = banks.findIndex(item => item.id === editId);
        if (idx !== -1) {
            banks[idx] = bankData;
            showToast("แก้ไขบัญชีสำเร็จ", "success");
        }
    } else {
        banks.push(bankData);
        showToast("เพิ่มบัญชีธนาคารรับเงินสำเร็จ", "success");
    }

    saveData();
    closeBankModal();
    renderBanks();
}

// ==================== USERS MANAGEMENT (Admin only) ====================
function renderUsers() {
    const tbody = document.getElementById("users-tbody");
    if (!tbody) return;

    const searchEl = document.getElementById("search-user");
    const search = searchEl ? searchEl.value.trim().toLowerCase() : "";

    const filtered = users.filter(u => {
        if (!search) return true;
        return (u.name || "").toLowerCase().includes(search) || (u.email || "").toLowerCase().includes(search);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--text-muted);">ไม่พบบัญชีผู้ใช้งาน</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(u => `
        <tr>
            <td>${u.name || '-'}</td>
            <td>${u.email || '-'}</td>
            <td><span class="badge">${getRoleLabel(u.role)}</span></td>
            <td>${u.role === 'client' ? (u.customer_id || '-') : '-'}</td>
        </tr>
    `).join('');
}

function toggleUserCustomerField() {
    const role = document.getElementById("user-role").value;
    const group = document.getElementById("user-customer-id-group");
    const select = document.getElementById("user-customer-id");
    if (!group || !select) return;

    if (role === 'client') {
        group.classList.remove('hidden');
        select.innerHTML = '<option value="" disabled selected>--- เลือกนายจ้าง ---</option>' +
            customers.map(c => `<option value="${c.id}">${c.companyName}</option>`).join('');
    } else {
        group.classList.add('hidden');
    }
}

function openUserModal() {
    if (currentUser.role !== 'admin') {
        showToast("❌ เฉพาะแอดมิน (Admin) เท่านั้นที่สามารถเพิ่มบัญชีผู้ใช้งานได้", "danger");
        return;
    }
    document.getElementById("user-form").reset();
    toggleUserCustomerField();
    document.getElementById("user-modal").classList.remove("hidden");
}

function closeUserModal() {
    document.getElementById("user-modal").classList.add("hidden");
}

async function saveUser(e) {
    e.preventDefault();

    const name = document.getElementById("user-name").value.trim();
    const email = document.getElementById("user-email").value.trim();
    const password = document.getElementById("user-password").value;
    const role = document.getElementById("user-role").value;
    const customerId = document.getElementById("user-customer-id") ? document.getElementById("user-customer-id").value : "";
    const pin = document.getElementById("user-pin").value.trim();

    if (!name || !email || !password || !role) {
        alert("กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน");
        return;
    }
    if (role === 'client' && !customerId) {
        alert("กรุณาเลือกนายจ้างสำหรับบัญชีประเภท Client");
        return;
    }
    if (!pin) {
        alert("กรุณากรอกรหัส PIN เพื่อยืนยันสิทธิ์การเพิ่มบัญชี");
        return;
    }

    const userData = { name, email, password, role, customer_id: role === 'client' ? customerId : '-' };

    showToast("💾 กำลังบันทึกบัญชีผู้ใช้งานเข้าคลาวด์...", "warning");
    const res = await callCloudAPI("saveUser", { userData: userData, pin: pin });
    if (!res) {
        // callCloudAPI already shows the specific error toast (e.g. รหัส PIN ไม่ถูกต้อง / อีเมลซ้ำ)
        return;
    }

    users.push({ email, name, role, customer_id: userData.customer_id });
    localStorage.setItem("mw_users", JSON.stringify(users));
    showToast("เพิ่มบัญชีผู้ใช้งานใหม่สำเร็จ", "success");
    closeUserModal();
    renderUsers();
}

function deleteBank(id) {
    if (currentUser.role !== 'admin') {
        showToast("❌ คุณไม่มีสิทธิ์ลบข้อมูลนี้", "danger");
        return;
    }

    if (confirm("คุณแน่ใจหรือไม่ที่จะลบช่องทางการโอนเงินนี้?")) {
        banks = banks.filter(b => b.id !== id);
        saveData();
        renderBanks();
        showToast("ลบบัญชีธนาคารเรียบร้อยแล้ว", "success");
    }
}


// ==================== INVOICE & PROMPTPAY QR GENERATOR ====================
let currentActiveJobForInvoice = null;

// ==================== INVOICE & PROMPTPAY QR GENERATOR ====================
let currentInvoiceItems = [];
let currentInvoiceJobIds = [];

function openInvoiceModal(jobId) {
    if (banks.length === 0) {
        alert("กรุณาเพิ่มข้อมูลบัญชีธนาคารอย่างน้อย 1 บัญชีก่อนออกบิลและเก็บเงิน");
        switchView('banks');
        return;
    }

    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const selectBank = document.getElementById("invoice-bank-select");
    const markPaidBtn = document.getElementById("btn-mark-paid");

    if (jobId) {
        // --- Single Linked Job Mode ---
        const j = jobs.find(item => item.id === jobId);
        if (!j) return;

        // Auto update status to "ออกบิลแล้ว" if not already paid
        if (j.status !== 'ชำระเงินแล้ว' && j.status !== 'ออกบิลแล้ว') {
            j.status = 'ออกบิลแล้ว';
            j.updatedAt = new Date().toISOString().split('T')[0];
            saveData();
            renderJobs();
            renderDashboard();
        }

        const cust = customers.find(c => c.id === j.customerId);
        const work = workers.find(w => w.id === j.workerId);

        // Fill Client Info
        document.getElementById("inv-cust-name").innerText = cust ? cust.companyName : "ไม่ระบุบริษัท/ลูกค้า";
        const branchHq = cust ? (cust.branches.find(b => b.name.includes("สำนักงานใหญ่")) || cust.branches[0]) : null;
        const branchAddrStr = branchHq ? 
            `เลขที่ ${branchHq.houseNo} ม.${branchHq.moo} ต.${branchHq.subdistrict} อ.${branchHq.district} จ.${branchHq.province} ${branchHq.postalCode}` : 
            "ไม่ระบุที่อยู่";
        document.getElementById("inv-cust-addr").innerText = branchAddrStr;
        document.getElementById("inv-cust-tax").innerText = cust ? `เลขผู้เสียภาษี: ${cust.taxId}` : "เลขประจำตัวผู้เสียภาษี: -";

        // Fill Invoice Metadata
        document.getElementById("inv-no").innerText = `INV-${j.id.toUpperCase()}`;
        document.getElementById("inv-date").innerText = new Date(j.updatedAt).toLocaleDateString('th-TH', dateOptions);

        const workDetails = work ? 
            `คนงานต่างด้าว: คุณ ${work.firstName} ${work.lastName} (สัญชาติ: ${work.nationality}, เลขคนงาน: ${work.workerUid})` : 
            "คนงานต่างด้าว: ไม่พบข้อมูล/ยกเลิกสัญญาแล้ว";

        // Parse individual items and prices
        const parsedItems = parseJobTypeItems(j.jobType, j.fee);
        currentInvoiceItems = parsedItems.map((item, idx) => {
            return {
                id: `${j.id}-${idx}`,
                title: `ค่าบริการ: ${item.name}`,
                desc: workDetails,
                qty: 1,
                unitPrice: item.price,
                fee: item.price
            };
        });
        currentInvoiceJobIds = [j.id];

        if (j.status === 'ชำระเงินแล้ว') {
            if (markPaidBtn) markPaidBtn.style.display = 'none';
        } else {
            if (markPaidBtn) markPaidBtn.style.display = 'inline-block';
        }

    } else {
        // --- Free / Quick Invoice Mode ---
        const freeId = 'free-' + Date.now().toString().slice(-4);
        
        if (customers.length > 0) {
            const cust = customers[0];
            document.getElementById("inv-cust-name").innerText = cust.companyName;
            const branchHq = cust.branches.find(b => b.name.includes("สำนักงานใหญ่")) || cust.branches[0];
            const branchAddrStr = branchHq ? 
                `เลขที่ ${branchHq.houseNo} ม.${branchHq.moo} ต.${branchHq.subdistrict} อ.${branchHq.district} จ.${branchHq.province} ${branchHq.postalCode}` : 
                "ไม่ระบุที่อยู่";
            document.getElementById("inv-cust-addr").innerText = branchAddrStr;
            document.getElementById("inv-cust-tax").innerText = `เลขผู้เสียภาษี: ${cust.taxId}`;
        } else {
            document.getElementById("inv-cust-name").innerText = "ชื่อบริษัทลูกค้า/ผู้ว่าจ้าง (คลิกเพื่อพิมพ์แก้ไขตรงนี้)";
            document.getElementById("inv-cust-addr").innerText = "ที่อยู่ลูกค้า (คลิกเพื่อพิมพ์แก้ไขตรงนี้)";
            document.getElementById("inv-cust-tax").innerText = "เลขประจำตัวผู้เสียภาษี: -";
        }

        document.getElementById("inv-no").innerText = `INV-FREE-${Date.now().toString().slice(-4)}`;
        document.getElementById("inv-date").innerText = new Date().toLocaleDateString('th-TH', dateOptions);

        currentInvoiceItems = [
            {
                id: freeId,
                title: "ค่าธรรมเนียมประสานงานใบแจ้งจัดหางานและยื่นหนังสือเดินทาง (คลิกพิมพ์แก้ไข)",
                desc: "ระบุสัญชาติคนงาน หรือเลขเอกสารอื่นตามสมควร (คลิกพิมพ์แก้ไข)",
                fee: 3000
            }
        ];
        currentInvoiceJobIds = [];

        if (markPaidBtn) markPaidBtn.style.display = 'inline-block';
    }

    // Populate bank account dropdown selection list
    selectBank.innerHTML = banks.map(b => `<option value="${b.id}">${b.bankName} - ${b.accountName}</option>`).join('') +
        '<option value="cash">💵 รับชำระเป็นเงินสด (Cash Payment)</option>';

    // Render invoice items and calculate totals
    renderInvoiceItemsTable();

    document.getElementById("invoice-modal").classList.remove("hidden");
}

function closeInvoiceModal() {
    document.getElementById("invoice-modal").classList.add("hidden");
    currentInvoiceItems = [];
    currentInvoiceJobIds = [];
}

function renderInvoiceItemsTable() {
    const tbody = document.getElementById("invoice-items-tbody");
    if (!tbody) return;

    if (currentInvoiceItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">
                    ❌ ไม่มีรายการใบแจ้งหนี้
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = currentInvoiceItems.map((item, index) => {
        const qty = item.qty || 1;
        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : item.fee;
        return `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>
                    <div style="font-weight: 600; outline: none; border-bottom: 1px dashed transparent;" 
                         id="inv-item-title-${item.id}" 
                         contenteditable="true" 
                         oninput="recalculateInvoiceFromEdit()"
                         title="คลิกเพื่อแก้ไขคำอธิบาย">${item.title}</div>
                    <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px; outline: none; border-bottom: 1px dashed transparent; white-space: pre-line;" 
                         id="inv-item-desc-${item.id}" 
                         contenteditable="true" 
                         oninput="recalculateInvoiceFromEdit()"
                         title="คลิกเพื่อแก้ไขคำอธิบายย่อย">${item.desc}</div>
                </td>
                <td style="text-align: center;">${qty}</td>
                <td style="text-align: right;" id="inv-item-unitprice-${item.id}">${unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="text-align: right; font-weight: 600; background-color: rgba(212, 175, 55, 0.05); border: 1px dashed var(--gold-primary); outline: none;" 
                    id="inv-item-fee-${item.id}" 
                    contenteditable="true" 
                    oninput="recalculateInvoiceFromEdit()"
                    title="คลิกเพื่อแก้ไขราคา">${item.fee.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
        `;
    }).join('');

    // Trigger sum totals calculation
    calculateInvoiceTotals();
}

function recalculateInvoiceFromEdit() {
    currentInvoiceItems.forEach(item => {
        const titleEl = document.getElementById(`inv-item-title-${item.id}`);
        const descEl = document.getElementById(`inv-item-desc-${item.id}`);
        const feeEl = document.getElementById(`inv-item-fee-${item.id}`);

        if (titleEl) item.title = titleEl.innerText.trim();
        if (descEl) item.desc = descEl.innerText.trim();
        if (feeEl) {
            let feeText = feeEl.innerText.replace(/,/g, '').trim();
            let fee = parseFloat(feeText);
            item.fee = isNaN(fee) ? 0 : fee;
            const qty = item.qty || 1;
            item.unitPrice = item.fee / qty;
            
            const unitPriceEl = document.getElementById(`inv-item-unitprice-${item.id}`);
            if (unitPriceEl) {
                unitPriceEl.innerText = item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
        }
    });

    calculateInvoiceTotals();
}

function calculateInvoiceTotals() {
    const subtotal = currentInvoiceItems.reduce((sum, item) => sum + item.fee, 0);
    const vat = 0; // standard setup is 0 VAT
    const grandTotal = subtotal + vat;

    document.getElementById("inv-subtotal").innerText = subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 });
    document.getElementById("inv-vat").innerText = vat.toLocaleString('th-TH', { minimumFractionDigits: 2 });
    document.getElementById("inv-grand-total").innerText = grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 });
    document.getElementById("inv-qr-amount").innerText = grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 });

    // Update active dynamic QR Code
    updateInvoiceBankDetails();
}

function updateInvoiceBankDetails() {
    if (currentInvoiceItems.length === 0) return;

    const selectBank = document.getElementById("invoice-bank-select");
    const activeBankId = selectBank.value;
    if (activeBankId === 'cash') {
        document.getElementById("inv-bank-name").innerText = "รับชำระเป็นเงินสด (Cash)";
        document.getElementById("inv-bank-acc-name").innerText = "รับเงินสดโดยตรง";
        document.getElementById("inv-bank-acc-no").innerText = "-";
        
        const qrImg = document.getElementById("inv-qrcode-img");
        const qrFallback = document.getElementById("inv-qrcode-fallback");
        if (qrImg) qrImg.classList.add("hidden");
        if (qrFallback) qrFallback.classList.add("hidden");
        return;
    }
    
    const b = banks.find(item => item.id === activeBankId);
    if (!b) return;

    // Display Bank Card details inside invoice sheet
    document.getElementById("inv-bank-name").innerText = b.bankName;
    document.getElementById("inv-bank-acc-name").innerText = b.accountName;
    document.getElementById("inv-bank-acc-no").innerText = b.accountNumber;

    // Dynamic PromptPay QR Code Generation via promptpay.io API
    const qrImg = document.getElementById("inv-qrcode-img");
    const qrFallback = document.getElementById("inv-qrcode-fallback");
    
    const amount = currentInvoiceItems.reduce((sum, item) => sum + item.fee, 0);
    const promptpayId = b.promptPayId;

    if (b.qrImage) {
        qrImg.classList.remove("hidden");
        qrFallback.classList.add("hidden");
        qrImg.src = b.qrImage;
        qrImg.onerror = null;
    } else if (promptpayId) {
        qrImg.classList.remove("hidden");
        qrFallback.classList.add("hidden");
        
        // Set live URL image source. This service generates PromptPay QR Code dynamically!
        qrImg.src = 'https:' + '/' + '/promptpay.io/' + promptpayId + '/' + amount + '.png';
        
        // Handle image loading error fallback
        qrImg.onerror = () => {
            qrImg.classList.add("hidden");
            qrFallback.classList.remove("hidden");
        };
    } else {
        qrImg.classList.add("hidden");
        qrFallback.classList.remove("hidden");
    }
}

function markJobPaidFromInvoice() {
    if (currentUser.role === 'staff') {
        showToast("❌ คุณไม่มีสิทธิ์เปลี่ยนสถานะงานนี้", "danger");
        return;
    }

    const selectBank = document.getElementById("invoice-bank-select");
    const activeBankId = selectBank ? selectBank.value : 'cash';
    let payMethodLabel = "เงินสด";
    
    if (activeBankId !== 'cash') {
        const b = banks.find(item => item.id === activeBankId);
        if (b) {
            payMethodLabel = b.bankName;
        }
    }

    if (currentInvoiceJobIds.length === 0) {
        // Free invoice handling
        showToast(`บันทึกชำระค่าบริการบิลอิสระเรียบร้อยแล้ว (${payMethodLabel})`, 'success');
        closeInvoiceModal();
        return;
    }

    // Mark all combined jobs as Paid
    let paidFailedCount = 0;
    const updatePromises = currentInvoiceJobIds.map(async jobId => {
        const idx = jobs.findIndex(j => j.id === jobId);
        if (idx !== -1) {
            const prevStatus = jobs[idx].status;
            jobs[idx].status = `ชำระเงินแล้ว (${payMethodLabel})`;
            jobs[idx].updatedAt = new Date().toISOString().split('T')[0];
            
            // Sync status to cloud backend
            const res = await callCloudAPI("saveJob", { jobData: jobs[idx] });
            if (!res) {
                jobs[idx].status = prevStatus; // revert local change since save failed
                paidFailedCount++;
            }
        }
    });

    // Run sync in parallel (safe for updates on individual job rows since they target distinct row keys)
    Promise.all(updatePromises).then(() => {
        if (paidFailedCount > 0) {
            showToast(`⚠️ บันทึกไม่สำเร็จ ${paidFailedCount} จาก ${currentInvoiceJobIds.length} รายการ (ยังไม่ถูกบันทึกลงชีต)`, 'danger');
        } else {
            showToast(`บันทึกชำระค่าบริการงานทั้งหมดรวม ${currentInvoiceJobIds.length} รายการ เรียบร้อยแล้ว (${payMethodLabel})`, 'success');
        }
        saveData();
        closeInvoiceModal();
        renderJobs();
        renderDashboard();
    });
}


// ==================== COMBINE BILLS MODAL LOGIC ====================
function openCombineBillsModal() {
    if (customers.length === 0) {
        alert("กรุณากรอกข้อมูล นายจ้าง/ลูกค้า อย่างน้อย 1 รายก่อนเปิดการรวมบิล");
        return;
    }

    document.getElementById("combine-cust-select").innerHTML = 
        '<option value="" disabled selected>--- เลือกนายจ้าง/ลูกค้าผู้ว่าจ้าง ---</option>' +
        customers.map(c => `<option value="${c.id}">${c.companyName}</option>`).join('');

    document.getElementById("combine-jobs-list").innerHTML = `
        <span class="text-muted" style="font-size: 13px; text-align: center; display: block; padding: 20px 0;">
            💡 กรุณาเลือกนายจ้างด้านบนเพื่อดึงข้อมูลใบสั่งงานที่ค้างจ่าย
        </span>
    `;

    document.getElementById("combine-total-amount").innerText = "0.00";
    document.getElementById("btn-generate-combined").disabled = true;

    document.getElementById("combine-bills-modal").classList.remove("hidden");
}

function closeCombineBillsModal() {
    document.getElementById("combine-bills-modal").classList.add("hidden");
}

function onCombineCustomerChange() {
    const custId = document.getElementById("combine-cust-select").value;
    const listContainer = document.getElementById("combine-jobs-list");

    // Filter unpaid jobs under this customer
    const unpaidJobs = jobs.filter(j => j.customerId === custId && j.status !== 'ชำระเงินแล้ว');

    if (unpaidJobs.length === 0) {
        listContainer.innerHTML = `
            <span class="text-muted" style="font-size: 13px; text-align: center; display: block; padding: 20px 0; color: var(--danger);">
                ❌ ไม่พบงานที่ค้างชำระของนายจ้างรายนี้ในระบบ
            </span>
        `;
        document.getElementById("combine-total-amount").innerText = "0.00";
        document.getElementById("btn-generate-combined").disabled = true;
        return;
    }

    listContainer.innerHTML = unpaidJobs.map(j => {
        const work = workers.find(w => w.id === j.workerId);
        const workName = work ? `${work.firstName} ${work.lastName} (${work.nationality})` : "ไม่ระบุคนงานต่างด้าว";
        
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 13.5px; gap: 15px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: normal; margin: 0; width: 65%;">
                    <input type="checkbox" name="combine-job-checkbox" value="${j.id}" onchange="updateCombineTotalAmount()" style="width: 16px; height: 16px; cursor: pointer;">
                    <div>
                        <strong>${j.jobType || "ไม่ระบุประเภทงาน"}</strong> - คนงาน: ${workName}
                    </div>
                </label>
                <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                    <input type="number" id="combine-fee-${j.id}" value="${j.fee}" oninput="updateCombineTotalAmount()" style="width: 90px; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12.5px; text-align: right; font-family: inherit;">
                    <span style="color: var(--text-muted); font-size: 12.5px;">บาท</span>
                </div>
            </div>
        `;
    }).join('');

    updateCombineTotalAmount();
}

function updateCombineTotalAmount() {
    const checkboxes = document.querySelectorAll('input[name="combine-job-checkbox"]:checked');
    let total = 0;

    checkboxes.forEach(cb => {
        const jobId = cb.value;
        const feeInput = document.getElementById(`combine-fee-${jobId}`);
        if (feeInput) {
            const feeVal = parseFloat(feeInput.value);
            total += isNaN(feeVal) ? 0 : feeVal;
        }
    });

    document.getElementById("combine-total-amount").innerText = total.toLocaleString('th-TH', { minimumFractionDigits: 2 });
    
    // Toggle generate button
    document.getElementById("btn-generate-combined").disabled = checkboxes.length === 0;
}

function generateCombinedInvoice() {
    const checkboxes = document.querySelectorAll('input[name="combine-job-checkbox"]:checked');
    if (checkboxes.length === 0) return;

    const selectedJobIds = Array.from(checkboxes).map(cb => cb.value);
    const firstJob = jobs.find(j => j.id === selectedJobIds[0]);
    const cust = customers.find(c => c.id === firstJob.customerId);

    // Auto set status to Invoiced for all selected jobs
    selectedJobIds.forEach(jobId => {
        const jIdx = jobs.findIndex(x => x.id === jobId);
        if (jIdx !== -1 && jobs[jIdx].status !== 'ออกบิลแล้ว' && jobs[jIdx].status !== 'ชำระเงินแล้ว') {
            jobs[jIdx].status = 'ออกบิลแล้ว';
            jobs[jIdx].updatedAt = new Date().toISOString().split('T')[0];
        }
    });
    saveData();
    renderJobs();
    renderDashboard();

    // Fill Client Info inside modal
    document.getElementById("inv-cust-name").innerText = cust ? cust.companyName : "ไม่ระบุบริษัท";
    const branchHq = cust ? (cust.branches.find(b => b.name.includes("สำนักงานใหญ่")) || cust.branches[0]) : null;
    const branchAddrStr = branchHq ? 
        `เลขที่ ${branchHq.houseNo} ม.${branchHq.moo} ต.${branchHq.subdistrict} อ.${branchHq.district} จ.${branchHq.province} ${branchHq.postalCode}` : 
        "ไม่ระบุที่อยู่";
    document.getElementById("inv-cust-addr").innerText = branchAddrStr;
    document.getElementById("inv-cust-tax").innerText = cust ? `เลขผู้เสียภาษี: ${cust.taxId}` : "เลขประจำตัวผู้เสียภาษี: -";

    // Fill Invoice Metadata
    document.getElementById("inv-no").innerText = `INV-COMB-${Date.now().toString().slice(-4)}`;
    document.getElementById("inv-date").innerText = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    // Populate current invoice items array with custom fees from modal!
    currentInvoiceItems = [];
    const aggregated = {}; // key: serviceName, value: { name, unitPriceSum, jobs: [{ jobId, workDetails, price }] }

    selectedJobIds.forEach(jobId => {
        const j = jobs.find(x => x.id === jobId);
        if (!j) return;
        const work = workers.find(w => w.id === j.workerId);
        const workDetails = work ? 
            `${work.firstName} ${work.lastName} (${work.nationality})` : 
            "ไม่พบข้อมูลคนงาน";

        const feeInput = document.getElementById(`combine-fee-${jobId}`);
        const rawFee = feeInput ? feeInput.value : j.fee;
        const customFee = parseFloat(rawFee);
        const totalFee = isNaN(customFee) ? 0 : customFee;

        // Parse items
        const parsedItems = parseJobTypeItems(j.jobType, j.fee);
        
        // Distribute the custom fee proportionally
        const originalSum = parsedItems.reduce((sum, item) => sum + item.price, 0);
        
        parsedItems.forEach((item, idx) => {
            let itemFee = item.price;
            if (originalSum > 0) {
                itemFee = (item.price / originalSum) * totalFee;
            } else if (idx === 0) {
                itemFee = totalFee;
            }
            
            const serviceName = item.name;
            if (!aggregated[serviceName]) {
                aggregated[serviceName] = {
                    name: serviceName,
                    jobs: []
                };
            }
            
            aggregated[serviceName].jobs.push({
                jobId: j.id,
                workDetails: workDetails,
                price: itemFee
            });
        });
    });

    // Map aggregated services to currentInvoiceItems
    let itemIdx = 0;
    Object.keys(aggregated).forEach(serviceName => {
        const group = aggregated[serviceName];
        const qty = group.jobs.length;
        
        // The unit price is the average of custom fees (which keeps math exact)
        const unitPrice = qty > 0 ? (group.jobs.reduce((sum, x) => sum + x.price, 0) / qty) : 0;
        const fee = qty * unitPrice;
        
        // Format description with a clean list of workers
        const workerList = group.jobs.map((jb, idx) => `${idx + 1}. ${jb.workDetails}`).join('\n');
        
        currentInvoiceItems.push({
            id: `aggregated-${itemIdx++}`,
            title: `ค่าบริการ: ${serviceName}`,
            desc: workerList,
            qty: qty,
            unitPrice: unitPrice,
            fee: fee
        });
    });
    currentInvoiceJobIds = selectedJobIds;

    // Open invoice sheet
    const selectBank = document.getElementById("invoice-bank-select");
    selectBank.innerHTML = banks.map(b => `<option value="${b.id}">${b.bankName} - ${b.accountName}</option>`).join('') +
        '<option value="cash">💵 รับชำระเป็นเงินสด (Cash Payment)</option>';

    renderInvoiceItemsTable();

    // Toggle button display
    const markPaidBtn = document.getElementById("btn-mark-paid");
    if (markPaidBtn) markPaidBtn.style.display = 'inline-block';

    // Close combine bills modal and open invoice sheet
    closeCombineBillsModal();
    document.getElementById("invoice-modal").classList.remove("hidden");
}

// ==================== SYSTEM DATA BACKUP & RESTORE ====================
function exportSystemData() {
    const backupData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        customers: customers,
        workers: workers,
        banks: banks,
        jobs: jobs
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    
    // Set file name: migrant_system_backup_YYYY-MM-DD.json
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `migrant_system_backup_${dateStr}.json`);
    
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast("📥 ดาวน์โหลดไฟล์สำรองข้อมูลเรียบร้อยแล้ว กรุณาเซฟเก็บไว้ใน Google Drive", "success");
}

function importSystemData(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Display file name in UI
    document.getElementById("import-file-name").innerText = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            
            // Validate backup file structure
            if (!imported.customers || !imported.workers || !imported.banks || !imported.jobs) {
                throw new Error("โครงสร้างไฟล์ข้อมูลไม่ถูกต้อง");
            }

            if (!confirm(`⚠️ ยืนยันการนำเข้าข้อมูล? การนำเข้าข้อมูลนี้จะเขียนทับฐานข้อมูลเดิมทั้งหมดของคุณในปัจจุบัน (นายจ้าง ${imported.customers.length} ราย, คนงาน ${imported.workers.length} คน, งาน ${imported.jobs.length} รายการ)`)) {
                // reset input file
                event.target.value = '';
                document.getElementById("import-file-name").innerText = "ยังไม่ได้เลือกไฟล์";
                return;
            }

            // Write variables
            customers = imported.customers;
            workers = imported.workers;
            banks = imported.banks;
            jobs = imported.jobs;

            // Save to localStorage
            saveData();
            
            showToast("✅ นำเข้าข้อมูลระบบทั้งหมดเสร็จสมบูรณ์!", "success");
            
            // Refresh dashboard and redirect to dashboard
            switchView('dashboard');
            
            // reset file input
            event.target.value = '';
            document.getElementById("import-file-name").innerText = "ยังไม่ได้เลือกไฟล์";

        } catch (err) {
            alert("❌ เกิดข้อผิดพลาดในการอ่านไฟล์: " + err.message);
            event.target.value = '';
            document.getElementById("import-file-name").innerText = "ยังไม่ได้เลือกไฟล์";
        }
    };
    reader.readAsText(file);
}

// ==================== GOOGLE SHEETS CLOUD SYNC ====================
function saveSheetsUrl() {
    const url = document.getElementById("sheets-webapp-url").value.trim();
    localStorage.setItem("mw_sheets_url", url);
}

function loadSheetsUrl() {
    const url = localStorage.getItem("mw_sheets_url") || "";
    const input = document.getElementById("sheets-webapp-url");
    if (input) input.value = url;
}

// Automatically load on app start
document.addEventListener("DOMContentLoaded", () => {
    loadSheetsUrl();
    setupDateMask("worker-dob");
    setupDateMask("worker-permit-expiry");
    setupDateMask("worker-passport-issue");
    setupDateMask("worker-passport-expiry");
});

async function uploadFileToServer(fileContent, fileName) {
    try {
        showToast("💾 กำลังบันทึกไฟล์ลงเซิร์ฟเวอร์จำลองเพื่อประหยัดพื้นที่...", "warning");
        const response = await fetch(`/api/upload?filename=${encodeURIComponent(fileName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: fileContent
        });
        if (response.ok) {
            const data = await response.json();
            if (data && data.status === 'success') {
                return data.fileUrl;
            }
        }
    } catch (e) {
        console.error("Local server upload failed:", e);
    }
    return null;
}

// หมายเหตุ: ชื่อฟังก์ชันคงเดิม (uploadFileToGoogleDrive) เพื่อไม่ต้องแก้จุดเรียกใช้
// อื่นๆ ในไฟล์นี้ แต่ภายในเปลี่ยนไปอัปโหลดขึ้น Supabase Storage แทน Google Drive
// และเรียก Edge Function "ocr-document" แทน Gemini call ฝั่ง Code.gs เดิม
async function uploadFileToGoogleDrive(fileDataUrl, fileName, customerId = "", workerId = "", docType = "") {
    if (!window.supabaseAdapter) return null; // ยังไม่ได้ตั้งค่า Supabase

    try {
        showToast("☁️ กำลังอัปโหลดไฟล์ขึ้น Supabase Storage...", "warning");
        const resData = await window.supabaseAdapter.uploadFile(fileDataUrl, fileName, customerId, workerId, docType, currentUser);

        if (resData && resData.status === 'success') {
            showToast("✅ บันทึกไฟล์สำเร็จ!", "success");
            return {
                fileUrl: resData.fileUrl,
                viewUrl: resData.viewUrl,
                fileId: resData.fileId,
                parsedData: resData.parsedData
            };
        } else {
            console.warn("Storage upload failed:", resData && resData.message);
            showToast("❌ อัปโหลดไฟล์ล้มเหลว: " + ((resData && resData.message) || "ข้อผิดพลาดระบบ"), "danger");
        }
    } catch (error) {
        console.error("Failed to upload file to Supabase Storage:", error);
        showToast("⚠️ ไม่สามารถอัปโหลดไฟล์ได้", "danger");
    }
    return null;
}

async function syncRowToGoogleSheets(action, data) {
    const url = getApiUrl();
    if (!url) return; // not connected

    try {
        await fetch(url, {
            method: 'POST',
            mode: 'no-cors', // standard way to bypass CORS for Apps Script redirects
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                data: data
            })
        });
        console.log(`Synced ${action} item to Google Sheets successfully`);
    } catch (e) {
        console.error("Failed to sync row to Google Sheets:", e);
    }
}

async function testGoogleSheetsConnection() {
    const url = getApiUrl();
    if (!url) {
        alert("❌ กรุณากรอก Web App URL ก่อนกดทดสอบ");
        return;
    }

    showToast("⚡ กำลังทดสอบเชื่อมต่อ Google Sheets...", "warning");
    
    try {
        // App Script POST request test
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain' // to bypass CORS preflight check on simple GET/POST redirects
            },
            body: JSON.stringify({ action: "test" })
        });
        const result = await res.json();
        if (result.status === "success") {
            alert("✅ เชื่อมต่อ Google Sheets สำเร็จ! ระบบพร้อมบันทึกข้อมูลแบบเรียลไทม์แล้ว");
            showToast("✅ เชื่อมต่อสำเร็จ!", "success");
        } else {
            alert("❌ เชื่อมต่อไม่สำเร็จ: " + result.message);
        }
    } catch (e) {
        // Fallback warning for CORS or redirect issues
        alert("⚠️ เชื่อมโยงสคริปต์เสร็จเรียบร้อย! หากเบราว์เซอร์แจ้งเตือนบล็อค CORS ให้ลองเพิ่มข้อมูลจำลอง 1 แถวแล้วเปิดหน้า Google Sheets เช็คดูว่าแถวข้อมูลใหม่ขึ้นหรือไม่ครับ");
    }
}

async function syncAllToGoogleSheets() {
    const url = getApiUrl();
    if (!url) {
        alert("❌ กรุณากรอก Web App URL และเชื่อมต่อระบบก่อน");
        return;
    }

    const btn = document.getElementById("btn-sync-sheets");
    btn.disabled = true;
    btn.innerText = "⏳ กำลังส่งข้อมูล (Syncing)...";

    showToast("📤 กำลังเตรียมส่งข้อมูลทั้งหมดเข้า Google Sheets...", "warning");

    try {
        // 1. Sync Customers
        for (const c of customers) {
            await syncRowToGoogleSheets("Customers", {
                taxId: c.taxId,
                companyName: c.companyName,
                businessType: c.businessType,
                coordinator: c.coordinator,
                phone: c.phone
            });
        }

        // 2. Sync Workers
        for (const w of workers) {
            const emp = customers.find(c => c.id === w.employerId);
            const empName = emp ? emp.companyName : "ไม่ระบุนายจ้าง";
            await syncRowToGoogleSheets("Workers", {
                workerUid: w.workerUid,
                firstName: w.firstName,
                lastName: w.lastName,
                nationality: w.nationality,
                passportNo: w.passportNo,
                permitNo: w.permitNo,
                permitExpiry: w.permitExpiry,
                employerName: empName
            });
        }

        // 3. Sync Jobs
        for (const j of jobs) {
            const cust = customers.find(c => c.id === j.customerId);
            const work = workers.find(w => w.id === j.workerId);
            const custName = cust ? cust.companyName : "ไม่ระบุนายจ้าง";
            const workName = work ? `${work.firstName} ${work.lastName}` : "ไม่ระบุคนงาน";
            await syncRowToGoogleSheets("Jobs", {
                id: j.id,
                customerName: custName,
                workerName: workName,
                jobType: j.jobType,
                fee: j.fee,
                status: j.status,
                notes: j.notes
            });
        }

        alert(`✅ ส่งออกข้อมูลเข้าระบบ Google Sheets สำเร็จ!\n- นายจ้าง ${customers.length} ราย\n- คนงาน ${workers.length} คน\n- ใบแจ้งงาน ${jobs.length} รายการ\nเรียบร้อยแล้วครับ!`);
        showToast("✅ เชื่อมโยงข้อมูลชีทสำเร็จ!", "success");

    } catch (e) {
        alert("❌ เกิดข้อผิดพลาดในการส่งข้อมูล: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "📤 ส่งข้อมูลทั้งหมดเข้า Google Sheets (Sync All)";
    }
}

// ==================== ATTACHMENT DOWNLOADS & SHARING HELPERS ====================
function filterWorkersByEmployer(employerId) {
    switchView('workers');
    const selectEmp = document.getElementById("filter-worker-employer");
    if (selectEmp) {
        selectEmp.value = employerId;
    }
    const selectStatus = document.getElementById("filter-worker-employment-status");
    if (selectStatus) {
        selectStatus.value = "all"; // show all to find both active and archived workers
    }
    renderWorkers();
}

// เปิดโฟลเดอร์เอกสารจริงใน Google Drive ของนายจ้าง/คนงานรายนั้นในแท็บใหม่
function openDriveFolder(folderId) {
    if (!folderId) {
        showToast("⚠️ ยังไม่มีโฟลเดอร์ Drive สำหรับรายการนี้ (ระบบจะสร้างให้อัตโนมัติเมื่อมีการแนบไฟล์ครั้งแรก)", "warning");
        return;
    }
    window.open(`https://drive.google.com/drive/folders/${folderId}`, '_blank');
}

function downloadAttachment(fileName, docType, dataUrl = null) {
    let url = dataUrl;
    let isTempUrl = false;
    
    if (!url || !url.startsWith("data:")) {
        const dummyPdfContent = "%PDF-1.4 ... (Mock PDF Scan of " + docType + ": " + fileName + ")";
        const blob = new Blob([dummyPdfContent], { type: 'application/pdf' });
        url = URL.createObjectURL(blob);
        isTempUrl = true;
    }
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    if (isTempUrl) {
        URL.revokeObjectURL(url);
    }
    
    showToast(`📥 ดาวน์โหลดเอกสาร: ${fileName} เรียบร้อยแล้ว`, 'success');
}

function shareAttachment(fileName, entityName) {
    const shareText = `🔗 ลิงก์ดาวน์โหลดเอกสารของ: ${entityName}\nเอกสาร: ${fileName}\n(คัดลอกเพื่อส่งแชร์ต่อทาง Line/Email ให้กับนายจ้างเรียบร้อยแล้ว)`;
    
    navigator.clipboard.writeText(shareText).then(() => {
        showToast("📋 คัดลอกลิงก์แชร์เอกสารเรียบร้อยแล้ว! สามารถกดวางส่งต่อให้ลูกค้าได้เลย", "success");
    }).catch(err => {
        alert("ไม่สามารถคัดลอกได้: " + err);
    });
}

// ==================== MONTHLY REGISTRATION STATS AND DETAILS ====================
function renderMonthlyStats() {
    // 1. Group registrations by Month-Year (YYYY-MM)
    const monthlyCustomers = {};
    const monthlyWorkers = {};

    // Get current year
    const currentYear = new Date().getFullYear();

    customers.forEach(c => {
        const dateStr = c.createdAt || "2026-07-01"; // Fallback to July 2026 if empty
        const [year, month] = dateStr.split('-');
        if (parseInt(year) === currentYear) {
            const key = `${year}-${month}`;
            monthlyCustomers[key] = (monthlyCustomers[key] || 0) + 1;
        }
    });

    workers.forEach(w => {
        const dateStr = w.createdAt || "2026-07-01";
        const [year, month] = dateStr.split('-');
        if (parseInt(year) === currentYear) {
            const key = `${year}-${month}`;
            monthlyWorkers[key] = (monthlyWorkers[key] || 0) + 1;
        }
    });

    // Generate list of months with registrations (unique set)
    const allKeys = Array.from(new Set([
        ...Object.keys(monthlyCustomers),
        ...Object.keys(monthlyWorkers)
    ])).sort().reverse(); // Sort descending (latest months first)

    const monthNamesTh = {
        "01": "มกราคม", "02": "กุมภาพันธ์", "03": "มีนาคม", "04": "เมษายน",
        "05": "พฤษภาคม", "06": "มิถุนายน", "07": "กรกฎาคม", "08": "สิงหาคม",
        "09": "กันยายน", "10": "ตุลาคม", "11": "พฤศจิกายน", "12": "ธันวาคม"
    };

    // Populate Tables
    const custTbody = document.getElementById("db-monthly-customers-tbody");
    const workTbody = document.getElementById("db-monthly-workers-tbody");

    if (custTbody) {
        custTbody.innerHTML = allKeys.map(k => {
            const [year, month] = k.split('-');
            const monthLabel = `${monthNamesTh[month]} ${parseInt(year) + 543}`;
            const count = monthlyCustomers[k] || 0;
            return `
                <tr>
                    <td><strong>${monthLabel}</strong></td>
                    <td style="text-align: center; font-weight: 600; color: var(--navy-dark);">${count} ราย</td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="2" style="text-align:center; padding:15px;" class="text-muted">ไม่มีข้อมูลของปีนี้</td></tr>';
    }

    if (workTbody) {
        workTbody.innerHTML = allKeys.map(k => {
            const [year, month] = k.split('-');
            const monthLabel = `${monthNamesTh[month]} ${parseInt(year) + 543}`;
            const count = monthlyWorkers[k] || 0;
            return `
                <tr>
                    <td><strong>${monthLabel}</strong></td>
                    <td style="text-align: center; font-weight: 600; color: var(--navy-dark);">${count} คน</td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="2" style="text-align:center; padding:15px;" class="text-muted">ไม่มีข้อมูลของปีนี้</td></tr>';
    }

    // Populate Selector options
    const select = document.getElementById("db-monthly-select-month");
    if (select) {
        select.innerHTML = allKeys.map((k, index) => {
            const [year, month] = k.split('-');
            const monthLabel = `${monthNamesTh[month]} ${parseInt(year) + 543}`;
            return `<option value="${k}" ${index === 0 ? 'selected' : ''}>${monthLabel}</option>`;
        }).join('');
        
        renderMonthlyDetails();
    }
}

function renderMonthlyDetails() {
    const select = document.getElementById("db-monthly-select-month");
    if (!select) return;
    const selectedKey = select.value;
    if (!selectedKey) return;

    // Filter customers and workers added in this month
    const matchingCustomers = customers.filter(c => {
        const dateStr = c.createdAt || "2026-07-01";
        return dateStr.startsWith(selectedKey);
    });

    const matchingWorkers = workers.filter(w => {
        const dateStr = w.createdAt || "2026-07-01";
        return dateStr.startsWith(selectedKey);
    });

    // Render lists
    const custUl = document.getElementById("db-monthly-details-customers");
    const workUl = document.getElementById("db-monthly-details-workers");

    if (custUl) {
        if (matchingCustomers.length === 0) {
            custUl.innerHTML = '<li class="text-muted" style="font-size:13px; text-align:center; padding:10px;">❌ ไม่มีนายจ้างลงทะเบียนใหม่ในเดือนนี้</li>';
        } else {
            custUl.innerHTML = matchingCustomers.map(c => `
                <li style="font-size:13px; padding: 6px 10px; background-color: #ffffff; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                    <span>🏢 <strong>${c.companyName}</strong> (${c.businessType})</span>
                    <span style="font-size:11.5px; color:var(--text-muted);">${c.createdAt}</span>
                </li>
            `).join('');
        }
    }

    if (workUl) {
        if (matchingWorkers.length === 0) {
            workUl.innerHTML = '<li class="text-muted" style="font-size:13px; text-align:center; padding:10px;">❌ ไม่มีคนงานขึ้นทะเบียนใหม่ในเดือนนี้</li>';
        } else {
            workUl.innerHTML = matchingWorkers.map(w => {
                const emp = customers.find(c => c.id === w.employerId);
                const empName = emp ? emp.companyName : "ไม่ระบุนายจ้าง";
                return `
                    <li style="font-size:13px; padding: 6px 10px; background-color: #ffffff; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; display:flex; flex-direction:column; gap:4px;">
                        <div style="display:flex; justify-content:space-between;">
                            <strong>👤 ${w.firstName} ${w.lastName} (${w.nationality})</strong>
                            <span style="font-size:11.5px; color:var(--text-muted);">${w.createdAt}</span>
                        </div>
                        <div style="font-size:11.5px; color:var(--text-muted);">
                            นายจ้าง: ${empName}
                        </div>
                    </li>
                `;
            }).join('');
        }
    }
}

// ==================== FINANCE AND ACCOUNTING STATS ====================
function isJobPaid(j) {
    return j && j.status && j.status.startsWith('ชำระเงินแล้ว');
}

function getJobPaymentMethod(j) {
    if (!j || !j.status || !j.status.startsWith('ชำระเงินแล้ว')) return null;
    const match = j.status.match(/ชำระเงินแล้ว\s*\((.*?)\)/);
    if (match) return match[1];
    return "ไม่ระบุบัญชี";
}

function renderFinanceStats() {
    // 1. Calculations
    let totalRevenue = 0;
    let paidRevenue = 0;
    let unpaidRevenue = 0;

    jobs.forEach(j => {
        totalRevenue += j.fee;
        if (isJobPaid(j)) {
            paidRevenue += j.fee;
        } else {
            unpaidRevenue += j.fee;
        }
    });

    // Update stats cards
    document.getElementById("stat-finance-total").innerText = totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + " บาท";
    document.getElementById("stat-finance-paid").innerText = paidRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + " บาท";
    document.getElementById("stat-finance-unpaid").innerText = unpaidRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + " บาท";

    // 2. Bank & Cash account summaries
    const accountsGrid = document.getElementById("db-finance-accounts-grid");
    if (accountsGrid) {
        let cashSum = 0;
        const bankSums = {};
        banks.forEach(b => { bankSums[b.bankName] = 0; });
        let unspecifiedSum = 0;

        jobs.forEach(j => {
            if (isJobPaid(j)) {
                const payMethod = getJobPaymentMethod(j);
                if (payMethod === 'เงินสด') {
                    cashSum += j.fee;
                } else if (payMethod && bankSums[payMethod] !== undefined) {
                    bankSums[payMethod] += j.fee;
                } else if (payMethod && payMethod !== "ไม่ระบุบัญชี") {
                    bankSums[payMethod] = (bankSums[payMethod] || 0) + j.fee;
                } else {
                    unspecifiedSum += j.fee;
                }
            }
        });

        let accountsHtml = "";
        
        // Cash Account
        accountsHtml += `
            <div class="stats-card" style="border-left: 4px solid #10b981; background: #ffffff; padding: 12px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px;">
                <div style="font-size: 24px;">💵</div>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 11px; color: #64748b; font-weight: 500;">เงินสด (Cash)</span>
                    <strong style="font-size: 13.5px; color: #0f172a; margin-top: 2px;">${cashSum.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.</strong>
                </div>
            </div>
        `;

        // Bank Accounts
        Object.entries(bankSums).forEach(([bankName, sum]) => {
            accountsHtml += `
                <div class="stats-card" style="border-left: 4px solid var(--gold-primary); background: #ffffff; padding: 12px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 24px;">🏦</div>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 11px; color: #64748b; font-weight: 500; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 120px;" title="${bankName}">${bankName}</span>
                        <strong style="font-size: 13.5px; color: #0f172a; margin-top: 2px;">${sum.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.</strong>
                    </div>
                </div>
            `;
        });

        // Unspecified Card
        if (unspecifiedSum > 0) {
            accountsHtml += `
                <div class="stats-card" style="border-left: 4px solid #94a3b8; background: #ffffff; padding: 12px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 24px;">📝</div>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 11px; color: #64748b; font-weight: 500;">บัญชีธนาคาร (ไม่ระบุ)</span>
                        <strong style="font-size: 13.5px; color: #0f172a; margin-top: 2px;">${unspecifiedSum.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.</strong>
                    </div>
                </div>
            `;
        }

        accountsGrid.innerHTML = accountsHtml;
    }

    // 3. Revenue by Job Type
    const jobTypeStats = {};
    jobs.forEach(j => {
        const parsed = parseJobTypeItems(j.jobType, j.fee);
        const isPaid = isJobPaid(j);
        parsed.forEach(item => {
            const name = item.name || "ไม่ระบุประเภทงาน";
            if (!jobTypeStats[name]) {
                jobTypeStats[name] = { count: 0, revenue: 0 };
            }
            jobTypeStats[name].count++;
            if (isPaid) {
                jobTypeStats[name].revenue += item.price;
            }
        });
    });

    const jobTypesTbody = document.getElementById("db-finance-jobtypes-tbody");
    if (jobTypesTbody) {
        const sortedTypes = Object.entries(jobTypeStats).sort((a, b) => b[1].revenue - a[1].revenue);
        if (sortedTypes.length === 0) {
            jobTypesTbody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-muted" style="text-align: center; padding: 25px;">
                        ❌ ไม่มีข้อมูลประเภทงานในระบบ
                    </td>
                </tr>
            `;
        } else {
            jobTypesTbody.innerHTML = sortedTypes.map(([name, stat]) => `
                <tr>
                    <td><strong>${name}</strong></td>
                    <td style="text-align: center; font-weight: 500;">${stat.count} งาน</td>
                    <td style="text-align: right; font-weight: 600; color: var(--success);">${stat.revenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</td>
                </tr>
            `).join('');
        }
    }
    renderJobTypesPieChart(jobTypeStats);

    // 4. Revenue & Outstanding by Customer
    const custStats = customers.map(c => {
        const custJobs = jobs.filter(j => j.customerId === c.id);
        const total = custJobs.reduce((sum, j) => sum + j.fee, 0);
        const paid = custJobs.reduce((sum, j) => sum + (isJobPaid(j) ? j.fee : 0), 0);
        const unpaid = total - paid;
        return {
            customer: c,
            total: total,
            paid: paid,
            unpaid: unpaid,
            jobCount: custJobs.length
        };
    }).filter(item => item.total > 0)
      .sort((a, b) => b.unpaid - a.unpaid || b.total - a.total);

    const custTbody = document.getElementById("db-finance-customers-tbody");
    if (custTbody) {
        if (custStats.length === 0) {
            custTbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-muted" style="text-align: center; padding: 25px;">
                        ❌ ไม่มีข้อมูลลูกค้าผู้ว่าจ้างในระบบ
                    </td>
                </tr>
            `;
        } else {
            custTbody.innerHTML = custStats.map(item => {
                let actionBtn = "";
                if (item.unpaid > 0) {
                    actionBtn = `
                        <button class="btn btn-sm btn-gold" onclick="quickCombineInvoice('${item.customer.id}')" style="font-size: 11px; padding: 4px 10px;">
                            🧾 รวมบิลเพื่อเก็บเงิน
                        </button>
                    `;
                } else {
                    actionBtn = `<span class="badge badge-success" style="font-size: 10px; padding: 2px 8px;">✅ ครบถ้วน</span>`;
                }
                return `
                    <tr>
                        <td><strong>${item.customer.companyName}</strong></td>
                        <td style="text-align: right; font-weight: 500;">${item.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</td>
                        <td style="text-align: right; font-weight: 600; color: var(--success);">${item.paid.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</td>
                        <td style="text-align: right; font-weight: 600; color: ${item.unpaid > 0 ? 'var(--danger)' : '#64748b'};">${item.unpaid.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</td>
                        <td style="text-align: center;">${actionBtn}</td>
                     </tr>
                 `;
             }).join('');
         }
     }

    // 5. Render payment status breakdown bars
    const payStatusEl = document.getElementById("db-finance-payment-breakdown-container");
    if (payStatusEl) {
        const totalJobs = jobs.length;
        if (totalJobs === 0) {
            payStatusEl.innerHTML = '<p class="text-muted">ไม่มีข้อมูลงานจ้าง</p>';
        } else {
            const paidJobs = jobs.filter(isJobPaid).length;
            const unpaidJobs = totalJobs - paidJobs;
            const paidPct = Math.round((paidJobs / totalJobs) * 100);
            const unpaidPct = 100 - paidPct;

            payStatusEl.innerHTML = `
                <div class="chart-bar-item">
                    <div class="bar-info">
                        <span>ชำระเงินแล้ว (Paid)</span>
                        <span>${paidJobs} งาน (${paidPct}%)</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill" style="width: ${paidPct}%; background-color: var(--success);"></div>
                    </div>
                </div>
                <div class="chart-bar-item" style="margin-top: 10px;">
                    <div class="bar-info">
                        <span>ค้างชำระ (Pending/Unpaid)</span>
                        <span>${unpaidJobs} งาน (${unpaidPct}%)</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill" style="width: ${unpaidPct}%; background-color: var(--danger);"></div>
                    </div>
                </div>
            `;
        }
    }

    // 6. Render progress breakdown bars
    const progressEl = document.getElementById("db-finance-progress-breakdown-container");
    if (progressEl) {
        const totalJobs = jobs.length;
        if (totalJobs === 0) {
            progressEl.innerHTML = '<p class="text-muted">ไม่มีข้อมูลงานจ้าง</p>';
        } else {
            const statusCounts = {};
            jobs.forEach(j => {
                const isPaid = isJobPaid(j);
                const displayStatus = isPaid ? "ชำระเงินแล้ว" : j.status;
                statusCounts[displayStatus] = (statusCounts[displayStatus] || 0) + 1;
            });

            progressEl.innerHTML = Object.entries(statusCounts).map(([status, count]) => {
                const pct = Math.round((count / totalJobs) * 100);
                let color = "var(--navy-medium)";
                if (status.startsWith("ชำระเงินแล้ว")) color = "var(--success)";
                if (status === "รอดำเนินการ") color = "var(--text-muted)";
                if (status === "กำลังดำเนินการ") color = "var(--navy-light)";
                
                return `
                    <div class="chart-bar-item" style="margin-bottom: 8px;">
                        <div class="bar-info" style="font-size: 11.5px;">
                            <span>${status}</span>
                            <span>${count} งาน (${pct}%)</span>
                        </div>
                        <div class="bar-track" style="height: 6px;">
                            <div class="bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function quickCombineInvoice(customerId) {
    switchView('jobs');
    openCombineBillsModal();
    const select = document.getElementById("combine-cust-select");
    if (select) {
        select.value = customerId;
        onCombineCustomerChange();
    }
}

// ==================== WORKER PHOTO PROCESSING & BACKGROUND REMOVAL ====================
function handleWorkerPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const preview = document.getElementById("worker-photo-preview");
    const icon = document.getElementById("worker-photo-icon");
    
    showToast("🪄 AI กำลังลบฉากหลังของคนงานเป็นสีขาว...", "warning");
    
    const reader = new FileReader();
    reader.onload = function(e) {
        processImageBackgroundToWhite(e.target.result, async function(processedDataUrl) {
            // Set local preview first
            preview.src = processedDataUrl;
            preview.classList.remove("hidden");
            icon.classList.add("hidden");
            showToast("✅ AI ลบฉากหลังเปลี่ยนเป็นสีขาวเรียบร้อย!", "success");

            // Asynchronously upload to Google Drive if connected
            const editId = document.getElementById("worker-edit-id").value;
            const employerId = document.getElementById("worker-employer-id").value;
            const firstName = document.getElementById("worker-first-name").value.trim() || "worker";
            const uploadResult = await uploadFileToGoogleDrive(processedDataUrl, `${firstName}_photo.jpg`, employerId, editId);
            if (uploadResult && uploadResult.viewUrl) {
                preview.src = uploadResult.viewUrl; // ใช้ลิงก์รูปภาพที่แสดงผลได้จริง แทนลิงก์เปิดไฟล์ใน Drive
            }
        });
    };
    reader.readAsDataURL(file);
}

function processImageBackgroundToWhite(imgUrl, callback) {
    const img = new Image();
    img.src = imgUrl;
    img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Define high quality passport size dimensions (300x300 pixels)
        const targetW = 300;
        const targetH = 300;
        canvas.width = targetW;
        canvas.height = targetH;
        
        // Temporarily draw image to examine pixels
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;
        
        // We will sample background colors from the top/left/right border pixels
        // where portrait background is typically located.
        const borderPixels = [];
        // Sample top border (all columns)
        for (let x = 0; x < targetW; x += 5) {
            borderPixels.push({ x: x, y: 0 });
            borderPixels.push({ x: x, y: 5 });
        }
        // Sample left/right borders (top half of image is background)
        for (let y = 0; y < targetH / 2; y += 5) {
            borderPixels.push({ x: 0, y: y });
            borderPixels.push({ x: 5, y: y });
            borderPixels.push({ x: targetW - 1, y: y });
            borderPixels.push({ x: targetW - 6, y: y });
        }

        const bgSamples = borderPixels.map(pt => {
            const idx = (pt.y * targetW + pt.x) * 4;
            return { r: data[idx], g: data[idx+1], b: data[idx+2] };
        });

        // Background removal using a multi-sample proximity match
        // and flood-fill-like heuristic (higher tolerance for border proximity)
        for (let y = 0; y < targetH; y++) {
            for (let x = 0; x < targetW; x++) {
                const idx = (y * targetW + x) * 4;
                const r = data[idx];
                const g = data[idx+1];
                const b = data[idx+2];

                // Check distance against all border samples
                let minDistance = Infinity;
                bgSamples.forEach(sample => {
                    const dist = Math.sqrt((r - sample.r)**2 + (g - sample.g)**2 + (b - sample.b)**2);
                    if (dist < minDistance) {
                        minDistance = dist;
                    }
                });

                // Threshold varies by position: higher threshold near edges (more aggressive removal),
                // lower threshold in center/bottom (protecting the person's face/shirt)
                const distToLeftEdge = x;
                const distToRightEdge = targetW - 1 - x;
                const distToTopEdge = y;
                const distToEdge = Math.min(distToLeftEdge, distToRightEdge, distToTopEdge);
                
                let localThreshold = 65; // Base threshold
                if (distToEdge < 40) {
                    localThreshold = 110; // Aggressive removal near border edges
                } else if (distToEdge < 80) {
                    localThreshold = 85; 
                }

                // If pixel color is very close to border colors, OR it's extremely bright/desaturated (close to off-white/gray)
                const isDesaturatedGray = Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15;
                const isVeryBright = r > 215 && g > 215 && b > 215; // Clean up light gray/shadows to solid white
                
                if (minDistance < localThreshold || (isVeryBright && isDesaturatedGray)) {
                    data[idx] = 255;
                    data[idx+1] = 255;
                    data[idx+2] = 255;
                }
            }
        }
        
        // Redraw onto canvas with solid white backdrop
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetW, targetH);
        
        // Put modified image data back
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = targetW;
        tempCanvas.height = targetH;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.putImageData(imgData, 0, 0);
        
        ctx.drawImage(tempCanvas, 0, 0);
        callback(canvas.toDataURL("image/jpeg", 0.9));
    };
}

// State tracker for active worker folder modal interaction
let activeFolderWorkerId = null;
let activeFolderDocType = null;

// ==================== WORKER DOCUMENTS FOLDER SYSTEM ====================
// Helper to retrieve attachments of a worker as a standard array of objects: { name, data }
function getAttachments(w, key) {
    const val = w.attachments ? w.attachments[key] : null;
    if (!val) return [];
    if (Array.isArray(val)) return val;
    // Legacy support: convert single string path/base64 to standard array
    const customNames = w.attachmentNames || {};
    const nameClean = `${w.firstName}_${w.lastName || ''}`.replace(/\s+/g, '_');
    const defaultName = `${nameClean}_${key}`;
    return [{ name: customNames[key] || defaultName, data: val }];
}

// ==================== WORKER DOCUMENTS FOLDER SYSTEM ====================
function openWorkerFolderModal(workerId) {
    activeFolderWorkerId = workerId;
    const w = workers.find(item => item.id === workerId);
    if (!w) return;

    // Reset preview
    closeWorkerFolderPreview();

    document.getElementById("worker-folder-name").innerText = `คุณ ${w.firstName} ${w.lastName || ''}`;
    const emp = customers.find(c => c.id === w.employerId);
    const empName = emp ? emp.companyName : "ไม่ระบุนายจ้าง";
    document.getElementById("worker-folder-meta").innerText = `สัญชาติ: ${w.nationality} | นายจ้าง: ${empName}`;
    
    const avatarUrl = w.photo ? w.photo : 'data:image/svg+xml;utf8,<svg xmlns="http:' + '/' + '/www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="%2394a3b8"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 3.58-8 8v1h16v-1c0-4.42-3.58-8-8-8z"/></svg>';
    document.getElementById("worker-folder-avatar").src = avatarUrl;

    const nameClean = `${w.firstName}_${w.lastName || ''}`.replace(/\s+/g, '_');
    
    const files = [
        { key: "worker-wp-doc", label: "📄 ใบอนุญาตทำงาน (Work Permit)", defaultName: `${nameClean}_WorkPermit.pdf`, type: "ใบอนุญาตทำงาน" },
        { key: "worker-passport", label: "✈️ หนังสือเดินทาง (Passport / CI)", defaultName: `${nameClean}_Passport.pdf`, type: "พาสปอร์ต" },
        { key: "worker-myanmar-id", label: "🏡 บัตรประชาชน/ทะเบียนบ้านพม่า", defaultName: `${nameClean}_MyanmarID.pdf`, type: "ทะเบียนบ้านพม่า" },
        { key: "worker-pink-card", label: "🌸 บัตรชมพู (Pink Card)", defaultName: `${nameClean}_PinkCard.pdf`, type: "บัตรชมพู" },
        { key: "worker-receipt", label: "🧾 ใบเสร็จรับเงิน (Receipt)", defaultName: `${nameClean}_Receipt.pdf`, type: "ใบเสร็จ" }
    ];

    const listContainer = document.getElementById("worker-folder-files-list");
    listContainer.innerHTML = files.map(file => {
        const fileList = getAttachments(w, file.key);
        const isUploaded = fileList.length > 0;

        let filesHtml = '';
        if (!isUploaded) {
            filesHtml = `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; font-size: 12px; color: var(--danger);">
                    <span>⚠️ ยังไม่ได้แนบไฟล์</span>
                    <button class="btn btn-sm btn-outline btn-add" onclick="triggerFolderFileUpload('${file.key}')" style="padding: 3px 8px; font-size: 11px; color: var(--navy-dark); border-color: var(--navy-light);">
                        📤 อัปโหลดไฟล์
                    </button>
                </div>
            `;
        } else {
            filesHtml = fileList.map((fItem, fIdx) => {
                const previewBtn = `
                    <button class="btn btn-sm btn-outline" onclick="previewFolderFileIndex('${file.key}', ${fIdx}, '${file.label}')" style="padding: 3px 6px; font-size: 11px;">
                        👁️ ดูตัวอย่าง
                    </button>
                `;
                
                const downloadTarget = fItem.data.startsWith("data:") ? fItem.data : null;
                const downloadBtn = `
                    <button class="btn btn-sm btn-outline" onclick="downloadAttachment('${fItem.name}', '${file.type}', '${downloadTarget || ''}')" style="padding: 3px 6px; font-size: 11px;">
                        📥 โหลด
                    </button>
                `;
                
                const shareBtn = `
                    <button class="btn btn-sm btn-outline" onclick="shareAttachment('${fItem.name}', '${w.firstName} ${w.lastName || ''}')" style="padding: 3px 6px; font-size: 11px;">
                        🔗 แชร์
                    </button>
                `;

                const deleteBtn = `
                    <button class="btn btn-sm btn-outline delete-btn" onclick="deleteFolderFileIndex('${file.key}', ${fIdx})" style="padding: 3px 6px; font-size: 11px; height: auto; min-width: auto;">
                        🗑️ ลบ
                    </button>
                `;

                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; gap: 10px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 200px;">
                            <span style="font-size: 12px; color: var(--success);">📄</span>
                            <input type="text" value="${fItem.name}" onchange="renameFolderFileIndex('${file.key}', ${fIdx}, this.value)" style="padding: 2px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11.5px; width: 100%; max-width: 240px; height: 24px; color: var(--navy-dark); font-weight: 500;" placeholder="ตั้งชื่อไฟล์...">
                        </div>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            ${previewBtn}
                            ${downloadBtn}
                            ${shareBtn}
                            ${deleteBtn}
                        </div>
                    </div>
                `;
            }).join('');

            // Add button to allow appending multiple files
            filesHtml += `
                <div style="display: flex; justify-content: flex-end; padding-top: 6px;">
                    <button class="btn btn-sm btn-outline btn-add" onclick="triggerFolderFileUpload('${file.key}')" style="padding: 3px 8px; font-size: 11px; color: var(--navy-dark); border-color: var(--navy-light);">
                        ➕ แนบไฟล์เพิ่มในช่องนี้
                    </button>
                </div>
            `;
        }

        return `
            <div style="display: flex; flex-direction: column; padding: 12px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px; gap: 8px; margin-bottom: 10px;">
                <span style="font-weight: 600; color: var(--navy-dark);">${file.label}</span>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    ${filesHtml}
                </div>
            </div>
        `;
    }).join('');

    document.getElementById("btn-copy-worker-folder").setAttribute("onclick", `copyWorkerFolderLink('${w.id}')`);
    document.getElementById("worker-folder-modal").classList.remove("hidden");
}

function closeWorkerFolderModal() {
    document.getElementById("worker-folder-modal").classList.add("hidden");
}

function copyWorkerFolderLink(workerId) {
    const w = workers.find(item => item.id === workerId);
    if (!w) return;
    
    // Simulating copy direct worker folder link
    const shareText = "🔗 แฟ้มเอกสารคนงานของ: คุณ " + w.firstName + " " + (w.lastName || "") + "\n(รวมใบอนุญาตทำงาน, พาสปอร์ต, บัตรชมพู, ทะเบียนบ้าน, ใบเสร็จ)\nเปิดคลังเอกสารได้ที่: http:" + "/" + "/localhost:3000/#worker-folder-" + w.id;
    
    navigator.clipboard.writeText(shareText).then(() => {
        showToast("📋 คัดลอกลิงก์แฟ้มเอกสารไปที่คลิปบอร์ดเรียบร้อยแล้ว!", "success");
    }).catch(err => {
        alert("ไม่สามารถคัดลอกได้: " + err);
    });
}

// Trigger hidden file input upload inside Folder modal
function triggerFolderFileUpload(docType) {
    activeFolderDocType = docType;
    const fileInput = document.getElementById("folder-upload-input");
    if (fileInput) {
        fileInput.value = ""; // reset
        fileInput.click();
    }
}

// Handle folder file upload (Appends file to the array)
function handleFolderFileUpload(event) {
    const file = event.target.files[0];
    if (!file || !activeFolderWorkerId || !activeFolderDocType) return;

    showToast("📤 กำลังอัปโหลดไฟล์...", "warning");

    const reader = new FileReader();
    reader.onload = async function(e) {
        const fileContent = e.target.result;
        const workerIdx = workers.findIndex(w => w.id === activeFolderWorkerId);
        if (workerIdx !== -1) {
            const w = workers[workerIdx];
            const nameClean = `${w.firstName}_${w.lastName || ''}`.replace(/\s+/g, '_');
            
            // Get current list to decide file suffix
            const currentList = getAttachments(w, activeFolderDocType);
            const suffix = currentList.length > 0 ? `_${currentList.length + 1}` : "";
            const fileName = `${nameClean}_${activeFolderDocType}${suffix}`;

            // Attempt upload to Google Drive, then fallback to local server uploads
            const uploadResult = await uploadFileToGoogleDrive(fileContent, fileName, w.employerId, w.id, activeFolderDocType);
            const driveUrl = uploadResult ? uploadResult.fileUrl : null;
            const serverUrl = driveUrl || await uploadFileToServer(fileContent, fileName);
            
            w.attachments = w.attachments || {};
            w.attachments[activeFolderDocType] = currentList;
            w.attachments[activeFolderDocType].push({
                name: fileName,
                data: serverUrl || fileContent
            });
            
            // ถ้า AI (Gemini) อ่านข้อมูลจากเอกสารได้จริง ให้เติมเฉพาะฟิลด์ที่มีข้อมูลจริงเท่านั้น
            // ไม่มีการเดา/สุ่มข้อมูลจากชื่อไฟล์หรือข้อมูลปลอมใดๆ อีกต่อไป
            if (uploadResult && uploadResult.parsedData) {
                const p = uploadResult.parsedData;
                showToast("✨ AI อ่านข้อมูลจากเอกสารสำเร็จ กำลังอัปเดตข้อมูลคนงาน", "success");

                if (activeFolderDocType === 'worker-wp-doc') {
                    if (p.permitNo) w.permitNo = p.permitNo;
                    if (p.permitExpiry) w.permitExpiry = parseDateInput(p.permitExpiry) || w.permitExpiry;
                    if (p.uid) w.workerUid = p.uid;
                    if (p.firstName) w.firstName = p.firstName;
                    if (p.lastName) w.lastName = p.lastName;
                    if (p.dob) w.dob = parseDateInput(p.dob) || w.dob;
                    if (p.nationality) w.nationality = p.nationality;
                    if (p.refNo) w.refNo = p.refNo;
                    if (p.gender) {
                        const g = p.gender.toLowerCase();
                        if (g.includes("female") || g.includes("หญิง")) w.gender = "Female";
                        else if (g.includes("male") || g.includes("ชาย")) w.gender = "Male";
                    }
                    if (p.position) w.position = p.position;
                    if (p.workplace) w.workplace = p.workplace;
                }
                if (activeFolderDocType === 'worker-passport') {
                    if (p.passportNo) w.passportNo = p.passportNo;
                    if (p.passportPob) w.passportPob = p.passportPob;
                    if (p.passportAuth) w.passportAuth = p.passportAuth;
                    if (p.passportIssue) w.passportIssue = parseDateInput(p.passportIssue) || w.passportIssue;
                    if (p.passportExpiry) w.passportExpiry = parseDateInput(p.passportExpiry) || w.passportExpiry;
                    if (p.dob) w.dob = parseDateInput(p.dob) || w.dob;
                    if (p.gender) {
                        const g = p.gender.toLowerCase();
                        if (g.includes("female") || g.includes("หญิง")) w.gender = "Female";
                        else if (g.includes("male") || g.includes("ชาย")) w.gender = "Male";
                    }
                }
            }

            // Auto-transition from pending_register to active when both Work Permit and Receipt are uploaded
            const hasWp = getAttachments(w, 'worker-wp-doc').length > 0;
            const hasReceipt = getAttachments(w, 'worker-receipt').length > 0;
            if (w.status === 'pending_register' && hasWp && hasReceipt) {
                w.status = 'active';
                showToast(`🎉 อัปโหลดใบอนุญาตทำงานและใบเสร็จแล้ว! เปลี่ยนสถานะคุณ ${w.firstName} เป็น ปกติ (Active) อัตโนมัติ`, "success");
            }

            saveData();
            showToast("✅ อัปโหลดไฟล์และอัปเดตแฟ้มคนงานต่างด้าวสำเร็จ!", "success");
            
            // Refresh folder modal and worker lists/dashboard
            openWorkerFolderModal(activeFolderWorkerId);
            renderWorkers();
            renderDashboard();
        }
    };
    reader.readAsDataURL(file);
}

// Rename file inside folder modal
function renameFolderFileIndex(docType, index, newName) {
    if (!activeFolderWorkerId) return;
    const nameClean = newName.trim();
    if (!nameClean) {
        showToast("⚠️ กรุณาระบุชื่อไฟล์ให้ถูกต้อง", "warning");
        return;
    }

    const workerIdx = workers.findIndex(w => w.id === activeFolderWorkerId);
    if (workerIdx !== -1) {
        const w = workers[workerIdx];
        const list = getAttachments(w, docType);
        if (list[index]) {
            list[index].name = nameClean;
            w.attachments = w.attachments || {};
            w.attachments[docType] = list;
            saveData();
            showToast("✏️ เปลี่ยนชื่อไฟล์เรียบร้อยแล้ว!", "success");
            
            openWorkerFolderModal(activeFolderWorkerId);
        }
    }
}

// Delete specific file index inside folder modal
function deleteFolderFileIndex(docType, index) {
    if (!activeFolderWorkerId) return;

    if (confirm("คุณแน่ใจหรือไม่ที่จะลบไฟล์นี้ออกจากแฟ้มประวัติคนงาน?")) {
        const workerIdx = workers.findIndex(w => w.id === activeFolderWorkerId);
        if (workerIdx !== -1) {
            const w = workers[workerIdx];
            const list = getAttachments(w, docType);
            list.splice(index, 1);
            
            w.attachments = w.attachments || {};
            if (list.length === 0) {
                delete w.attachments[docType];
            } else {
                w.attachments[docType] = list;
            }
            
            saveData();
            showToast("🗑️ ลบไฟล์ออกจากประวัติเรียบร้อยแล้ว", "success");
            
            closeWorkerFolderPreview();
            openWorkerFolderModal(activeFolderWorkerId);
            renderWorkers();
            renderDashboard();
        }
    }
}

// Preview file inside folder modal using index
function previewFolderFileIndex(docType, index, docLabel) {
    if (!activeFolderWorkerId) return;
    
    const w = workers.find(item => item.id === activeFolderWorkerId);
    if (!w) return;

    const list = getAttachments(w, docType);
    const fileItem = list[index];
    if (!fileItem) return;

    const fileData = fileItem.data;
    const previewPanel = document.getElementById("worker-folder-preview-panel");
    const previewTitle = document.getElementById("worker-folder-preview-title");
    const previewBody = document.getElementById("worker-folder-preview-body");

    if (!previewPanel || !previewBody || !fileData) return;

    previewTitle.innerText = `👁️ ตัวอย่างเอกสาร: ${fileItem.name}`;

    // If it is a Google Drive or web link, render embedded preview in iframe
    if (fileData.startsWith("http")) {
        let embedUrl = fileData;
        if (fileData.includes("drive.google.com")) {
            embedUrl = fileData.replace("/view", "/preview").split("?")[0] + "?usp=sharing";
        }
        previewBody.innerHTML = `<iframe src="${embedUrl}" style="width: 100%; height: 380px; border: 1px solid #cbd5e1; border-radius: 4px; background: white;"></iframe>`;
    } else if (!fileData.startsWith("data:")) {
        previewBody.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--navy-dark); font-family: monospace;">
                <div style="font-size: 40px; margin-bottom: 10px;">📄</div>
                <h4 style="margin: 0 0 5px 0; font-size:14px;">MOCK SCAN: ${fileData}</h4>
                <p style="font-size: 11.5px; color: var(--text-muted); max-width: 320px; margin: 0 auto; line-height: 1.4;">
                    (ไฟล์ PDF สแกนดิจิทัลเก็บอยู่ใน Google Drive / เครื่องหลัก)
                </p>
            </div>
        `;
    } else {
        // If it's base64 image or dataUrl, render image preview or PDF frame
        if (fileData.startsWith("data:image/") || fileData.startsWith("data:application/pdf")) {
            if (fileData.startsWith("data:image/")) {
                previewBody.innerHTML = `<img src="${fileData}" style="max-width: 100%; max-height: 380px; border-radius: 4px; box-shadow: var(--shadow-sm); object-fit: contain;">`;
            } else {
                // Render live PDF document dynamically inside an iframe!
                previewBody.innerHTML = `<iframe src="${fileData}" style="width: 100%; height: 380px; border: 1px solid #cbd5e1; border-radius: 4px; background: white;"></iframe>`;
            }
        } else {
            previewBody.innerHTML = `<div style="font-size:12px; color:var(--text-muted);">ไม่สามารถแสดงตัวอย่างได้ (ประเภทไฟล์ไม่รองรับ)</div>`;
        }
    }

    previewPanel.classList.remove("hidden");
}

function closeWorkerFolderPreview() {
    const previewPanel = document.getElementById("worker-folder-preview-panel");
    if (previewPanel) {
        previewPanel.classList.add("hidden");
    }
}

function isWorkerMissingDocs(w) {
    if (w.status === 'archived') return false;
    return getAttachments(w, 'worker-wp-doc').length === 0 || getAttachments(w, 'worker-passport').length === 0;
}

function renderMissingDocsOverview() {
    const tbody = document.getElementById("dashboard-missing-docs-tbody");
    if (!tbody) return;

    const missingWorkers = workers.filter(w => isWorkerMissingDocs(w));
    
    // Update badge count
    const badge = document.getElementById("missing-docs-count-badge");
    if (badge) badge.innerText = `${missingWorkers.length} คน`;
    
    // Update dashboard stats card
    const cardNum = document.getElementById("stat-missing-docs");
    if (cardNum) cardNum.innerText = missingWorkers.length;

    if (missingWorkers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-muted" style="text-align: center; padding: 20px;">
                    ✅ คนงานทุกคนมีเอกสารแนบในระบบครบถ้วนแล้ว!
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = missingWorkers.map(w => {
        const emp = customers.find(c => c.id === w.employerId);
        const empName = emp ? emp.companyName : "ไม่ระบุนายจ้าง";

        const missingList = [];
        if (getAttachments(w, 'worker-wp-doc').length === 0) missingList.push("ใบอนุญาตทำงาน (WP)");
        if (getAttachments(w, 'worker-passport').length === 0) missingList.push("พาสปอร์ต/CI");

        const missingLabels = missingList.map(item => `
            <span class="badge" style="background-color: rgba(249, 115, 22, 0.1); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.2); white-space: nowrap; margin-right: 4px;">
                ❌ ขาด ${item}
            </span>
        `).join('');

        const avatarUrl = w.photo ? w.photo : 'data:image/svg+xml;utf8,<svg xmlns="http:' + '/' + '/www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="%2394a3b8"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 3.58-8 8v1h16v-1c0-4.42-3.58-8-8-8z"/></svg>';

        return `
            <tr>
                <td style="width: 50px; text-align: center;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background-color: #f1f5f9; border: 1px solid #cbd5e1; display: inline-flex; align-items: center; justify-content: center;">
                        <img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                </td>
                <td><strong>${w.title ? w.title + ' ' : ''}${w.firstName} ${w.lastName || ''}</strong></td>
                <td><span class="badge badge-gold">${w.nationality}</span></td>
                <td>${empName}</td>
                <td>${missingLabels}</td>
                <td style="text-align: center;">
                    <button class="btn btn-sm btn-gold" onclick="openWorkerFolderModal('${w.id}')" style="font-size: 11.5px; padding: 5px 12px; white-space: nowrap;">
                        📂 เปิดแฟ้มอัปเอกสาร
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== BANK ACCOUNT QR CODE UPLOAD ====================
function handleBankQrUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const preview = document.getElementById("bank-qr-preview");
    const icon = document.getElementById("bank-qr-icon");
    const btnDel = document.getElementById("btn-delete-bank-qr");

    const reader = new FileReader();
    reader.onload = function(e) {
        const fileContent = e.target.result;
        
        // Show local preview first
        preview.src = fileContent;
        preview.classList.remove("hidden");
        icon.classList.add("hidden");
        btnDel.classList.remove("hidden");
        showToast("✅ อัปโหลดรูปภาพ QR Code รับเงินสำเร็จ", "success");

        // Asynchronously upload to Google Drive
        const bankName = document.getElementById("bank-name").value.trim() || "bank";
        const accNumber = document.getElementById("bank-account-number").value.trim() || "account";
        uploadFileToGoogleDrive(fileContent, `${bankName}_${accNumber}_QR.jpg`).then(driveUrl => {
            if (driveUrl) {
                preview.src = driveUrl; // set to Google Drive URL
            }
        });
    };
    reader.readAsDataURL(file);
}

function removeBankQrImage() {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบรูปภาพ QR Code รับเงินนี้?")) return;

    const preview = document.getElementById("bank-qr-preview");
    const icon = document.getElementById("bank-qr-icon");
    const btnDel = document.getElementById("btn-delete-bank-qr");
    const input = document.getElementById("bank-qr-input");

    preview.src = "";
    preview.classList.add("hidden");
    icon.classList.remove("hidden");
    btnDel.classList.add("hidden");
    if (input) input.value = "";
    showToast("🗑️ ลบรูปภาพ QR Code รับเงินเรียบร้อยแล้ว", "success");
}

// ==================== KANBAN BOARD SYSTEM ====================

function switchJobView(viewType) {
    currentJobView = viewType;
    const btnTable = document.getElementById("btn-job-view-table");
    const btnKanban = document.getElementById("btn-job-view-kanban");
    const tableContainer = document.getElementById("jobs-table-container");
    const kanbanContainer = document.getElementById("jobs-kanban-container");
    const paginationBar = document.getElementById("jobs-pagination-bar");

    if (viewType === 'table') {
        btnTable.className = "btn btn-gold btn-sm";
        btnTable.style.background = "";
        btnTable.style.color = "";
        btnKanban.className = "btn btn-outline btn-sm";
        btnKanban.style.borderColor = "transparent";
        btnKanban.style.color = "var(--text-dark)";
        btnKanban.style.background = "transparent";
        
        tableContainer.classList.remove("hidden");
        kanbanContainer.classList.add("hidden");
        if (paginationBar) paginationBar.classList.remove("hidden");
    } else {
        btnKanban.className = "btn btn-gold btn-sm";
        btnKanban.style.background = "";
        btnKanban.style.color = "";
        btnTable.className = "btn btn-outline btn-sm";
        btnTable.style.borderColor = "transparent";
        btnTable.style.color = "var(--text-dark)";
        btnTable.style.background = "transparent";
        
        tableContainer.classList.add("hidden");
        kanbanContainer.classList.remove("hidden");
        if (paginationBar) paginationBar.classList.add("hidden");
    }
    renderJobs();
}

function renderJobsKanban(filtered) {
    const containers = {
        "รอดำเนินการ": document.getElementById("kanban-pending"),
        "กำลังดำเนินการ": document.getElementById("kanban-progress"),
        "รอเอกสารเพิ่มเติม": document.getElementById("kanban-docs"),
        "เสร็จสิ้น": document.getElementById("kanban-completed")
    };

    // Clear columns
    Object.values(containers).forEach(c => { if (c) c.innerHTML = ""; });

    // Group jobs by status
    const counts = {
        "รอดำเนินการ": 0,
        "กำลังดำเนินการ": 0,
        "รอเอกสารเพิ่มเติม": 0,
        "เสร็จสิ้น": 0
    };

    filtered.forEach(j => {
        // Map backend billing/paid statuses to operational "เสร็จสิ้น" column
        let displayStatus = j.status;
        if (j.status === 'เสร็จสิ้น/รอออกบิล' || j.status === 'ออกบิลแล้ว' || j.status === 'ชำระเงินแล้ว') {
            displayStatus = 'เสร็จสิ้น';
        }

        const container = containers[displayStatus] || containers["รอดำเนินการ"];
        if (container) {
            counts[displayStatus]++;
            const cust = customers.find(c => c.id === j.customerId);
            const work = workers.find(w => w.id === j.workerId);
            const custName = cust ? cust.companyName : "ไม่พบนายจ้าง";
            const workName = work ? `${work.firstName} ${work.lastName} (${work.nationality})` : "ไม่พบคนงาน";
            
            // Build payment status badge
            let paymentBadge = '';
            if (j.status === 'ชำระเงินแล้ว') {
                paymentBadge = `<span class="badge badge-success" style="font-size: 10px; padding: 2px 6px;">✅ ชำระเงินแล้ว</span>`;
            } else if (j.status === 'ออกบิลแล้ว') {
                paymentBadge = `<span class="badge badge-info" style="font-size: 10px; padding: 2px 6px; background-color: #3b82f6; color: white;">🧾 ออกบิลแล้ว</span>`;
            } else if (j.status === 'เสร็จสิ้น/รอออกบิล') {
                paymentBadge = `<span class="badge badge-gold" style="font-size: 10px; padding: 2px 6px;">⏳ รอวางบิล</span>`;
            } else {
                paymentBadge = `<span class="badge badge-warning" style="font-size: 10px; padding: 2px 6px;">⏳ ค้างชำระ</span>`;
            }

            let badgeClass = 'badge-gold';
            if (displayStatus === 'รอดำเนินการ') badgeClass = 'badge-warning';
            if (displayStatus === 'กำลังดำเนินการ') badgeClass = 'badge-gold';
            if (displayStatus === 'รอเอกสารเพิ่มเติม') badgeClass = 'badge-danger';
            if (displayStatus === 'เสร็จสิ้น') badgeClass = 'badge-success';

            let actionBtns = "";
            if (currentUser.role !== 'staff') {
                actionBtns += `<button onclick="openJobModal('${j.id}')" style="background: none; border: none; cursor: pointer; font-size: 13px;" title="แก้ไข">✏️</button>`;
            }
            actionBtns += `<button onclick="openInvoiceModal('${j.id}')" style="background: none; border: none; cursor: pointer; font-size: 13px;" title="ออกบิล/รับเงิน">🧾</button>`;

            // Strip prices for clean display of types
            const cleanJobType = (j.jobType || "").replace(/\s*\(\d+\)/g, "");

            // ป้ายบอกว่าใบงานนี้ถูกเปิดมาพร้อมกับงานอื่นในชุดเดียวกัน (batch เดียวกัน)
            const siblings = getJobBatchSiblings(j);
            const batchTag = siblings.length > 0
                ? `<div style="font-size:10px; color:#4338ca; display:flex; align-items:center; gap:4px; flex-wrap:wrap;">📎 ชุดเดียวกัน (${siblings.length + 1} งาน):
                    ${siblings.map(s => {
                        const sClean = (s.jobType || "").replace(/\s*\(\d+\)/g, "");
                        const dotColor = isJobStatusOpen(s.status) ? '#f59e0b' : '#22c55e';
                        return `<span title="${sClean}: ${s.status}" style="display:inline-flex; align-items:center; gap:3px; background:#eef2ff; border-radius:8px; padding:1px 6px;"><span style="width:5px;height:5px;border-radius:50%;background:${dotColor};display:inline-block;"></span>${sClean}</span>`;
                    }).join('')}
                   </div>`
                : '';

            container.innerHTML += `
                <div class="kanban-card" draggable="true" ondragstart="onKanbanDragStart(event, '${j.id}')" style="background: white; border-radius: 6px; padding: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: grab; display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
                        <span style="font-weight: 700; font-size: 11px; color: var(--gold-dark);">${getJobDisplayNo(j)}</span>
                        <span class="badge badge-sm ${badgeClass}" style="font-size: 10px; padding: 1px 6px;">${cleanJobType}</span>
                    </div>
                    <div style="font-weight: 600; font-size: 12.5px; color: #1e293b; line-height: 1.4;">👤 ${workName}</div>
                    <div style="font-size: 11.5px; color: #64748b;">🏢 ${custName}</div>
                    ${batchTag}
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 8px; border-top: 1px solid #f1f5f9;">
                        <div style="font-size: 12px; font-weight: 700; color: #0f172a;">💰 ${j.fee.toLocaleString()} บ.</div>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            ${paymentBadge}
                            <div style="display: flex; gap: 4px; margin-left: 6px;">
                                ${actionBtns}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    // Update counts
    if (document.getElementById("count-kanban-pending")) document.getElementById("count-kanban-pending").innerText = counts["รอดำเนินการ"];
    if (document.getElementById("count-kanban-progress")) document.getElementById("count-kanban-progress").innerText = counts["กำลังดำเนินการ"];
    if (document.getElementById("count-kanban-docs")) document.getElementById("count-kanban-docs").innerText = counts["รอเอกสารเพิ่มเติม"];
    if (document.getElementById("count-kanban-completed")) document.getElementById("count-kanban-completed").innerText = counts["เสร็จสิ้น"];
}

// Drag & Drop event handlers
function onKanbanDragStart(e, jobId) {
    e.dataTransfer.setData("text/plain", jobId);
}

function onKanbanDragOver(e) {
    e.preventDefault();
}

async function onKanbanDrop(e, targetStatus) {
    e.preventDefault();
    const jobId = e.dataTransfer.getData("text/plain");
    const job = jobs.find(j => j.id === jobId);
    if (job && job.status !== targetStatus) {
        // Check write permission
        if (currentUser.role === 'staff') {
            showToast("❌ สิทธิ์ Staff ดูข้อมูลได้อย่างเดียว ไม่สามารถย้ายบอร์ดได้", "danger");
            return;
        }

        // ป้องกันเปิดงานประเภทเดียวกันซ้อนกัน: ถ้าลากใบงานนี้กลับเข้าสถานะ "เปิดอยู่"
        // (เช่น ดึงงานที่เสร็จแล้วกลับมาทำต่อ) และคนงานคนนี้มีงานประเภทเดียวกัน
        // เปิดอยู่แล้วจากใบงานอื่น ให้บล็อกไว้ก่อน
        if (isJobStatusOpen(targetStatus)) {
            const cleanType = getCleanJobTypeName(job.jobType);
            const conflict = findOpenJobConflict(job.workerId, cleanType, job.id);
            if (conflict) {
                showToast(`❌ ย้ายไม่ได้: คนงานคนนี้มีงาน "${cleanType}" เปิดอยู่แล้วที่ใบงานเลขที่ ${getJobDisplayNo(conflict)}`, "danger");
                renderJobs();
                return;
            }
        }
        
        const oldStatus = job.status;
        job.status = targetStatus;
        job.updatedAt = new Date().toISOString().split('T')[0];

        showToast("🔄 กำลังอัปเดตสถานะในคลาวด์...", "warning");
        const res = await callCloudAPI("saveJob", { jobData: job });
        
        if (!res) {
            // Revert the local status change since the cloud save failed
            job.status = oldStatus;
            renderJobs();
            showToast("❌ ย้ายสถานะไม่สำเร็จ (ยังไม่ถูกบันทึกลงชีต) กรุณาลองใหม่", "danger");
            return;
        }
        
        saveData();
        renderJobs();
        showToast(`📋 ย้ายงาน ${getJobDisplayNo(job)} เป็น "${targetStatus}" สำเร็จ`, "success");
    }
}

// ==================== LINE GROUPS SYSTEM ====================

function renderLineGroups() {
    const tbody = document.getElementById("line-groups-tbody");
    if (!tbody) return;

    if (lineGroups.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-muted" style="text-align: center; padding: 25px;">
                    ❌ ไม่พบรายชื่อกลุ่มแจ้งเตือน LINE ในระบบ (ลากบอทเข้ากลุ่มเพื่อเพิ่ม หรือกดเพิ่มกลุ่มด้านบน)
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = lineGroups.map(g => {
        let deleteBtn = '';
        if (currentUser.role === 'admin') {
            deleteBtn = `
                <button class="action-icon-btn delete-btn" onclick="deleteLineGroup('${g.groupId}')" title="ลบกลุ่ม">
                    🗑️
                </button>
            `;
        }

        const editBtn = `
            <button class="action-icon-btn" onclick="openLineGroupModal('${g.groupId}')" title="แก้ไขชื่อกลุ่ม">
                ✏️
            </button>
        `;

        return `
            <tr>
                <td><strong>${g.groupName}</strong></td>
                <td><code style="font-family: monospace; font-size: 11.5px; background: #f1f5f9; padding: 2px 6px; border-radius: 3px;">${g.groupId}</code></td>
                <td style="text-align: center; padding: 8px;">
                    <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                        ${editBtn}
                        ${deleteBtn}
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function openLineGroupModal(groupId = null) {
    // Check permission
    if (currentUser.role === 'staff') {
        showToast("❌ สิทธิ์ Staff ดูข้อมูลได้อย่างเดียว ไม่สามารถจัดการกลุ่มไลน์ได้", "danger");
        return;
    }

    const modal = document.getElementById("line-group-modal");
    const title = document.getElementById("line-group-modal-title");
    const inpId = document.getElementById("line-group-id");
    const inpName = document.getElementById("line-group-name");

    if (groupId) {
        // Edit mode
        const g = lineGroups.find(x => x.groupId === groupId);
        if (g) {
            title.innerText = "✏️ แก้ไขข้อมูลกลุ่มแจ้งเตือน LINE";
            inpId.value = g.groupId;
            inpId.disabled = true; // Cannot edit Group ID once created
            inpName.value = g.groupName;
        }
    } else {
        // Add mode
        title.innerText = "➕ เพิ่มกลุ่มแจ้งเตือน LINE";
        inpId.value = "";
        inpId.disabled = false;
        inpName.value = "";
    }

    modal.classList.remove("hidden");
}

function closeLineGroupModal() {
    document.getElementById("line-group-modal").classList.add("hidden");
}

async function saveLineGroup() {
    const groupId = document.getElementById("line-group-id").value.trim();
    const groupName = document.getElementById("line-group-name").value.trim();

    if (!groupId || !groupName) {
        showToast("⚠️ กรุณากรอกรหัสกลุ่ม และชื่อกลุ่ม LINE ให้ครบถ้วน", "warning");
        return;
    }

    const matchedIdx = lineGroups.findIndex(g => g.groupId === groupId);
    const timestamp = new Date().toISOString().split('T')[0];

    const groupData = {
        groupId: groupId,
        groupName: groupName,
        createdAt: matchedIdx > -1 ? lineGroups[matchedIdx].createdAt : timestamp
    };

    showToast("🔄 กำลังบันทึกข้อมูลกลุ่มไลน์...", "warning");
    const res = await callCloudAPI("saveLineGroup", { groupData: groupData });
    if (!res) {
        showToast("❌ บันทึกไม่สำเร็จ ข้อมูลกลุ่มไลน์ยังไม่ถูกบันทึกลงชีต กรุณาลองใหม่", "danger");
        return;
    }

    if (matchedIdx > -1) {
        lineGroups[matchedIdx] = groupData;
    } else {
        lineGroups.push(groupData);
    }

    saveData();
    closeLineGroupModal();
    renderLineGroups();
    showToast("💾 บันทึกข้อมูลกลุ่มไลน์เรียบร้อยแล้ว!", "success");
}

async function deleteLineGroup(groupId) {
    if (currentUser.role !== 'admin') {
        showToast("❌ เฉพาะแอดมิน (Admin) เท่านั้นที่สามารถลบกลุ่มได้", "danger");
        return;
    }

    if (!confirm(`ต้องการลบกลุ่ม LINE รหัส ${groupId} หรือไม่?\n(การแจ้งเตือนของคนงานต่างด้าวในกลุ่มนี้จะไม่ถูกส่งอีกต่อไป)`)) {
        return;
    }

    showToast("🗑️ กำลังลบข้อมูลกลุ่มไลน์...", "warning");
    const res = await callCloudAPI("deleteRecord", { sheetName: "Line_Groups", id: groupId });

    lineGroups = lineGroups.filter(g => g.groupId !== groupId);
    saveData();
    renderLineGroups();
    showToast("🗑️ ลบกลุ่ม LINE เรียบร้อยแล้ว", "success");
}

