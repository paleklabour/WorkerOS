// ==================== APP STATE & DATA MODEL ====================
let currentUser = null;
let currentJobView = 'table';

// Mock database structures
let customers = [];
let workers = [];
let hiddenWorkers = []; // คนงานของนายจ้างที่ถูกปิดใช้งาน (inactive) — ซ่อนจากทุกหน้าของระบบ ดู applyInactiveEmployers()
let jobs = [];
let banks = [];
let users = [];
let appSettings = {};    // ค่าตั้งค่ากลาง (app_settings) เช่น cash_card_order — ใช้ร่วมกันทุกผู้ใช้
let team = [];           // ทีมงานภายใน {id, name, role} จาก rpc list_team — ใช้เลือก/แสดงผู้รับผิดชอบใบงาน (ทุกตำแหน่งเห็น)
let agents = [];
let expenses = [];
let freeInvoices = [];   // ตารางเดิม (เลิกใช้แล้ว ย้ายเข้า invoices) — ยังโหลดไว้เผื่อสำรองข้อมูล
let invoices = [];       // บิลทุกใบ (งานเดียว/บิลรวม/บิลอิสระ) — ดู ACCOUNTING MODULE
let payments = [];       // การตัดยอดเข้าบิล (หลายงวดต่อบิล) — รายรับนับตาม paidDate
let receipts = [];       // ใบเสร็จ = เงินเข้า 1 ก้อน (ตัดได้หลายบิล ส่วนที่เหลือเป็นมัดจำ) — ยอดแบงค์นับจากตารางนี้
let servicePrices = [];  // ราคามาตรฐานต่อประเภทงาน (ค่าธรรมเนียมรัฐ + ค่าบริการ) — ใช้ภายในเท่านั้น

// Thai provinces selection constraint
const PROVINCES = ["สงขลา", "ปัตตานี", "ยะลา", "พัทลุง"];

// รายชื่อธนาคารพาณิชย์และสถาบันการเงินเฉพาะกิจในประเทศไทยทั้งหมด (ตามรายชื่อธนาคารแห่งประเทศไทย)
// ใช้สร้างตัวเลือกธนาคารในฟอร์ม + badge "โลโก้" สีประจำธนาคาร (ไม่ใช้รูปโลโก้จริงเพื่อเลี่ยงปัญหาลิขสิทธิ์/พึ่งพาอินเทอร์เน็ต)
const THAI_BANKS = [
    { name: "ธนาคารกรุงเทพ", short: "BBL", color: "#1e4598", appIcon: "bbl-app.png" },
    { name: "ธนาคารกสิกรไทย", short: "KBank", color: "#138f2d", appIcon: "kbank-app.png" },
    { name: "ธนาคารกรุงไทย", short: "KTB", color: "#1ba5e1", appIcon: "ktb-app.png" },
    { name: "ธนาคารทหารไทยธนชาต", short: "ttb", color: "#1279be", appIcon: "ttb-app.png" },
    { name: "ธนาคารไทยพาณิชย์", short: "SCB", color: "#4e2a84", appIcon: "scb-app.png" },
    { name: "ธนาคารกรุงศรีอยุธยา", short: "BAY", color: "#fec43b", appIcon: "bay-app.png" },
    { name: "ธนาคารเกียรตินาคินภัทร", short: "KKP", color: "#00a99d", appIcon: "kk-app.png" },
    { name: "ธนาคารซีไอเอ็มบีไทย", short: "CIMB", color: "#7d0f27", appIcon: "cimb-app.png" },
    { name: "ธนาคารทิสโก้", short: "TISCO", color: "#004a95", appIcon: "tisco-app.png" },
    { name: "ธนาคารยูโอบี", short: "UOB", color: "#002878", appIcon: "uob-app.png" },
    { name: "ธนาคารแลนด์ แอนด์ เฮ้าส์", short: "LH", color: "#f7941d", appIcon: "lhb-app.png" },
    { name: "ธนาคารไอซีบีซี (ไทย)", short: "ICBC", color: "#c8161d", appIcon: "icbc-app.png" },
    { name: "ธนาคารไทยเครดิต", short: "TCB", color: "#f26a21", appIcon: "tcrb-app.png" },
    { name: "ธนาคารออมสิน", short: "GSB", color: "#eb198d", appIcon: "gsb-app.png" },
    { name: "ธนาคารอาคารสงเคราะห์", short: "GHB", color: "#f68b1f", appIcon: "ghb-app.png" },
    { name: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร", short: "BAAC", color: "#2e7d32", appIcon: "baac-app.png" },
    { name: "ธนาคารอิสลามแห่งประเทศไทย", short: "iBank", color: "#00693e", logo: "ibank" },
    { name: "ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย", short: "EXIM", color: "#003876", appIcon: "exim-app.png" },
    { name: "ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย", short: "SME D", color: "#0072bc", appIcon: "smed-app.png" }
];

function getBankMeta(bankName) {
    return THAI_BANKS.find(b => b.name === bankName) || { name: bankName, short: (bankName || "").slice(0, 4) || "BANK", color: "#64748b" };
}

// สร้าง badge วงกลมสีประจำธนาคารไว้หน้าชื่อธนาคาร ("โลโก้") ในจุดที่ใช้ HTML จริงได้ (ไม่ใช่ใน <option>)
// โลโก้ธนาคารในวงกลม:
// - appIcon = ไอคอนแอป mobile banking ทางการบน iOS (App Store ไทย ผ่าน iTunes Search API, 256px) เต็มวงกลม
//   เช่น K PLUS, SCB EASY, Krungthai NEXT, MyMo, ttb touch — ไฟล์ assets/banks/<key>-app.png
// - logo = โลโก้สีขาวบนวงกลมสีประจำธนาคาร (assets/banks/*.svg จาก github.com/omise/banks-logo, MIT)
//   ใช้กับธนาคารที่ไม่มีแอปใน App Store ไทย (ตอนนี้คือ iBank)
// - ไม่มีทั้งสองอย่าง หรือโหลดรูปไม่ขึ้น → แสดงตัวย่อแทน
// ขนาดจริง = ขนาดที่ขอ × 1.3 (ขั้นต่ำ 28px) — ขยายจากเดิมให้โลโก้มองเห็นชัด
function renderBankLogoBadge(bankName, size = 30) {
    const meta = getBankMeta(bankName);
    const px = Math.max(28, Math.round(size * 1.3));
    const shortText = meta.short.slice(0, 4);
    const inner = meta.appIcon
        ? `<img src="assets/banks/${meta.appIcon}" alt="${shortText}" style="width:100%; height:100%; object-fit:cover;" onerror="this.replaceWith(document.createTextNode(this.alt))">`
        : meta.logo
        ? `<img src="assets/banks/${meta.logo}.svg" alt="${shortText}" style="width:64%; height:64%; object-fit:contain;" onerror="this.replaceWith(document.createTextNode(this.alt))">`
        : shortText;
    return `<span style="display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; width:${px}px; height:${px}px; border-radius:50%; background-color:${meta.color}; color:#fff; font-weight:700; font-size:${Math.max(9, Math.round(px * 0.3))}px; line-height:1; overflow:hidden;${meta.appIcon ? " box-shadow:0 0 0 1px #e2e8f0;" : ""}" title="${meta.name}">${inner}</span>`;
}

// ตัวเลือกบัญชีใน <select> พร้อมโลโก้ธนาคาร + เลขบัญชี กันเลือกบัญชีผิด (ใช้ทุก dropdown ที่เลือกบัญชี)
// รูปใน <option> แสดงได้ใน Chrome/Edge ที่รองรับ appearance: base-select (ดู styles.css) — เบราว์เซอร์อื่นเห็นแค่ข้อความ
// BANK_SELECT_HEAD ต้องเป็นลูกตัวแรกของ <select> เพื่อให้กล่องที่เลือกแล้วแสดงโลโก้ด้วย (ไม่ใช่แค่ในรายการ)
const BANK_SELECT_HEAD = '<button type="button" class="bank-select-head"><selectedcontent></selectedcontent></button>';
function bankOptionHtml(b, value) {
    return `<option value="${value !== undefined ? value : b.id}" data-bank="${escapeHtml(b.bankName)}">${renderBankLogoBadge(b.bankName, 18)}<span class="opt-bank-text">${escapeHtml(b.bankName)} — ${escapeHtml(b.accountName || '')}${b.accountNumber ? ` (${escapeHtml(b.accountNumber)})` : ''}</span></option>`;
}
function cashOptionHtml(value = 'cash', label = 'เงินสด') {
    return `<option value="${value}" data-icon="cash"><span class="opt-cash-icon">${icon('cash', 'green')}</span><span class="opt-bank-text">${escapeHtml(label)}</span></option>`;
}

const MONTH_NAMES_TH = {
    "01": "มกราคม", "02": "กุมภาพันธ์", "03": "มีนาคม", "04": "เมษายน",
    "05": "พฤษภาคม", "06": "มิถุนายน", "07": "กรกฎาคม", "08": "สิงหาคม",
    "09": "กันยายน", "10": "ตุลาคม", "11": "พฤศจิกายน", "12": "ธันวาคม"
};

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
        "เมืองปัตตานี": { "zip": "94000", "subs": ["สะบารัง", "อาเนาะรู", "จะบังติกอ", "บานา", "ตันหยงลุโละ", "คลองมานิง", "กะมิยอ", "บาราโหม", "ปะกาฮะรัง", "รูสะมิแล", "ตะลุโบะ", "บาราเฮาะ", "ปุยุด"] },
        "โคกโพธิ์": { "zip": "94120", "subs": ["โคกโพธิ์", "มะกรูด", "บางโกระ", "ป่าบอน", "ทรายขาว", "นาประดู่", "ปากล่อ", "ทุ่งพลา", "ท่าเรือ", "นาเกตุ", "ควนโนรี", "ช้างให้ตก"] },
        "หนองจิก": { "zip": "94170", "subs": ["เกาะเปาะ", "คอลอตันหยง", "ดอนรัก", "ดาโต๊ะ", "ตุยง", "ท่ากำชำ", "บ่อทอง", "บางเขา", "บางตาวา", "ปุโละปุโย", "ยาบี", "ลิปะสะโง"] },
        "ปะนาเระ": { "zip": "94130", "subs": ["ปะนาเระ", "ท่าข้าม", "บ้านนอก", "ดอน", "ควน", "ท่าน้ำ", "คอกกระบือ", "พ่อมิ่ง", "บ้านกลาง", "บ้านน้ำบ่อ"] },
        "มายอ": { "zip": "94140", "subs": ["มายอ", "ถนน", "ตรัง", "กระหวะ", "ลุโบะยิไร", "ลางา", "กระเสาะ", "เกาะจัน", "ปะโด", "สาคอบน", "สาคอใต้", "สะกำ", "ปานัน"] },
        "ทุ่งยางแดง": { "zip": "94140", "subs": ["ตะโละแมะนา", "พิเทน", "น้ำดำ", "ปากู"] },
        "สายบุรี": { "zip": "94110", "subs": ["ตะลุบัน", "ตะบิ้ง", "ปะเสยะวอ", "บางเก่า", "บือเระ", "เตราะบอน", "กะดุนง", "ละหาร", "มะนังดาลำ", "แป้น", "ทุ่งคล้า"] },
        "ไม้แก่น": { "zip": "94220", "subs": ["ไทรทอง", "ไม้แก่น", "ตะโละไกรทอง", "ดอนทราย"] },
        "ยะหริ่ง": { "zip": "94150", "subs": ["ตะโละ", "ตะโละกาโปร์", "ตันหยงดาลอ", "ตันหยงจึงงา", "ตอหลัง", "ตาแกะ", "ตาลีอายร์", "ยามู", "บางปู", "หนองแรต", "ปิยามุมัง", "ปุลากง", "บาโลย", "สาบัน", "มะนังยง", "ราตาปันยัง", "จะรัง", "แหลมโพธิ์"] },
        "ยะรัง": { "zip": "94160", "subs": ["ยะรัง", "สะดาวา", "ประจัน", "สะนอ", "ระแว้ง", "ปิตูมุดี", "วัด", "กระโด", "คลองใหม่", "เมาะมาวี", "กอลำ", "เขาตูม"] },
        "แม่ลาน": { "zip": "94180", "subs": ["ม่วงเตี้ย", "แม่ลาน", "ป่าไร่"] },
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
    "demo-manager@local.test": { email: "demo-manager@local.test", name: "Demo Manager (Offline)", role: "account_manager", password: "demo-only-local-2" },
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

// ประเภทงานที่เมื่อ "ปิดงาน" สำเร็จแล้ว ให้ตั้งสถานะคนงานที่ผูกกับงานนั้นเป็น "พ้นสภาพ/แจ้งออก" อัตโนมัติ
const EXIT_JOB_TYPE = "แจ้งออกคนงานต่างด้าว";

function isJobStatusOpen(status) {
    return JOB_OPEN_STATUSES.includes(status);
}

// ลูกค้าบางรายตั้งไว้ (customers.requirePrepayment) ว่าต้องออกบิล+รับชำระก่อน ถึงจะเริ่ม
// "กำลังดำเนินการ" ได้ — คืนข้อความบล็อกถ้าเข้าเงื่อนไขต้องห้าม ไม่งั้นคืน null (ผ่าน)
function jobPrepaymentBlockReason(customerId, targetStatus, currentPaymentStatus) {
    if (targetStatus !== 'กำลังดำเนินการ') return null;
    const cust = customers.find(c => c.id === customerId);
    if (!cust || !cust.requirePrepayment) return null;
    if (currentPaymentStatus === 'ชำระเงินแล้ว' || currentPaymentStatus === JOB_NO_CHARGE) return null;
    return `ย้ายเข้า "กำลังดำเนินการ" ไม่ได้: นายจ้าง "${cust.companyName}" ตั้งไว้ว่าต้องออกบิลและรับชำระเงินก่อนเริ่มดำเนินการ`;
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
// sameWorkerOnly = เฉพาะใบงานของคนงานคนเดียวกัน (แจ้งครั้งเดียวให้หลายคน batch จะมีใบงานของคนอื่นปนอยู่)
function getJobBatchSiblings(job, sameWorkerOnly = false) {
    if (!job || !job.batchId) return [];
    return jobs.filter(j => j.batchId === job.batchId && j.id !== job.id && (!sameWorkerOnly || j.workerId === job.workerId));
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
    // ทุกทางที่บันทึกคนงาน (ฟอร์ม, แนบไฟล์จากแฟ้ม, Bulk Import, ฯลฯ) ผ่านตรงนี้ — เพศว่างแต่มีคำนำหน้าให้เติมจากคำนำหน้าเสมอ
    if (action === "saveWorker" && payload.workerData) fillGenderFromTitle(payload.workerData);
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
    hideAppSplash();

    try {
        // Set Date in Header
        const headerDate = document.getElementById("header-date");
        if (headerDate) {
            headerDate.innerText = formatThaiDate(new Date());
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

// ซ่อนหน้าโหลดตอนเปิดระบบ (#app-splash ใน index.html) แบบค่อย ๆ จางออก แล้วเอาออกจาก DOM
function hideAppSplash() {
    const splash = document.getElementById("app-splash");
    if (!splash) return;
    splash.classList.add("is-done");
    setTimeout(() => splash.remove(), 400);
}

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
                console.log("Cleaned up large base64 attachments in localStorage to recover quota.");
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
        showSyncStatus('loading');
        const res = await callCloudAPI("getData");
        if (res && res.status !== "error") {
            customers = res.customers || [];
            workers = res.workers || [];
            jobs = res.jobs || [];
            banks = sortBanks(res.banks || []);
            users = res.users || [];
            team = res.team || [];
            appSettings = res.settings || {};
            agents = res.agents || [];
            expenses = res.expenses || [];
            freeInvoices = res.freeInvoices || [];
            invoices = res.invoices || [];
            payments = res.payments || [];
            receipts = res.receipts || [];
            servicePrices = res.servicePrices || [];
            hiddenWorkers = [];
            applyInactiveEmployers();
            // เปลี่ยนธีมจากอีกเครื่องไว้ → ใช้ธีมล่าสุดของบัญชี (ตอนเปิดระบบ/กดรีเฟรช)
            const me = currentUser ? users.find(u => u.id === currentUser.id) : null;
            if (me) syncThemeFromAccount(me.theme);
            // การจัดหน้าวิดเจ็ตล่าสุดของบัญชี (อาจจัดจากอีกเครื่อง) — ข้ามถ้ามีการแก้ในเครื่องนี้ที่ยังรอบันทึก
            if (me && !_widgetSaveTimer && JSON.stringify(me.uiLayout || null) !== JSON.stringify(currentUser.uiLayout || null)) {
                currentUser.uiLayout = me.uiLayout || null;
                applyAllWidgetLayouts();
            }

            // Cache locally
            localStorage.setItem("mw_customers", JSON.stringify(customers));
            localStorage.setItem("mw_workers", JSON.stringify(allWorkers()));
            localStorage.setItem("mw_jobs", JSON.stringify(jobs));
            localStorage.setItem("mw_banks", JSON.stringify(banks));
            localStorage.setItem("mw_users", JSON.stringify(users));
            localStorage.setItem("mw_agents", JSON.stringify(agents));
            localStorage.setItem("mw_expenses", JSON.stringify(expenses));
            localStorage.setItem("mw_free_invoices", JSON.stringify(freeInvoices));
            localStorage.setItem("mw_invoices", JSON.stringify(invoices));
            localStorage.setItem("mw_payments", JSON.stringify(payments));
            localStorage.setItem("mw_receipts", JSON.stringify(receipts));
            localStorage.setItem("mw_service_prices", JSON.stringify(servicePrices));

            showSyncStatus('success', `นายจ้าง ${customers.length} • คนงาน ${workers.length} • ใบงาน ${jobs.length}`);
            return;
        }
        showSyncStatus('error', (res && res.message) ? res.message : 'เชื่อมต่อคลาวด์ไม่ได้');
    }

    const cachedCustomers = localStorage.getItem("mw_customers");
    const cachedWorkers = localStorage.getItem("mw_workers");
    const cachedJobs = localStorage.getItem("mw_jobs");
    const cachedBanks = localStorage.getItem("mw_banks");

    if (cachedCustomers && cachedWorkers && cachedJobs && cachedBanks) {
        customers = JSON.parse(cachedCustomers);
        workers = JSON.parse(cachedWorkers);
        hiddenWorkers = [];
        applyInactiveEmployers();
        jobs = JSON.parse(cachedJobs);
        banks = sortBanks(JSON.parse(cachedBanks));
        const cachedAgents = localStorage.getItem("mw_agents");
        agents = cachedAgents ? JSON.parse(cachedAgents) : [];
        const cachedExpenses = localStorage.getItem("mw_expenses");
        expenses = cachedExpenses ? JSON.parse(cachedExpenses) : [];
        const cachedFreeInvoices = localStorage.getItem("mw_free_invoices");
        freeInvoices = cachedFreeInvoices ? JSON.parse(cachedFreeInvoices) : [];
        const readCache = (key) => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { return []; } };
        invoices = readCache("mw_invoices");
        payments = readCache("mw_payments");
        receipts = readCache("mw_receipts");
        servicePrices = readCache("mw_service_prices");
    } else {
        // Generate Mock Data for immediate usage & wow factor
        seedMockData();
    }
}

// ==================== การ์ดสถานะการดึงข้อมูลกลางจอ (แทน toast "กำลังดึง..." + "ดึงเรียบร้อย" 2 อันแยกกัน) ====================
// การ์ดเดียวเปลี่ยนสถานะในตัว: loading (วงหมุน) → success (ติ๊ก + จำนวนข้อมูล แล้วจางหายเอง) หรือ error (ค้างนานกว่า กดปิดได้)
// ไม่บังการคลิกหน้าเว็บ (pointer-events: none ยกเว้นปุ่มปิด) — ใช้ทั้งตอนเปิดระบบ (loadData) และปุ่มรีเฟรช 🔄
let _syncStatusTimer = null;
function showSyncStatus(state, detail = '') {
    let el = document.getElementById('sync-status');
    if (!el) {
        el = document.createElement('div');
        el.id = 'sync-status';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.innerHTML = `
            <div class="sync-card">
                <div class="sync-visual"><span class="sync-spinner"></span><span class="sync-icon"></span></div>
                <div class="sync-text"><strong class="sync-title"></strong><small class="sync-detail"></small></div>
                <button type="button" class="sync-close" aria-label="ปิด">×</button>
            </div>`;
        el.querySelector('.sync-close').addEventListener('click', () => hideSyncStatus());
        document.body.appendChild(el);
    }
    clearTimeout(_syncStatusTimer);
    const copy = {
        loading: ['กำลังดึงข้อมูลล่าสุด', 'กำลังเชื่อมต่อฐานข้อมูลออนไลน์...'],
        success: ['ข้อมูลเป็นปัจจุบันแล้ว', detail],
        error: ['ดึงข้อมูลออนไลน์ไม่สำเร็จ', `ใช้ข้อมูลที่บันทึกไว้ในเครื่องแทน${detail ? ` — ${detail}` : ''}`],
    }[state];
    el.className = `is-visible is-${state}`;
    el.querySelector('.sync-title').textContent = copy[0];
    el.querySelector('.sync-detail').textContent = copy[1] || '';
    el.querySelector('.sync-icon').innerHTML = state === 'success' ? icon('ok', 'green') : state === 'error' ? icon('warn', 'amber') : '';
    if (state === 'success') _syncStatusTimer = setTimeout(hideSyncStatus, 1600);
    if (state === 'error') _syncStatusTimer = setTimeout(hideSyncStatus, 6000);
}

function hideSyncStatus() {
    const el = document.getElementById('sync-status');
    if (el) el.classList.remove('is-visible');
}

// ปุ่มรีเฟรชข้างกระดิ่ง (มุมขวาบน) — ดึงข้อมูลล่าสุดจาก Supabase แล้ววาดหน้าที่เปิดอยู่ใหม่ (ช่องค้นหา/ตัวกรองคงค่าเดิม)
let _refreshingAppData = false;
async function refreshAppData() {
    if (_refreshingAppData) return;
    _refreshingAppData = true;
    const btn = document.getElementById("topbar-refresh-btn");
    if (btn) btn.classList.add("spinning");
    try {
        await loadData();
        const activeSection = document.querySelector(".content-section:not(.hidden)");
        const viewName = activeSection ? activeSection.id.replace(/^view-/, '') : 'dashboard';
        if (viewName !== 'dashboard') renderDashboard(); // อัปเดตตัวเลขแจ้งเตือนบนกระดิ่งด้วย แม้ไม่ได้อยู่หน้าแดชบอร์ด
        switchView(viewName);
    } finally {
        _refreshingAppData = false;
        if (btn) btn.classList.remove("spinning");
    }
}

// นายจ้างที่ Admin ปิดใช้งาน (customers.status = 'inactive') → ย้ายคนงานของนายจ้างนั้นไปเก็บใน hiddenWorkers
// ทุกหน้าที่อ่าน `workers` จึงไม่เห็นคนงานกลุ่มนี้เลย (รายชื่อ แดชบอร์ด กระดิ่ง ต่ออายุ เลือกคนงานในใบงาน ฯลฯ)
function allWorkers() {
    return workers.concat(hiddenWorkers);
}

function isCustomerInactive(c) {
    return !!c && c.status === 'inactive';
}

function applyInactiveEmployers() {
    const inactive = new Set(customers.filter(isCustomerInactive).map(c => c.id));
    const all = allWorkers();
    workers = all.filter(w => !inactive.has(w.employerId));
    hiddenWorkers = all.filter(w => inactive.has(w.employerId));
}

async function toggleCustomerActive(customerId) {
    if (currentUser.role !== 'admin') { showToast("❌ เฉพาะ Admin เท่านั้น", "danger"); return; }
    const c = customers.find(item => item.id === customerId);
    if (!c) return;
    const deactivate = !isCustomerInactive(c);
    const count = allWorkers().filter(w => w.employerId === c.id).length;
    const msg = deactivate
        ? `ปิดใช้งานนายจ้าง "${c.companyName}"? คนงาน ${count} คนของนายจ้างนี้จะไม่แสดงในระบบ (ข้อมูลยังอยู่ครบ เปิดใช้งานใหม่ได้ทุกเมื่อ)`
        : `เปิดใช้งานนายจ้าง "${c.companyName}" อีกครั้ง? คนงาน ${count} คนจะกลับมาแสดงในระบบ`;
    if (!(await uiConfirm(msg, { okText: deactivate ? "ปิดใช้งาน" : "เปิดใช้งาน" }))) return;

    const updated = Object.assign({}, c, { status: deactivate ? 'inactive' : 'active' });
    const res = await callCloudAPI("saveCustomer", { customerData: updated });
    if (!res || res.status === "error") {
        showToast("❌ บันทึกไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
        return;
    }
    Object.assign(c, { status: updated.status });
    applyInactiveEmployers();
    saveData();
    renderCustomers();
    renderWorkers();
    showToast(deactivate ? `ปิดใช้งาน "${c.companyName}" แล้ว` : `เปิดใช้งาน "${c.companyName}" แล้ว`, "success");
}

function saveData() {
    localStorage.setItem("mw_customers", JSON.stringify(customers));
    localStorage.setItem("mw_workers", JSON.stringify(allWorkers()));
    localStorage.setItem("mw_jobs", JSON.stringify(jobs));
    localStorage.setItem("mw_banks", JSON.stringify(banks));
    localStorage.setItem("mw_agents", JSON.stringify(agents));
    localStorage.setItem("mw_expenses", JSON.stringify(expenses));
    localStorage.setItem("mw_free_invoices", JSON.stringify(freeInvoices));
    localStorage.setItem("mw_invoices", JSON.stringify(invoices));
    localStorage.setItem("mw_payments", JSON.stringify(payments));
    localStorage.setItem("mw_receipts", JSON.stringify(receipts));
    localStorage.setItem("mw_service_prices", JSON.stringify(servicePrices));
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
            status: "ปิดงานแล้ว",
            paymentStatus: "ยังไม่ออกบิล",
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
            status: "ปิดงานแล้ว",
            paymentStatus: "ชำระเงินแล้ว",
            paymentMethod: "เงินสด",
            notes: "แก้ไขคำสะกดชื่อ-วันเดือนปีเกิด ยอดชำระเงินเรียบร้อยแล้ว",
            orderNo: "",
            updatedAt: todayDateStr
        }
    ];

    saveData();
}

async function initApp() {
    try {
        await loadData();
        applyAllWidgetLayouts(); // จัดวิดเจ็ตตามที่บัญชีนี้บันทึกไว้ (profiles.ui_layout)
        hideLoginView();
        showMainLayout();
        
        // Set user UI info
        document.getElementById("user-display-name").innerText = currentUser ? currentUser.name : "User";
        document.getElementById("user-role-display").innerText = currentUser ? getRoleLabel(currentUser.role) : "";
        document.getElementById("user-avatar-initial").innerText = currentUser && currentUser.name ? currentUser.name.charAt(0) : "U";

        // Initial View
        // บัญชีนายจ้าง (Client) เข้าหน้าพอร์ทัลของตัวเองเลย ไม่ใช่แดชบอร์ดภายใน
        // กดรีเฟรชเบราว์เซอร์ → กลับมาหน้าเดิม (และแท็บย่อยหน้าการเงิน) ที่ทำงานอยู่ในแท็บนี้
        // (ตั้งสิทธิ์ก่อน เพื่อเช็คได้ว่าบัญชีนี้ยังเข้าหน้านั้นได้ — เมนูที่ไม่มีสิทธิ์ถูกซ่อนไว้)
        setupFormPermissions();
        const lastView = readSessionValue('mw_last_view');
        const lastMenu = lastView ? document.getElementById(`menu-${lastView}`) : null;
        const canRestore = currentUser && currentUser.role !== 'client' && lastMenu && document.getElementById(`view-${lastView}`)
            && !lastMenu.classList.contains('hidden') && getComputedStyle(lastMenu).display !== 'none';
        switchView(currentUser && currentUser.role === 'client' ? 'client-portal' : (canRestore ? lastView : 'dashboard'));
        setupAllSearchSuggestions();
        setupAllSearchSelects();
    } catch (e) {
        console.error("Error initializing app: ", e);
        logout(); // force logout to clear corrupted state
    }
}

// ==================== SEARCH SUGGESTIONS / AUTO-SUGGEST (ใช้ร่วมกันทุกช่องค้นหาในระบบ) ====================
// ผูก dropdown แนะนำคำค้นหาให้ input ค้นหา 1 ช่อง — ไม่แก้ตรรกะกรองตารางเดิมเลย แค่ช่วยเลือกคำค้นหาได้เร็วขึ้น
// getItems: () => คืน array รายการที่จะแนะนำ (เรียกใหม่ทุกครั้งที่พิมพ์ เพื่อให้เห็นข้อมูลล่าสุดเสมอ)
// getLabel/getSub: item -> ข้อความหลัก/รองที่โชว์ในรายการแนะนำ — ค่าที่คลิกแล้วเติมลงช่องค้นหาคือ getLabel เสมอ
// renderFn: ฟังก์ชัน render ตารางเดิมของหน้านั้น (เรียกซ้ำหลังเลือกคำแนะนำ เพื่อกรองตารางทันที)
const _searchSuggestRegistered = new Set();

// ปุ่มลูกศรขึ้น/ลง เลื่อนเลือกรายการใน dropdown + Enter เลือก, Esc ปิด — ใช้ร่วมกันทั้ง registerSearchSuggest/registerSearchSelect
// รายการที่เลือกได้ต้องมี data-idx (บรรทัด "ไม่พบข้อมูล" ไม่มี จึงข้ามไปเอง)
function attachSuggestKeyboard(input, dropdown, pick, hide, reopen) {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { hide(); return; }
        if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && dropdown.classList.contains('hidden') && reopen) reopen();
        const items = Array.from(dropdown.querySelectorAll('.search-suggest-item[data-idx]'));
        if (dropdown.classList.contains('hidden') || items.length === 0) return;
        let cur = items.findIndex(el => el.classList.contains('active'));
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            cur = e.key === 'ArrowDown' ? (cur + 1) % items.length : (cur <= 0 ? items.length - 1 : cur - 1);
            items.forEach((el, i) => el.classList.toggle('active', i === cur));
            items[cur].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter' && cur >= 0) {
            e.preventDefault();
            pick(Number(items[cur].dataset.idx));
        }
    });
}

function registerSearchSuggest(inputId, getItems, getLabel, getSub, renderFn) {
    if (_searchSuggestRegistered.has(inputId)) return; // กัน event listener ซ้อนถ้า initApp() ถูกเรียกมากกว่า 1 ครั้ง (logout แล้ว login ใหม่)
    const input = document.getElementById(inputId);
    if (!input) return;
    const box = input.closest('.search-box');
    if (!box) return;
    _searchSuggestRegistered.add(inputId);

    let dropdown = document.getElementById(`${inputId}-suggest`);
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'search-suggest-dropdown hidden';
        dropdown.id = `${inputId}-suggest`;
        box.appendChild(dropdown);
    }

    function hide() {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
    }

    function showSuggestions() {
        const query = input.value.trim().toLowerCase();
        if (!query) { hide(); return; }

        const items = getItems() || [];
        const matches = items.filter(item => {
            const label = (getLabel(item) || '').toLowerCase();
            const sub = (getSub(item) || '').toLowerCase();
            return label.includes(query) || sub.includes(query);
        }).slice(0, 8);

        if (matches.length === 0) { hide(); return; }

        dropdown.innerHTML = matches.map((item, idx) => {
            const label = getLabel(item) || '';
            const sub = getSub(item) || '';
            return `
                <div class="search-suggest-item" data-idx="${idx}">
                    <span class="search-suggest-label">${label}</span>
                    ${sub ? `<span class="search-suggest-sub">${sub}</span>` : ''}
                </div>
            `;
        }).join('');
        dropdown.classList.remove('hidden');

        currentMatches = matches;
        Array.from(dropdown.children).forEach((el, idx) => {
            el.addEventListener('mousedown', (e) => {
                e.preventDefault(); // กันไม่ให้ input blur ก่อนที่ click จะทำงาน
                pick(idx);
            });
        });
    }

    let currentMatches = [];
    function pick(idx) {
        input.value = getLabel(currentMatches[idx]) || '';
        hide();
        renderFn();
        input.focus();
    }

    input.addEventListener('input', showSuggestions);
    input.addEventListener('focus', showSuggestions);
    input.addEventListener('blur', () => setTimeout(hide, 150));
    attachSuggestKeyboard(input, dropdown, pick, hide, showSuggestions);
}

// รวบรวมใบงาน (ใช้ทั้งหน้า "ระบบแจ้งงาน" และแท็บ "ออกบิล/รับเงิน") เป็นรายการแนะนำที่มี label/sub
// ตรงกับสิ่งที่ renderJobs()/renderBillingTab() ใช้กรองจริง (ชื่อคนงาน หรือชื่อนายจ้างถ้าไม่พบคนงาน)
function buildJobSuggestItems() {
    // แนะนำทั้งชื่อคนงานและชื่อนายจ้าง (ไม่ซ้ำ) — ช่องว่างซ้อนในชื่อยุบเหลือช่องเดียว (ชื่อพม่าจาก OCR มักมีช่องว่างเกิน)
    const tidy = s => String(s || '').replace(/\s+/g, ' ').trim();
    const seen = new Set();
    const out = [];
    jobs.forEach(j => {
        const work = workers.find(w => w.id === j.workerId);
        const cust = customers.find(c => c.id === j.customerId);
        const custName = tidy(cust && cust.companyName);
        if (work) {
            const label = tidy(`${work.firstName || ''} ${work.lastName || ''}`);
            if (label && !seen.has('w:' + label)) { seen.add('w:' + label); out.push({ label, sub: [work.workerUid, custName].filter(Boolean).join(' • ') }); }
        }
        if (custName && !seen.has('c:' + custName)) { seen.add('c:' + custName); out.push({ label: custName, sub: 'นายจ้าง' }); }
    });
    return out;
}

// ตั้งค่า auto-suggest ให้ครบทุกช่องค้นหาในระบบ — เรียกครั้งเดียวตอน initApp()
function setupAllSearchSuggestions() {
    registerSearchSuggest('search-customer', () => customers,
        c => c.companyName, c => c.taxId, renderCustomers);

    // ช่องค้นหาคนงานแนะนำทั้งชื่อคนงานและชื่อนายจ้าง (แทน dropdown กรองนายจ้างเดิม) — renderWorkers() ค้นชื่อนายจ้างอยู่แล้ว
    registerSearchSuggest('search-worker', () => workers.map(w => ({ label: `${w.firstName || ''} ${w.lastName || ''}`.trim(), sub: w.workerUid || w.passportNo }))
            .concat(customers.filter(c => !isCustomerInactive(c)).map(c => ({ label: c.companyName, sub: `นายจ้าง${c.taxId ? ' · ' + c.taxId : ''}` }))),
        x => x.label, x => x.sub, renderWorkers);

    registerSearchSuggest('search-job', buildJobSuggestItems,
        x => x.label, x => x.sub, renderJobs);

    registerSearchSuggest('search-agent', () => agents, a => a.name, () => '', renderAgentsList);

    registerSearchSuggest('search-billing', buildJobSuggestItems,
        x => x.label, x => x.sub, renderBillingTab);

    registerSearchSuggest('search-expense', () => expenses, e => e.description, e => e.category, renderExpenses);

    registerSearchSuggest('search-bank', () => banks, b => b.bankName, b => b.accountName, renderBanks);

    registerSearchSuggest('search-user', () => users, u => u.name, u => u.email, renderUsers);

    // เหมือนช่องค้นหาหน้าคนงาน: แนะนำทั้งชื่อคนงานและชื่อนายจ้าง
    registerSearchSuggest('search-renewal', () => workers.map(w => ({ label: `${w.firstName || ''} ${w.lastName || ''}`.trim(), sub: w.workerUid || w.passportNo }))
            .concat(customers.filter(c => !isCustomerInactive(c)).map(c => ({ label: c.companyName, sub: `นายจ้าง${c.taxId ? ' · ' + c.taxId : ''}` }))),
        x => x.label, x => x.sub, renderRenewalGroups);

    registerSearchSuggest('search-dashboard-employer-alerts', () => customers,
        c => c.companyName, c => c.taxId, renderEmployerAlerts);

    registerSearchSuggest('search-dashboard-missing-docs', () => workers.filter(isWorkerMissingDocs),
        w => `${w.firstName || ''} ${w.lastName || ''}`.trim(),
        w => { const emp = customers.find(c => c.id === w.employerId); return [w.workerUid, emp ? emp.companyName : ''].filter(Boolean).join(' · '); },
        renderMissingDocsOverview);
}

// ==================== SEARCH-SELECT (ค้นหาเพื่อ "เลือกข้อมูล 1 รายการ" จากระบบ — นายจ้าง, ลูกจ้าง, Agent ฯลฯ) ====================
// กฎมาตรฐานของโปรเจกต์: ช่องไหนก็ตามที่ให้ผู้ใช้ "ค้นหาเพื่อเลือกข้อมูล 1 รายการที่มีอยู่จริงในระบบ" จากชุดข้อมูลที่อาจยาวขึ้น
// เรื่อยๆ (นายจ้าง/ลูกค้า, ลูกจ้าง/คนงาน, Agent ฯลฯ) ต้องใช้ registerSearchSelect() นี้เสมอ แทนการให้พิมพ์ข้อความเองอิสระ
// หรือ <select> ยาวๆ ที่ต้องเลื่อนหา — เป็น dropdown แนะนำขณะพิมพ์มาตรฐานเดียวกับ registerSearchSuggest() ด้านบน
// (ใช้ CSS class เดียวกัน: .search-box / .search-suggest-dropdown) ต่างกันตรงที่ตัวนี้คืนค่าเป็น "รายการที่เลือกจริง"
// (มี id) ให้ onSelect แทนแค่เติมข้อความแล้วกรองตารางเดิม — ดูรายละเอียดกฎเต็มใน CLAUDE.md หัวข้อ "Search-to-select fields"
//
// ไม่ใช้ pattern นี้กับ: (1) ตัวเลือกตายตัวจำนวนน้อย เช่น สถานะ/สัญชาติ/เพศ — ใช้ <select> ปกติต่อไป หรือ
// (2) การเลือกได้หลายรายการพร้อมกันที่ต้องเห็นรายการที่เลือกไว้ค้างอยู่ตลอด — ใช้ checklist แบบ job-worker-picker แทน
//
// ถ้าช่องนั้นมี <select> เดิมอยู่แล้วที่โค้ดจุดอื่นยังอ่าน/เขียน .value อยู่ (เช่น validation, ผูก onchange เดิม) ให้
// ซ่อน <select> นั้นไว้ (class="hidden") เป็น "แหล่งเก็บค่าจริง" ต่อไป แล้วผูก getValue/setValue เข้ากับมัน — ไม่ต้องแก้
// โค้ดเดิมที่อ่าน/เขียนค่านั้นเลย (รูปแบบเดียวกับ <select id="job-worker-id"> ที่ซ่อนไว้หลัง job-worker-picker)
const searchSelectConfigs = {};
const _searchSelectRegistered = new Set();

// config: { inputId, getValue, setValue, getPool, getId, getLabel, getSub, getBadge, emptyText, onSelect, onClear }
function registerSearchSelect(key, config) {
    searchSelectConfigs[key] = config;

    const input = document.getElementById(config.inputId);
    if (!input || _searchSelectRegistered.has(config.inputId)) return;
    _searchSelectRegistered.add(config.inputId);

    const box = input.closest('.search-box') || input.parentElement;
    let dropdown = document.getElementById(`${config.inputId}-suggest`);
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'search-suggest-dropdown hidden';
        dropdown.id = `${config.inputId}-suggest`;
        box.appendChild(dropdown);
    }

    function hide() {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
    }

    function showOptions() {
        const cfg = searchSelectConfigs[key];
        const query = input.value.trim().toLowerCase();
        const pool = cfg.getPool() || [];
        const matches = pool.filter(item => {
            if (!query) return true;
            const label = (cfg.getLabel(item) || '').toLowerCase();
            const sub = (cfg.getSub ? (cfg.getSub(item) || '') : '').toLowerCase();
            return label.includes(query) || sub.includes(query);
        }).slice(0, 30);

        if (matches.length === 0) {
            dropdown.innerHTML = `<div class="search-suggest-item" style="cursor:default;"><span class="search-suggest-label" style="color:var(--text-muted); font-weight:normal;">--- ${cfg.emptyText || 'ไม่พบข้อมูลที่ตรงกับคำค้นหา'} ---</span></div>`;
            dropdown.classList.remove('hidden');
            return;
        }

        dropdown.innerHTML = matches.map((item, idx) => {
            const label = cfg.getLabel(item) || '';
            const sub = cfg.getSub ? cfg.getSub(item) : '';
            const badge = cfg.getBadge ? cfg.getBadge(item) : '';
            const subLine = [sub, badge].filter(Boolean).join(' · ');
            return `
                <div class="search-suggest-item" data-idx="${idx}">
                    <span class="search-suggest-label">${label}</span>
                    ${subLine ? `<span class="search-suggest-sub">${subLine}</span>` : ''}
                </div>
            `;
        }).join('');
        dropdown.classList.remove('hidden');

        currentMatches = matches;
        Array.from(dropdown.children).forEach((el, idx) => {
            el.addEventListener('mousedown', (e) => {
                e.preventDefault(); // กันไม่ให้ input blur ก่อนที่ click จะทำงาน
                pick(idx);
            });
        });
    }

    let currentMatches = [];
    function pick(idx) {
        const cfg = searchSelectConfigs[key];
        selectSearchSelectItem(key, cfg.getId(currentMatches[idx]));
        hide();
        input.focus();
    }

    input.addEventListener('input', () => {
        // พิมพ์ทับชื่อที่เลือกไว้เดิม -> ถือว่ายังไม่ได้เลือกใหม่ จนกว่าจะคลิกเลือกจากรายการจริง
        const cfg = searchSelectConfigs[key];
        if (cfg.getValue()) {
            cfg.setValue('');
            if (cfg.onClear) cfg.onClear();
        }
        showOptions();
    });
    input.addEventListener('focus', showOptions);
    input.addEventListener('blur', () => setTimeout(hide, 150));
    attachSuggestKeyboard(input, dropdown, pick, hide, showOptions);
}

// เลือกรายการโดยตรงด้วย id (ใช้ตอนคลิกเลือกจาก dropdown หรือเลือกให้อัตโนมัติจากโค้ด เช่น
// เลือกลูกจ้างแล้วเติมนายจ้างของคนนั้นให้ทันที) — เซ็ตค่าจริง + ข้อความในช่อง + เรียก onSelect เสมอ
function selectSearchSelectItem(key, id) {
    const cfg = searchSelectConfigs[key];
    if (!cfg) return;
    const record = (cfg.getPool() || []).find(item => cfg.getId(item) === id);
    if (!record) return;

    cfg.setValue(id);
    const input = document.getElementById(cfg.inputId);
    if (input) input.value = cfg.getLabel(record) || '';
    if (cfg.onSelect) cfg.onSelect(record);
}

// ล้างค่าที่เลือกไว้ + ข้อความในช่อง (ไม่เรียก onSelect)
function clearSearchSelect(key) {
    const cfg = searchSelectConfigs[key];
    if (!cfg) return;
    cfg.setValue('');
    const input = document.getElementById(cfg.inputId);
    if (input) input.value = '';
    if (cfg.onClear) cfg.onClear();
}

// ตั้งค่าเริ่มต้นตอนเปิดโมดัล (ไม่เรียก onSelect/onClear — ใช้แค่ sync ค่าจริง + ข้อความที่แสดงในช่องให้ตรงกัน
// เช่น ตอนเปิดฟอร์มแก้ไขที่มีค่าเดิมอยู่แล้ว โค้ดที่เรียกเองต่างหากจะจัดการผลข้างเคียง เช่น กรองรายชื่อลูกจ้างตามนายจ้าง)
function presetSearchSelect(key, id) {
    const cfg = searchSelectConfigs[key];
    if (!cfg) return;
    cfg.setValue(id || '');
    const input = document.getElementById(cfg.inputId);
    if (!input) return;
    if (id) {
        const record = (cfg.getPool() || []).find(item => cfg.getId(item) === id);
        input.value = record ? (cfg.getLabel(record) || '') : '';
    } else {
        input.value = '';
    }
}

// ==================== สิทธิ์ตามตำแหน่ง (ยืนยัน 2026-10-02) ====================
// admin = Admin/GM, account_manager = Account Manager, operation_manager = Operation Manager, staff = Staff, client = ลูกค้า
// ฐานข้อมูลบังคับสิทธิ์ซ้ำอีกชั้น (RLS) — ดู supabase/migrations/20261002..._roles_gm_am_om_staff.sql
// แก้สิทธิ์ที่นี่ที่เดียว แล้วใช้ can('...') / canEditJob(j) ทุกจุด
const ROLE_LABELS = {
    admin: 'Admin / GM (สิทธิ์เต็ม)',
    account_manager: 'Account Manager (บิล/การเงิน)',
    operation_manager: 'Operation Manager (งาน/เอกสาร)',
    staff: 'Staff (ทำงานที่ได้รับมอบหมาย)',
    client: 'ลูกค้า/นายจ้าง (เฉพาะข้อมูลตนเอง)'
};
const PERMS = {
    finance:      ['admin', 'account_manager'],                     // บิล รับเงิน มัดจำ รายจ่าย บัญชีธนาคาร ราคามาตรฐาน/ต้นทุน
    voidMoney:    ['admin', 'account_manager'],                     // ยกเลิกใบเสร็จ/การรับเงิน, ถอนยอดออกจากบิล
    commission:   ['admin', 'account_manager'],                     // เห็น/จ่ายค่าคอม Agent
    ops:          ['admin', 'operation_manager', 'staff'],          // เพิ่ม/แก้นายจ้าง คนงาน เอกสาร, เปิดใบงาน
    assignJobs:   ['admin', 'operation_manager'],                   // มอบหมายผู้รับผิดชอบ + แก้ใบงานทุกใบ
    manageAgents: ['admin', 'account_manager', 'operation_manager'],
    deleteFiles:  ['admin', 'operation_manager'],                   // ลบไฟล์เอกสารในแฟ้ม (Storage)
    admin:        ['admin']                                         // ลบข้อมูล จัดการผู้ใช้ สำรอง/กู้คืน
};

function can(perm) {
    return !!currentUser && (PERMS[perm] || []).includes(currentUser.role);
}

// Staff แก้ได้เฉพาะใบงานที่ตัวเองเปิดหรือได้รับมอบหมาย
function canEditJob(j) {
    if (can('assignJobs')) return true;
    return !!(j && currentUser && currentUser.role === 'staff' && currentUser.id && (j.assignedTo === currentUser.id || j.openedBy === currentUser.id));
}

function getRoleLabel(role) {
    return ROLE_LABELS[role] || ROLE_LABELS.staff;
}

function setupFormPermissions() {
    // ปุ่ม/เมนูที่อยู่ใน index.html ซ่อนด้วย CSS: <body class="perm-no-xxx"> + องค์ประกอบ class="needs-xxx"
    Object.keys(PERMS).forEach(p => document.body.classList.toggle(`perm-no-${p}`, !can(p)));

    const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? 'flex' : 'none'; };
    show("btn-add-customer", can('ops'));
    show("btn-add-worker", can('ops'));
    show("btn-add-job", can('ops') || (currentUser && currentUser.role === 'client'));
    show("btn-add-bank", can('finance'));
    show("btn-bulk-import-docs", can('ops'));
    // บัญชีนายจ้าง (Client): เหลือเมนูเดียว "ข้อมูลของบริษัทฉัน" — ซ่อนหน้าภายในทั้งหมด
    // (ตั้งทุกเมนูใหม่ทุกครั้ง เผื่อเครื่องเดียวกันสลับบัญชี client ↔ พนักงาน)
    const isClient = !!currentUser && currentUser.role === 'client';
    document.body.classList.toggle('is-client-portal', isClient);
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        item.classList.toggle('hidden', item.id === 'menu-client-portal' ? !isClient : isClient);
    });
    if (isClient) return;
    const toggleMenu = (id, on) => { const el = document.getElementById(id); if (el) el.classList.toggle('hidden', !on); };
    toggleMenu("menu-users", can('admin'));
    toggleMenu("menu-backup", can('admin'));
    toggleMenu("menu-expenses", can('finance'));
    toggleMenu("menu-agents", can('manageAgents'));
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
            btn.innerHTML = "<span>" + icon("hourglass") + " กำลังเข้าสู่ระบบ...</span>";
        }
        try {
            const result = await window.supabaseAdapter.login(email, password);
            if (result && result.status === "success") {
                errorEl.style.display = 'none';
                // หมายเหตุ: ไม่เก็บรหัสผ่านไว้ในเครื่องอีกต่อไป — Supabase Auth จัดการ
                // session/token ให้เองผ่าน supabase-js (ปลอดภัยกว่าระบบเดิม)
                currentUser = {
                    id: result.user.id,
                    email: result.user.email,
                    name: result.user.name,
                    role: result.user.role,
                    customer_id: result.user.customer_id,
                    theme: result.user.theme || null,
                    uiLayout: result.user.uiLayout || null
                };
                localStorage.setItem("mw_current_user", JSON.stringify(currentUser));
                syncThemeFromAccount(result.user.theme);
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
    closeNotificationPanel();
    updateNotificationBell(); // ไม่มีผู้ใช้ = 0 → ซ่อนตัวเลข ไม่ให้ค้างไปถึงบัญชีที่ login ถัดไป
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
        btn.innerHTML = "<span>" + icon("hourglass") + " กำลังบันทึก...</span>";
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
// ==================== พอร์ทัลนายจ้าง (บัญชี Client) ====================
// นายจ้าง login ด้วยบัญชีของตัวเอง (role = client, profiles.customer_id) — ฐานข้อมูลกรองให้เห็นเฉพาะข้อมูลของตัวเอง (RLS)
// แท็บ: คนงานของฉัน (+เอกสารลูกจ้าง) / งานที่แจ้ง (เลือกเดือน) / ยอดค้างชำระ / ใบเสร็จรับเงิน
// ไม่แสดงเอกสารของนายจ้างเอง (เจ้าของระบบกำหนด 2026-10-02)
let clientPortalTab = 'workers';
const WORKER_STATUS_LABELS = { active: 'ปกติ', pending_register: 'รอขึ้นทะเบียน', archived: 'แจ้งออก/พ้นสภาพ' };

function clientCustomerId() {
    return (currentUser && currentUser.customer_id && currentUser.customer_id !== 'ALL') ? currentUser.customer_id : (customers[0] || {}).id;
}

function switchClientPortalTab(tab) {
    clientPortalTab = tab;
    document.querySelectorAll('[data-portal-tab]').forEach(b => {
        b.classList.toggle('btn-gold', b.dataset.portalTab === tab);
        b.classList.toggle('btn-outline', b.dataset.portalTab !== tab);
    });
    renderClientPortal();
    replayPageTransition(document.getElementById("client-portal-body"));
}

// เล่นแอนิเมชันเปลี่ยนหน้า (Fade-up, .page-transition-in ใน styles.css) ซ้ำกับกล่องที่ไม่ได้ถูกซ่อน/แสดง แต่เปลี่ยนเนื้อหาด้วย innerHTML
function replayPageTransition(el) {
    if (!el) return;
    el.classList.remove('page-transition-in');
    void el.offsetWidth;
    el.classList.add('page-transition-in');
}

function renderClientPortal() {
    const custId = clientCustomerId();
    const cust = customers.find(c => c.id === custId);
    const myWorkers = workers.filter(w => w.employerId === custId && w.status !== 'deleted');
    const myJobs = jobs.filter(j => j.customerId === custId);
    const myInvoices = invoices.filter(i => i.customerId === custId && i.status !== 'void');
    const outstanding = round2(myInvoices.filter(i => i.status === 'issued' || i.status === 'partial').reduce((s, i) => s + invoiceBalance(i), 0));
    const head = document.getElementById("client-portal-head");
    if (head) head.innerHTML = `
        <div class="cp-company"><h3>${icon('building')} ${escapeHtml(cust ? cust.companyName : 'บริษัทของฉัน')}</h3>
            <span class="text-muted">${cust && cust.taxId ? `เลขผู้เสียภาษี ${escapeHtml(cust.taxId)}` : ''}</span></div>
        <div class="cp-stats">
            <div><span>คนงานปัจจุบัน</span><strong>${myWorkers.filter(w => w.status !== 'archived').length}</strong></div>
            <div><span>งานที่ยังไม่ปิด</span><strong>${myJobs.filter(j => isJobStatusOpen(j.status)).length}</strong></div>
            <div class="${outstanding > 0 ? 'is-due' : ''}"><span>ยอดค้างชำระ</span><strong>${fmtMoney(outstanding)}</strong></div>
        </div>`;

    const body = document.getElementById("client-portal-body");
    if (!body) return;
    if (clientPortalTab === 'workers') body.innerHTML = renderClientWorkersTab(myWorkers);
    else if (clientPortalTab === 'jobs') body.innerHTML = renderClientJobsTab(myJobs);
    else if (clientPortalTab === 'balance') body.innerHTML = renderClientBalanceTab(myInvoices, custId);
    else body.innerHTML = renderClientReceiptsTab(myInvoices, custId);
}

// พอร์ทัลนายจ้าง: ดับเบิลคลิกแถวคนงาน → ป๊อปอัปข้อมูลคนงานทั้งหมด (ดูอย่างเดียว แก้ไม่ได้)
// หน้าตาเดียวกับหน้าต่างตรวจสอบก่อนบันทึก (showUiDialog + card + summary) พร้อมรูปคนงาน
function openClientWorkerView(workerId) {
    const w = workers.find(x => x.id === workerId);
    if (!w) return;
    const d = (v) => v ? formatThaiDate(v) : '';
    const rows = [
        { heading: 'ข้อมูลส่วนตัว' },
        { label: 'คำนำหน้า', value: w.title },
        { label: 'ชื่อ (อังกฤษ)', value: w.firstName },
        { label: 'นามสกุล (อังกฤษ)', value: w.lastName },
        { label: 'ชื่อไทย (บัตรชมพู)', value: w.thaiName },
        { label: 'เพศ', value: w.gender },
        { label: 'สัญชาติ', value: w.nationality },
        { label: 'วันเกิด', value: d(w.dob) },
        { label: 'ชื่อพ่อ', value: w.fatherName },
        { label: 'ชื่อแม่', value: w.motherName },
        { label: 'อีเมล', value: w.email },
        { heading: 'ใบอนุญาตทำงาน / เลขประจำตัว' },
        { label: 'เลขอ้างอิง', value: w.refNo },
        { label: 'เลขประจำตัวคนต่างด้าว', value: w.workerUid },
        { label: 'เลขที่ใบอนุญาตทำงาน', value: w.permitNo },
        { label: 'ใบอนุญาตหมดอายุ', value: d(w.permitExpiry) },
        { label: 'เลขบัตรชมพู', value: w.pinkCardNo },
        { label: 'ตำแหน่งงาน', value: w.position },
        { label: 'สถานที่ทำงาน', value: w.workplace },
        { heading: 'พาสปอร์ต / CI' },
        { label: 'เลขพาสปอร์ต', value: w.passportNo },
        { label: 'สถานที่ออก', value: w.passportPob },
        { label: 'ผู้ออก', value: w.passportAuth },
        { label: 'วันออก', value: d(w.passportIssue) },
        { label: 'วันหมดอายุ', value: d(w.passportExpiry) },
        { heading: 'อื่น ๆ' },
        { label: 'เลขกรมธรรม์ประกัน', value: w.insuranceNo },
        { label: 'สถานะ', value: WORKER_STATUS_LABELS[w.status] || w.status },
        { label: 'โน้ตถึงเจ้าหน้าที่', value: w.clientNote },
    ];
    // ตัดช่องว่าง และหัวข้อที่ไม่มีข้อมูลใต้หัวข้อนั้นเลย
    const summary = [];
    let pendingHeading = null;
    rows.forEach(r => {
        if (r.heading) { pendingHeading = r; return; }
        if (r.value == null || String(r.value).trim() === '') return;
        if (pendingHeading) { summary.push(pendingHeading); pendingHeading = null; }
        summary.push(r);
    });
    uiAlert('ดูข้อมูลอย่างเดียว — ถ้าข้อมูลไม่ถูกต้อง กด "เขียนโน้ต" แจ้งเจ้าหน้าที่ได้', {
        title: 'ข้อมูลคนงาน',
        wide: true, // หน้าต่างใหญ่ แบ่งหัวข้อเป็นคอลัมน์ ไม่ต้องเลื่อนลง
        okText: 'ปิด',
        card: { image: w.photo || '', imageIcon: 'user', title: workerFullName(w), subtitle: [w.nationality, w.workerUid].filter(Boolean).join(' • '), rows: [] },
        summary
    });
}

// แท็บ "คนงานของฉัน" — ตารางแบบเดียวกับหน้าข้อมูลคนงานต่างด้าว (รูป, เลขคนงาน/บัตร, พาสปอร์ต, วันหมดอายุ, สถานะเอกสาร)
// แบ่งกลุ่มตามวันที่ใบอนุญาตทำงานหมดอายุ (ใกล้หมดก่อน) — ไม่มีวันหมดอายุ / แจ้งออกแล้ว อยู่กลุ่มท้าย
function renderClientWorkersTab(list) {
    const q = (document.getElementById("cp-worker-search") || {}).value || '';
    const query = q.trim().toLowerCase();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysTo = (d) => d ? Math.ceil((d - today) / 86400000) : null;
    const shown = list.filter(w => !query || [w.firstName, w.lastName, w.thaiName, w.refNo, w.workerUid, w.passportNo, w.permitNo, w.pinkCardNo, w.nationality]
        .filter(Boolean).join(' ').toLowerCase().includes(query));

    // จัดกลุ่ม: วันหมดอายุใบอนุญาต (yyyy-mm-dd) → คนงาน
    const groups = {};
    shown.forEach(w => {
        const exp = safeParseDate(w.permitExpiry);
        const key = w.status === 'archived' ? 'z-archived' : exp ? localDateISO(exp) : 'y-none';
        (groups[key] = groups[key] || { key, date: exp, list: [] }).list.push(w);
    });
    const ordered = Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));

    const statusBadgeOf = (w) => {
        const pd = daysTo(safeParseDate(w.passportExpiry)), wd = daysTo(safeParseDate(w.permitExpiry));
        if (w.status === 'archived') return '<span class="badge badge-lg cp-badge-archived">พ้นสภาพ/แจ้งออก</span>';
        if (w.status === 'pending_register') return '<span class="badge badge-lg badge-gold">รอขึ้นทะเบียน</span>';
        if ((pd !== null && pd < 0) || (wd !== null && wd < 0)) return '<span class="badge badge-lg badge-danger">หมดอายุ</span>';
        if ((pd !== null && pd <= 180) || (wd !== null && wd <= 60)) return '<span class="badge badge-lg badge-warning">ใกล้หมดอายุ</span>';
        return '<span class="badge badge-lg badge-success">ปกติ</span>';
    };

    const row = (w) => {
        const pExp = safeParseDate(w.passportExpiry), wpExp = safeParseDate(w.permitExpiry);
        return `
            <tr class="clickable-row ${w.status === 'archived' ? 'is-voided-row' : ''}" ondblclick="handleRowDblClick(event) && openClientWorkerView('${w.id}')" title="ดับเบิลคลิกเพื่อดูข้อมูลคนงาน">
                <td>
                    <div><strong>${escapeHtml(w.refNo || '-')}</strong></div>
                    <div class="worker-id-line"><span>เลขประจำตัวคนต่างด้าว</span> <b>${escapeHtml(w.workerUid || '-')}</b></div>
                    <div class="worker-id-line"><span>เลขที่ใบอนุญาตทำงาน</span> <b>${escapeHtml(w.permitNo || '-')}</b></div>
                </td>
                <td>
                    <div class="renewal-worker-cell">
                        <div class="renewal-avatar"><img src="${w.photo ? escapeHtml(w.photo) : WORKER_AVATAR_PLACEHOLDER}" alt="" loading="lazy"></div>
                        <div>
                            <strong>${escapeHtml(`${w.title ? w.title + ' ' : ''}${w.firstName || '-'} ${w.lastName || ''}`.trim())}</strong>
                            ${w.thaiName ? `<div><small class="text-muted">ชื่อไทย (บัตรชมพู): ${escapeHtml(w.thaiName)}</small></div>` : ''}
                            <div><small class="text-muted">เพศ: ${escapeHtml(w.gender || '-')}</small></div>
                        </div>
                    </div>
                </td>
                <td><span class="badge badge-gold">${escapeHtml(w.nationality || '-')}</span></td>
                <td><div>เล่ม: ${escapeHtml(w.passportNo || '-')}</div></td>
                <td class="worker-expiry-cell">
                    ${renderWorkerExpiryLine('ใบอนุญาต', wpExp, daysTo(wpExp), 60)}
                    ${renderWorkerExpiryLine('พาสปอร์ต', pExp, daysTo(pExp), 180)}
                </td>
                <td>${statusBadgeOf(w)}</td>
                <td class="cp-note-cell">${w.clientNote ? `<span class="cp-note-text" title="${escapeHtml(w.clientNote)}">${escapeHtml(w.clientNote)}</span>` : '<span class="text-muted">-</span>'}</td>
                <td class="actions-col">
                    <div class="cp-worker-actions">
                        <button type="button" class="btn btn-sm btn-gold btn-open-folder" onclick="openWorkerFolderModal('${w.id}')">${icon('folder')} เปิดแฟ้มเอกสาร</button>
                        <button type="button" class="btn btn-sm btn-outline" onclick="openClientWorkerNote('${w.id}')">${icon('edit')} ${w.clientNote ? 'แก้โน้ต' : 'เขียนโน้ต'}</button>
                    </div>
                </td>
            </tr>`;
    };

    const groupTitle = (g) => g.key === 'z-archived' ? 'พ้นสภาพ / แจ้งออกแล้ว'
        : g.key === 'y-none' ? 'ยังไม่มีวันหมดอายุใบอนุญาต'
        : `ใบอนุญาตหมดอายุ ${formatThaiDate(g.date)}`;
    const groupHint = (g) => {
        if (!g.date || g.key === 'z-archived') return '';
        const d = daysTo(g.date);
        return d < 0 ? `<span class="text-danger">หมดอายุแล้ว ${-d} วัน</span>` : d <= 60 ? `<span class="text-warning">อีก ${d} วัน</span>` : `<span class="text-muted">อีก ${d} วัน</span>`;
    };

    const panels = ordered.map(g => `
        <div class="dashboard-panel cp-worker-group">
            <div class="panel-header">
                <h3>${icon('calendar')} ${groupTitle(g)}</h3>
                <span class="cp-worker-group-meta">${g.list.length} คน ${groupHint(g)}</span>
            </div>
            <div class="panel-content" style="padding: 0; overflow-x: auto;">
                <table class="data-table cp-workers-table" style="box-shadow: none; border: none; border-radius: 0;">
                    <colgroup><col class="cw-id"><col class="cw-name"><col class="cw-nat"><col class="cw-pp"><col class="cw-exp"><col class="cw-status"><col class="cw-note"><col class="cw-act"></colgroup>
                    <thead><tr><th>เลขคนงาน / บัตร</th><th>ชื่อ-นามสกุล</th><th>สัญชาติ</th><th>ข้อมูลพาสปอร์ต</th><th>วันหมดอายุ</th><th>สถานะเอกสาร</th><th>โน้ตถึงเจ้าหน้าที่</th><th class="actions-col">เอกสาร / โน้ต</th></tr></thead>
                    <tbody>${[...g.list].sort((a, b) => `${a.firstName}`.localeCompare(`${b.firstName}`)).map(row).join('')}</tbody>
                </table>
            </div>
        </div>`).join('');

    return `
        <div class="cp-card">
            <div class="cp-toolbar"><div class="search-box"><input type="text" id="cp-worker-search" placeholder="ค้นหาชื่อ-นามสกุล, เลขคนงาน, พาสปอร์ต..." value="${escapeHtml(q)}" oninput="renderClientPortalKeepFocus('cp-worker-search')"></div>
                <span class="text-muted">${shown.length} คน • แบ่งกลุ่มตามวันที่ใบอนุญาตทำงานหมดอายุ • กด "เปิดแฟ้มเอกสาร" เพื่อดู/ดาวน์โหลดเอกสาร</span></div>
            ${panels || '<p class="text-muted" style="text-align:center; padding:24px;">ไม่พบคนงาน</p>'}
        </div>`;
}

function renderClientJobsTab(list) {
    const monthSel = document.getElementById("cp-job-month");
    const month = monthSel ? monthSel.value : localDateISO(new Date()).slice(0, 7);
    const months = [...new Set(list.map(jobMonthKey).filter(k => /^\d{4}-\d{2}$/.test(k)))];
    const thisMonth = localDateISO(new Date()).slice(0, 7);
    if (!months.includes(thisMonth)) months.push(thisMonth);
    months.sort().reverse();
    const shown = list.filter(j => !month || jobMonthKey(j) === month).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const statusCls = { 'รอดำเนินการ': 'badge-warning', 'กำลังดำเนินการ': 'badge-gold', 'รอเอกสารเพิ่มเติม': 'badge-danger', 'ปิดงานแล้ว': 'badge-success' };
    return `
        <div class="cp-card">
            <div class="cp-toolbar">
                <select id="cp-job-month" class="select-filter" onchange="renderClientPortal()">
                    <option value="">ทุกเดือน</option>${months.map(k => `<option value="${k}" ${k === month ? 'selected' : ''}>${monthLabelTh(k)}</option>`).join('')}
                </select>
                <span class="text-muted">${shown.length} งาน • ปิดแล้ว ${shown.filter(j => j.status === 'ปิดงานแล้ว').length} • ยังไม่ปิด ${shown.filter(j => isJobStatusOpen(j.status)).length}</span>
            </div>
            <div class="table-container"><table class="data-table">
                <thead><tr><th>เลขที่แจ้งงาน</th><th>ประเภทงาน</th><th>คนงาน</th><th>วันที่แจ้ง</th><th>สถานะ</th><th>เอกสารปิดงาน</th></tr></thead>
                <tbody>${shown.length ? shown.map(j => {
                    const w = workers.find(x => x.id === j.workerId);
                    const docs = Array.isArray(j.attachments) ? j.attachments : [];
                    return `<tr>
                        <td><strong>${getJobDisplayNo(j)}</strong></td>
                        <td>${escapeHtml(getCleanJobTypeName(j.jobType))}</td>
                        <td>${escapeHtml(w ? `${w.firstName} ${w.lastName}` : '-')}</td>
                        <td>${formatThaiDate(String(j.createdAt || j.updatedAt || '').slice(0, 10))}</td>
                        <td><span class="badge ${statusCls[j.status] || ''}">${escapeHtml(j.status || '-')}</span>${j.status === 'ปิดงานแล้ว' && j.closedAt ? `<br><small class="text-muted">ปิดเมื่อ ${formatThaiDate(j.closedAt)}</small>` : ''}${j.appointmentDate && isJobStatusOpen(j.status) ? `<br><small class="text-muted">นัด ${formatThaiDate(j.appointmentDate)}${j.appointmentTime ? ` ${escapeHtml(j.appointmentTime)}` : ''}</small>` : ''}</td>
                        <td>${docs.length ? docs.map((f, k) => `<a href="${escapeHtml(f.url)}" target="_blank" rel="noopener" title="${escapeHtml(f.note || f.name || '')}">${icon('clip')} ${escapeHtml(f.name || `ไฟล์ ${k + 1}`)}</a>`).join('<br>') : '<span class="text-muted">-</span>'}</td>
                    </tr>`;
                }).join('') : `<tr><td colspan="6" class="text-muted" style="text-align:center; padding:24px;">ไม่มีงานที่แจ้งในเดือนนี้</td></tr>`}</tbody>
            </table></div>
        </div>`;
}

function renderClientBalanceTab(myInvoices, custId) {
    const open = myInvoices.filter(i => (i.status === 'issued' || i.status === 'partial') && invoiceBalance(i) > 0)
        .sort((a, b) => (a.issueDate || '').localeCompare(b.issueDate || ''));
    const total = round2(open.reduce((s, i) => s + invoiceBalance(i), 0));
    const credit = customerCredit(custId);
    const bank = banks[0];
    return `
        <div class="cp-card">
            <div class="pay-summary">
                <div class="${total > 0 ? 'is-due' : 'is-done'}"><span>ยอดค้างชำระรวม</span><strong>${fmtMoney(total)}</strong></div>
                <div><span>จำนวนบิลค้าง</span><strong>${open.length}</strong></div>
                <div class="is-paid"><span>มัดจำ/เงินรับล่วงหน้าคงเหลือ</span><strong>${fmtMoney(credit)}</strong></div>
            </div>
            <div class="table-container"><table class="data-table">
                <thead><tr><th>เลขที่บิล</th><th>วันที่ออกบิล</th><th>กำหนดชำระ</th><th class="inv-num">ยอดบิล</th><th class="inv-num">ชำระแล้ว</th><th class="inv-num">คงค้าง</th><th></th></tr></thead>
                <tbody>${open.length ? open.map(i => `
                    <tr>
                        <td><strong>${escapeHtml(i.invoiceNo)}</strong></td>
                        <td>${formatThaiDate(i.issueDate)}</td>
                        <td>${escapeHtml(i.dueDateText || '-')}</td>
                        <td class="inv-num">${fmtMoney(i.grandTotal)}</td>
                        <td class="inv-num">${fmtMoney(invoicePaidAmount(i))}</td>
                        <td class="inv-num"><strong class="text-danger">${fmtMoney(invoiceBalance(i))}</strong></td>
                        <td class="actions-col"><button type="button" class="btn btn-sm btn-outline" onclick="openStoredInvoice('${i.id}')">${icon('receipt')} ดูบิล</button></td>
                    </tr>`).join('') : `<tr><td colspan="7" class="text-muted" style="text-align:center; padding:24px;">${icon('ok')} ไม่มียอดค้างชำระ</td></tr>`}</tbody>
            </table></div>
            ${total > 0 ? `<p class="text-muted cp-pay-hint">ชำระได้ตามบัญชีที่ระบุในบิลแต่ละใบ แล้วส่งสลิปให้เจ้าหน้าที่ — ระบบจะออกใบเสร็จให้ในแท็บ "ใบเสร็จรับเงิน"</p>` : ''}
        </div>`;
}

function renderClientReceiptsTab(myInvoices, custId) {
    const invIds = new Set(myInvoices.map(i => i.id));
    // ใบเสร็จแบบใหม่ (receipts) + การรับเงินแบบเก่าที่ไม่มีใบเสร็จแยก
    const rows = [
        ...receipts.filter(r => r.customerId === custId && !r.voided).map(r => ({
            no: r.receiptNo, date: r.paidDate, amount: r.amount, method: r.method === 'cash' ? 'เงินสด' : paymentMethodLabel(r),
            ref: [...new Set(liveAllocationsOf(r.id).map(p => (invoices.find(i => i.id === p.invoiceId) || {}).invoiceNo).filter(Boolean))].join(', ') || 'มัดจำ',
            open: `openReceiptDoc('${r.id}')`
        })),
        ...payments.filter(p => !p.voided && !p.receiptId && invIds.has(p.invoiceId)).map(p => ({
            no: p.receiptNo, date: p.paidDate, amount: p.amount, method: paymentMethodLabel(p),
            ref: (invoices.find(i => i.id === p.invoiceId) || {}).invoiceNo || '-', open: `openReceiptModal('${p.id}')`
        }))
    ].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const total = round2(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0));
    return `
        <div class="cp-card">
            <div class="cp-toolbar"><span class="text-muted">ใบเสร็จที่ฝ่ายบัญชีออกให้แล้ว ${rows.length} ใบ • รวม ${fmtMoney(total)} บาท — กด "ดู/พิมพ์" เพื่อเปิดใบเสร็จ</span></div>
            <div class="table-container"><table class="data-table">
                <thead><tr><th>เลขที่ใบเสร็จ</th><th>วันที่รับเงิน</th><th>อ้างอิงบิล</th><th>ช่องทาง</th><th class="inv-num">จำนวนเงิน</th><th></th></tr></thead>
                <tbody>${rows.length ? rows.map(r => `
                    <tr>
                        <td><strong>${escapeHtml(r.no || '-')}</strong></td>
                        <td>${formatThaiDate(r.date)}</td>
                        <td>${escapeHtml(r.ref)}</td>
                        <td>${escapeHtml(r.method)}</td>
                        <td class="inv-num"><strong>${fmtMoney(r.amount)}</strong></td>
                        <td class="actions-col"><button type="button" class="btn btn-sm btn-outline" onclick="${r.open}">${icon('print')} ดู/พิมพ์</button></td>
                    </tr>`).join('') : `<tr><td colspan="6" class="text-muted" style="text-align:center; padding:24px;">ยังไม่มีใบเสร็จ</td></tr>`}</tbody>
            </table></div>
        </div>`;
}

// พิมพ์ค้นหาแล้ววาดแท็บใหม่ — คงเคอร์เซอร์ไว้ในช่องค้นหา
function renderClientPortalKeepFocus(inputId) {
    const el = document.getElementById(inputId);
    const pos = el ? el.selectionStart : null;
    renderClientPortal();
    const again = document.getElementById(inputId);
    if (again) { again.focus(); if (pos !== null) again.setSelectionRange(pos, pos); }
}

function readSessionValue(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
}
function writeSessionValue(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) { /* ไม่มี storage ก็แค่จำหน้าไม่ได้ */ }
}

function switchView(viewName) {
    writeSessionValue('mw_last_view', viewName);
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
    if (viewName === 'jobs') titleEl.innerText = "ระบบจัดการแจ้งงาน";
    if (viewName === 'renewals') titleEl.innerText = "ข้อมูลคนงานต่ออายุ/ทำเล่ม (จัดกลุ่มตามวันหมดอายุใบอนุญาต)";
    if (viewName === 'agents') titleEl.innerText = "จัดการ Agent (ผู้ส่งงาน / ผู้แนะนำลูกค้า)";
    if (viewName === 'expenses') titleEl.innerText = "การเงิน, รายจ่าย และบัญชีธนาคาร";
    if (viewName === 'users') titleEl.innerText = "จัดการบัญชีผู้ใช้งานระบบ";
    if (viewName === 'client-portal') titleEl.innerText = "ข้อมูลของบริษัทฉัน";
    if (viewName === 'backup') {
        titleEl.innerText = "สำรองและกู้คืนข้อมูลระบบ";
        renderLastBackupInfo();
        renderDriveBackupStatus();
    }

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
    } else if (viewName === 'renewals') {
        renderRenewalGroups();
    } else if (viewName === 'agents') {
        renderAgentsList();
    } else if (viewName === 'expenses') {
        // กลับไปแท็บย่อยที่เปิดค้างไว้ล่าสุด (ปุ่มรีเฟรช / F5 / กดเมนูซ้ำ ไม่เด้งกลับไปสรุปการเงิน)
        const lastFinTab = readSessionValue('mw_last_fin_tab');
        const finBtn = lastFinTab ? document.getElementById(`btn-finpage-tab-${lastFinTab}`) : null;
        switchFinancePageTab(finBtn && getComputedStyle(finBtn).display !== 'none' ? lastFinTab : 'overview');
    } else if (viewName === 'client-portal') {
        renderClientPortal();
    } else if (viewName === 'users') {
        renderUsers();
    }
    // ตัวเลขบนกระดิ่งต้องตรงกับผู้ใช้/ข้อมูลปัจจุบันทุกหน้า (เดิมอัปเดตแค่ตอนวาดแดชบอร์ด — บัญชี client ไม่เคยเข้าแดชบอร์ด เลยเห็นเลขค้างของบัญชีก่อนหน้า)
    if (viewName !== 'dashboard') updateNotificationBell();

    // บนจอมือถือ/แท็บเล็ต เมนูข้างเป็นลิ้นชักเลื่อนออกมา — เลือกเมนูแล้วปิดลิ้นชักให้อัตโนมัติ
    closeMobileSidebar();
}

// ==================== เมนูข้างแบบลิ้นชักบนจอมือถือ/แท็บเล็ต (Responsive Sidebar Drawer) ====================
// จอกว้าง (คอมพิวเตอร์/iPad แนวนอน) เมนูข้างจะแสดงค้างอยู่ตลอดตามปกติ (ดู styles.css)
// จอแคบ (มือถือ/iPad แนวตั้ง, <=1024px) เมนูข้างจะซ่อนไว้แล้วเลื่อนออกมาเมื่อกดปุ่มแฮมเบอร์เกอร์
function toggleMobileSidebar() {
    document.querySelector(".sidebar")?.classList.toggle("sidebar-open");
    document.getElementById("sidebar-overlay")?.classList.toggle("visible");
}

function closeMobileSidebar() {
    document.querySelector(".sidebar")?.classList.remove("sidebar-open");
    document.getElementById("sidebar-overlay")?.classList.remove("visible");
}

// ==================== ไอคอนสองโทน (Duotone SVG icons) ====================
// แทนอีโมจิในหน้าจอ (อีโมจิหน้าตาเปลี่ยนไปตามเครื่อง/เบราว์เซอร์) — ลายเส้น 24×24 สีตามประเภท + สีอ่อนเติมด้านใน
// - ในเทมเพลต JS: ${icon('trash')}  หรือกำหนดสีเอง ${icon('home', 'teal')}
// - ใน index.html: <span class="ico" data-icon="wp"></span> แล้ว hydrateIcons() จะเติม SVG ให้ตอนโหลดหน้า
// - class "fl" = รูปทรงปิดที่ถูกเติมสีอ่อน (ดู .ico svg .fl ใน styles.css)
// ข้อความใน showToast ยังใช้อีโมจิได้ตามเดิม (แสดง SVG ไม่ได้) — ส่วน uiConfirm/uiAlert ตัดอีโมจินำหน้าทิ้งเองเพราะมีไอคอนในหน้าต่างอยู่แล้ว
const ICON_GLYPHS = {
    wp:       { c: 'blue',   d: '<rect class="fl" x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2"/><path d="M5.8 16c.6-1.4 1.6-2 2.7-2s2.1.6 2.7 2M14 10h4M14 13.5h3"/>' },
    passport: { c: 'indigo', d: '<rect class="fl" x="5" y="3" width="14" height="18" rx="2.5"/><circle cx="12" cy="10" r="3.2"/><path d="M8.8 10h6.4M12 6.8c-1 .9-1.4 2-1.4 3.2s.4 2.3 1.4 3.2M12 6.8c1 .9 1.4 2 1.4 3.2s-.4 2.3-1.4 3.2M9 17h6"/>' },
    home:     { c: 'amber',  d: '<path class="fl" d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M10 20v-5h4v5"/>' },
    building: { c: 'teal',   d: '<path class="fl" d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"/><path class="fl" d="M15 10h3a1 1 0 0 1 1 1v10"/><path d="M3 21h18M8.5 8h3M8.5 11.5h3M8.5 15h3"/>' },
    cert:     { c: 'indigo', d: '<path class="fl" d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 10h7M9 13.5h5"/><circle cx="11" cy="17.5" r="1.6"/>' },
    briefcase:{ c: 'teal',   d: '<rect class="fl" x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18M11 12.5V14h2v-1.5"/>' },
    pink:     { c: 'pink',   d: '<rect class="fl" x="3" y="5" width="18" height="14" rx="2.5"/><path d="M12 9.2c.9-1.2 2.9-.9 2.9.8 0 1.4-2.9 3.3-2.9 3.3s-2.9-1.9-2.9-3.3c0-1.7 2-2 2.9-.8zM8 16.5h8"/>' },
    receipt:  { c: 'green',  d: '<path class="fl" d="M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.4z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>' },
    medical:  { c: 'red',    d: '<rect class="fl" x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>' },
    shield:   { c: 'teal',   d: '<path class="fl" d="M12 3 5 6v5.5c0 4.2 2.9 7.8 7 9.5 4.1-1.7 7-5.3 7-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>' },
    calendar: { c: 'blue',   d: '<rect class="fl" x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h2M12 14h2M8 17h2"/>' },
    photo:    { c: 'violet', d: '<path class="fl" d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.6-2.2h5.8L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.8" r="3.3"/>' },
    clip:     { c: 'slate',  d: '<path d="M20 11.4 12.3 19a4.8 4.8 0 0 1-6.8-6.8l7.9-7.9a3.2 3.2 0 0 1 4.5 4.5l-7.9 7.9a1.6 1.6 0 0 1-2.3-2.3l7.2-7.2"/>' },
    ok:       { c: 'green',  d: '<circle class="fl" cx="12" cy="12" r="9"/><path d="m8 12.3 2.7 2.7L16 9.4"/>' },
    bad:      { c: 'red',    d: '<circle class="fl" cx="12" cy="12" r="9"/><path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6"/>' },
    warn:     { c: 'amber',  d: '<path class="fl" d="M10.3 4.3a2 2 0 0 1 3.4 0l7.3 12.6a2 2 0 0 1-1.7 3H4.7a2 2 0 0 1-1.7-3z"/><path d="M12 9.5v4M12 16.8h.01"/>' },
    trash:    { c: 'red',    d: '<path class="fl" d="M6 7h12l-.9 12.1a2 2 0 0 1-2 1.9H8.9a2 2 0 0 1-2-1.9z"/><path d="M4 7h16M9.5 7V4.8c0-.4.4-.8.8-.8h3.4c.4 0 .8.4.8.8V7M10 11v6M14 11v6"/>' },
    hourglass:{ c: 'amber',  d: '<path class="fl" d="M7 3h10v3.5a5 5 0 0 1-2.2 4.1L12 12l-2.8-1.4A5 5 0 0 1 7 6.5z"/><path d="M7 21h10v-3.5a5 5 0 0 0-2.2-4.1L12 12l-2.8 1.4A5 5 0 0 0 7 17.5zM5.5 3h13M5.5 21h13"/>' },
    clipboard:{ c: 'blue',   d: '<rect class="fl" x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM8.5 10.5h7M8.5 14h7M8.5 17.5h4"/>' },
    link:     { c: 'teal',   d: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>' },
    edit:     { c: 'slate',  d: '<path class="fl" d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>' },
    cash:     { c: 'green',  d: '<rect class="fl" x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v.01M18 14.5v.01"/>' },
    moneybag: { c: 'green',  d: '<path class="fl" d="M9 7h6l2.2 3A8 8 0 0 1 19 15c0 3.3-2.7 5-7 5s-7-1.7-7-5a8 8 0 0 1 1.8-5z"/><path d="M9 7 7.8 4.6a.7.7 0 0 1 .6-1h7.2a.7.7 0 0 1 .6 1L15 7M12 10.5v7M13.8 12.2c-.4-.6-1-.9-1.8-.9-1 0-1.8.5-1.8 1.3 0 1.9 3.6.9 3.6 2.8 0 .8-.8 1.3-1.8 1.3-.8 0-1.5-.4-1.9-1"/>' },
    user:     { c: 'blue',   d: '<circle class="fl" cx="12" cy="8" r="4"/><path class="fl" d="M4.5 20.5c.8-3.6 3.8-6 7.5-6s6.7 2.4 7.5 6z"/>' },
    worker:   { c: 'amber',  d: '<path class="fl" d="M5 12a7 7 0 0 1 14 0z"/><path d="M3.5 12h17M10 5.3V9M14 5.3V9M7.5 15.5a4.5 4.5 0 0 0 9 0"/>' },
    users:    { c: 'teal',   d: '<circle class="fl" cx="9" cy="8.5" r="3.3"/><path class="fl" d="M3 19.5c.6-3 3-5 6-5s5.4 2 6 5z"/><path d="M15.5 5.6a3.3 3.3 0 0 1 0 5.8M17.5 14.8c1.8.7 3 2.4 3.5 4.7"/>' },
    chart:    { c: 'blue',   d: '<rect class="fl" x="4" y="12" width="4" height="8" rx="1"/><rect class="fl" x="10" y="7" width="4" height="13" rx="1"/><rect class="fl" x="16" y="4" width="4" height="16" rx="1"/>' },
    trendup:  { c: 'green',  d: '<path d="m3 16 5.5-5.5 4 4L21 6M15 6h6v6"/>' },
    trenddown:{ c: 'red',    d: '<path d="m3 8 5.5 5.5 4-4L21 18M15 18h6v-6"/>' },
    pie:      { c: 'violet', d: '<path class="fl" d="M11 4a8.5 8.5 0 1 0 9 9h-9z"/><path class="fl" d="M14 3a7.5 7.5 0 0 1 7 7h-7z"/>' },
    lock:     { c: 'slate',  d: '<rect class="fl" x="5" y="10.5" width="14" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5V17"/>' },
    unlock:   { c: 'green',  d: '<rect class="fl" x="5" y="10.5" width="14" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 7.7-1.5M12 14.5V17"/>' },
    inbox:    { c: 'blue',   d: '<path class="fl" d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M12 3.5v9M8.5 9l3.5 3.5L15.5 9"/>' },
    folder:   { c: 'amber',  d: '<path class="fl" d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6l2 2.2h7.4A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>' },
    file:     { c: 'slate',  d: '<path class="fl" d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 12.5h6M9 16h6"/>' },
    clock:    { c: 'amber',  d: '<circle class="fl" cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M4 5l3-2.5M20 5l-3-2.5"/>' },
    plus:     { c: 'blue',   d: '<path d="M12 5v14M5 12h14"/>' },
    sign:     { c: 'indigo', d: '<path d="M3 19c2-2.5 3.7-3 5-1.5 1.1 1.3 2.2 1.6 3.5.5M21 19h-6"/><path class="fl" d="M12.5 13.5H15l6-6a1.8 1.8 0 0 0-2.5-2.5l-6 6z"/>' },
    search:   { c: 'slate',  d: '<circle class="fl" cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>' },
    save:     { c: 'blue',   d: '<path class="fl" d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>' },
    print:    { c: 'slate',  d: '<path class="fl" d="M6 9h12a2 2 0 0 1 2 2v5h-3v4H7v-4H4v-5a2 2 0 0 1 2-2z"/><path d="M7 9V4h10v5M9 15h6"/>' },
    sparkles: { c: 'violet', d: '<path class="fl" d="M11 3.5 12.9 8l4.6 1.8-4.6 1.9L11 16.2l-1.9-4.5-4.6-1.9L9.1 8z"/><path d="m18 14 .9 2.1 2.1.9-2.1.9L18 20l-.9-2.1-2.1-.9 2.1-.9z"/>' },
    bot:      { c: 'violet', d: '<rect class="fl" x="4.5" y="8" width="15" height="11" rx="3"/><path d="M12 8V4.5M12 4.5h.01M9.5 13v1M14.5 13v1M2.5 12.5v3M21.5 12.5v3"/>' },
    idea:     { c: 'amber',  d: '<path class="fl" d="M9 17.5h6v-1.6c0-1 .5-1.9 1.3-2.6A6 6 0 1 0 6 8.8a6 6 0 0 0 1.7 4.5c.8.7 1.3 1.6 1.3 2.6z"/><path d="M10 21h4"/>' },
    pin:      { c: 'red',    d: '<path class="fl" d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>' },
    ban:      { c: 'red',    d: '<circle class="fl" cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>' },
    box:      { c: 'amber',  d: '<path class="fl" d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>' },
    bank:     { c: 'indigo', d: '<path class="fl" d="M3 9.5 12 4l9 5.5z"/><path d="M3 20.5h18M5 9.5v8M9.7 9.5v8M14.3 9.5v8M19 9.5v8M4 17.5h16"/>' },
    settings: { c: 'slate',  d: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle class="fl" cx="16" cy="7" r="2"/><circle class="fl" cx="10" cy="17" r="2"/>' },
    crown:    { c: 'amber',  d: '<path class="fl" d="m4 8 4 4 4-6 4 6 4-4-1.5 10h-13z"/><path d="M5.5 20.5h13"/>' },
    trophy:   { c: 'amber',  d: '<path class="fl" d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.5M17 6h2.5a2.5 2.5 0 0 1-2.6 3.5M12 14v3M9.5 17h5v3.5h-5z"/>' },
    gem:      { c: 'indigo', d: '<path class="fl" d="M6.5 4h11L21 9l-9 11L3 9z"/><path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5"/>' },
    chat:     { c: 'green',  d: '<path class="fl" d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v10a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17A1.5 1.5 0 0 1 4 15.5z"/>' },
    book:     { c: 'red',    d: '<path class="fl" d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>' },
    dot:      { c: 'amber',  d: '<circle class="fl" cx="12" cy="12" r="6"/>' },
    refresh:  { c: 'blue',   d: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>' },
    globe:    { c: 'teal',   d: '<circle class="fl" cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>' },
    bolt:     { c: 'amber',  d: '<path class="fl" d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>' },
    cloud:    { c: 'blue',   d: '<path class="fl" d="M7 18.5h10.5a4 4 0 0 0 .6-8A6 6 0 0 0 6.4 9.2 4.7 4.7 0 0 0 7 18.5z"/>' },
    outbox:   { c: 'blue',   d: '<path class="fl" d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M12 12.5v-9M8.5 7 12 3.5 15.5 7"/>' },
    grip:     { c: 'slate',  d: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>' },
};

function icon(name, color) {
    const g = ICON_GLYPHS[name];
    if (!g) return '';
    return `<span class="ico ico-${color || g.c}" aria-hidden="true"><svg viewBox="0 0 24 24">${g.d}</svg></span>`;
}

// เติม SVG ให้ <span class="ico" data-icon="..."> ที่เขียนไว้ตรง ๆ ใน index.html
function hydrateIcons(root = document) {
    root.querySelectorAll(".ico[data-icon]").forEach(el => {
        const g = ICON_GLYPHS[el.dataset.icon];
        if (!g) return;
        el.classList.add(`ico-${el.dataset.color || g.c}`);
        el.setAttribute("aria-hidden", "true");
        el.innerHTML = `<svg viewBox="0 0 24 24">${g.d}</svg>`;
        el.removeAttribute("data-icon");
    });
}
document.addEventListener("DOMContentLoaded", () => hydrateIcons());

// ==================== หน้าต่างยืนยัน/แจ้งเตือนของระบบ (แทน confirm/alert/prompt ของเบราว์เซอร์) ====================
// ใช้: if (!(await uiConfirm("ลบ...?"))) return;   uiAlert("กรุณากรอก...");   const pin = await uiPrompt("กรอก PIN", { inputType: "password" });
// - ข้อความที่มีคำว่า "ลบ" หรือ "ยกเลิกลิงก์" จะเป็นโหมดอันตรายอัตโนมัติ (ปุ่มแดง, โฟกัสที่ "ยกเลิก" ก่อนกันกด Enter พลาด)
// - Enter = ตกลง, Esc / คลิกพื้นหลัง = ยกเลิก; ข้อความแสดงผ่าน textContent (ไม่ตีความ HTML) และรองรับ \n
// - คืนค่าเป็น Promise เสมอ — ฟังก์ชันที่เรียก uiConfirm/uiPrompt ต้องเป็น async แล้ว await
// - card: แสดงข้อมูลของรายการที่กำลังจะลบ/แก้ไข { image, imageIcon, title, subtitle, rows: [[ป้าย, ค่า], ...], list: [...] }
//   (สร้างด้วย dialogCardForWorker/Customer/Job/... ด้านล่าง) — ทุกค่าใส่ผ่าน textContent/src ไม่ตีความ HTML
function showUiDialog({ kind, message, title, okText, cancelText, danger, inputType, placeholder, card, summary, wide }) {
    return new Promise(resolve => {
        const isDanger = danger ?? (kind === 'confirm' && /ลบ|ยกเลิกลิงก์/.test(message));
        const iconName = kind === 'alert' ? 'warn' : isDanger ? 'trash' : kind === 'prompt' ? 'lock' : 'clipboard';
        const iconColor = kind === 'alert' ? 'amber' : isDanger ? 'red' : 'blue';
        const backdrop = document.createElement('div');
        backdrop.className = 'ui-dialog-backdrop';
        backdrop.innerHTML = `
            <div class="ui-dialog${isDanger ? ' is-danger' : ''}${wide ? ' ui-dialog-wide' : ''}" role="${kind === 'alert' ? 'alertdialog' : 'dialog'}" aria-modal="true">
                <div class="ui-dialog-icon ui-dialog-icon-${iconColor}">${icon(iconName, iconColor)}</div>
                <h3 class="ui-dialog-title"></h3>
                <p class="ui-dialog-message"></p>
                ${card ? '<div class="ui-dialog-card"></div>' : ''}
                ${summary && summary.length ? '<div class="ui-dialog-summary"></div>' : ''}
                ${kind === 'prompt' ? `<input class="ui-dialog-input" type="${inputType || 'text'}" name="ui-dialog-${Date.now()}" autocomplete="${inputType === 'password' ? 'new-password' : 'off'}" data-lpignore="true" data-1p-ignore>` : ''}
                <div class="ui-dialog-actions">
                    <button type="button" class="btn ${isDanger ? 'btn-danger-solid' : 'btn-gold'} ui-dialog-ok"></button>
                    ${kind === 'alert' ? '' : '<button type="button" class="btn btn-outline ui-dialog-cancel"></button>'}
                </div>
            </div>`;
        backdrop.querySelector('.ui-dialog-title').textContent = title
            || (kind === 'alert' ? 'แจ้งเตือน' : kind === 'prompt' ? 'ยืนยันตัวตน' : isDanger ? 'ยืนยันการลบ' : 'ยืนยันการทำรายการ');
        // ตัดอีโมจินำหน้าข้อความเดิมทิ้ง — หน้าต่างมีไอคอนของตัวเองอยู่แล้ว
        backdrop.querySelector('.ui-dialog-message').textContent = String(message ?? '').replace(/^\s*(?:\p{Extended_Pictographic}️?\s*)+/u, '');
        if (card) fillUiDialogCard(backdrop.querySelector('.ui-dialog-card'), card);
        if (summary && summary.length) fillUiDialogSummary(backdrop.querySelector('.ui-dialog-summary'), summary, wide);
        const okBtn = backdrop.querySelector('.ui-dialog-ok');
        const cancelBtn = backdrop.querySelector('.ui-dialog-cancel');
        const input = backdrop.querySelector('.ui-dialog-input');
        okBtn.textContent = okText || (kind === 'alert' ? 'ตกลง' : isDanger ? 'ลบ' : 'ยืนยัน');
        if (cancelBtn) cancelBtn.textContent = cancelText || 'ยกเลิก';
        if (input && placeholder) input.placeholder = placeholder;

        const prevFocus = document.activeElement;
        const close = (result) => {
            document.removeEventListener('keydown', onKey, true);
            backdrop.remove();
            if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
            resolve(result);
        };
        const ok = () => close(kind === 'prompt' ? input.value : kind === 'confirm' ? true : undefined);
        const cancel = () => close(kind === 'prompt' ? null : kind === 'confirm' ? false : undefined);
        const onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
            else if (e.key === 'Enter' && document.activeElement !== cancelBtn) { e.preventDefault(); e.stopPropagation(); ok(); }
        };
        okBtn.addEventListener('click', ok);
        if (cancelBtn) cancelBtn.addEventListener('click', cancel);
        backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) cancel(); });
        document.addEventListener('keydown', onKey, true);

        document.body.appendChild(backdrop);
        (input || (isDanger && cancelBtn) || okBtn).focus();
        // ช่อง PIN: กัน Chrome เติมรหัสผ่านที่บันทึกไว้ (ของบัญชีล็อกอิน) ลงมาเอง — ล้างทิ้งถ้าถูกเติมก่อนผู้ใช้พิมพ์
        if (input && inputType === 'password') {
            let typed = false;
            input.addEventListener('input', (e) => { if (e.isTrusted && e.inputType) typed = true; });
            setTimeout(() => { if (!typed) input.value = ''; }, 300);
        }
    });
}

function fillUiDialogCard(box, card) {
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    const head = el('div', 'ui-dialog-card-head');
    if (card.image || card.imageIcon) {
        const pic = el('div', 'ui-dialog-card-pic');
        if (card.image) {
            const img = el('img');
            img.alt = '';
            img.src = card.image;
            img.onerror = () => { pic.innerHTML = icon(card.imageIcon || 'user', 'slate'); };
            pic.appendChild(img);
        } else {
            pic.innerHTML = icon(card.imageIcon, card.imageIconColor);
        }
        head.appendChild(pic);
    }
    const names = el('div', 'ui-dialog-card-names');
    if (card.title) names.appendChild(el('strong', null, card.title));
    if (card.subtitle) names.appendChild(el('small', null, card.subtitle));
    head.appendChild(names);
    box.appendChild(head);

    const rows = (card.rows || []).filter(([, v]) => v != null && String(v).trim() !== '' && v !== '-');
    if (rows.length) {
        const dl = el('dl', 'ui-dialog-card-rows');
        rows.forEach(([k, v]) => { dl.appendChild(el('dt', null, k)); dl.appendChild(el('dd', null, String(v))); });
        box.appendChild(dl);
    }
    if (card.list && card.list.length) {
        const max = 8;
        const ul = el('ul', 'ui-dialog-card-list');
        card.list.slice(0, max).forEach(item => ul.appendChild(el('li', null, item)));
        if (card.list.length > max) ul.appendChild(el('li', 'ui-dialog-card-more', `และอีก ${card.list.length - max} รายการ`));
        box.appendChild(ul);
    }
}

// ---- การ์ดข้อมูลสำหรับหน้าต่างยืนยัน (ใช้กับ uiConfirm(..., { card })) ----
// ข้อความคนงานบนบิล/ใบเสร็จ: ชื่อ + เลขประจำตัว 13 หลักเท่านั้น (ไม่ใส่สัญชาติ — ผู้ใช้ขอตัดออก 2026-10)
function invoiceWorkerLine(w) {
    return `${workerFullName(w)} เลขประจำตัว ${w.workerUid || '-'}`;
}

function workerFullName(w) {
    return `${w.title ? w.title + ' ' : ''}${w.firstName || ''} ${w.lastName || ''}`.trim() || '-';
}

function dialogCardForWorker(w) {
    if (!w) return null;
    const emp = customers.find(c => c.id === w.employerId);
    return {
        image: w.photo || '', imageIcon: 'user',
        title: workerFullName(w),
        subtitle: [w.nationality, w.gender ? `เพศ: ${w.gender}` : ''].filter(Boolean).join(' • '),
        rows: [
            ['เลขประจำตัวคนต่างด้าว', w.workerUid],
            ['เลขใบอนุญาตทำงาน', w.permitNo],
            ['เลขพาสปอร์ต', w.passportNo],
            ['นายจ้าง', emp ? emp.companyName : ''],
        ],
    };
}

function dialogCardForCustomer(c) {
    if (!c) return null;
    const workerCount = workers.filter(w => w.employerId === c.id).length;
    return {
        imageIcon: 'building', imageIconColor: 'teal',
        title: c.companyName || '-',
        subtitle: c.businessType || '',
        rows: [
            ...getEmployerIdParts(c).map(p => [p.label, p.value]),
            ['ผู้ประสานงาน', [c.coordinator, c.phone].filter(Boolean).join(' • ')],
            ['จำนวนคนงาน', `${workerCount} คน`],
        ],
    };
}

function dialogCardForJob(j) {
    if (!j) return null;
    const w = workers.find(x => x.id === j.workerId);
    const c = customers.find(x => x.id === j.customerId);
    return {
        image: w ? (w.photo || '') : '', imageIcon: w ? 'user' : 'clipboard',
        title: `${getJobDisplayNo(j)} • ${j.jobType || '-'}`,
        subtitle: j.status || '',
        rows: [
            ['คนงาน', w ? workerFullName(w) : ''],
            ['นายจ้าง', c ? c.companyName : ''],
            ['ค่าบริการ', j.fee ? `${Number(j.fee).toLocaleString()} บาท` : ''],
        ],
    };
}

function dialogCardForBank(b) {
    if (!b) return null;
    const meta = getBankMeta(b.bankName);
    return {
        image: meta.appIcon ? `assets/banks/${meta.appIcon}` : '', imageIcon: 'bank', imageIconColor: 'indigo',
        title: b.bankName || '-',
        subtitle: b.accountName || '',
        rows: [['เลขที่บัญชี', b.accountNumber], ['พร้อมเพย์', b.promptPayId]],
    };
}

function uiConfirm(message, opts = {}) { return showUiDialog({ ...opts, kind: 'confirm', message }); }
function uiAlert(message, opts = {}) { return showUiDialog({ ...opts, kind: 'alert', message }); }
function uiPrompt(message, opts = {}) { return showUiDialog({ ...opts, kind: 'prompt', message }); }

// ==================== ดับเบิลคลิกแถวตารางเพื่อเปิดข้อมูล (.clickable-row) ====================
// แถวนายจ้าง/คนงานเปิดรายละเอียดด้วยดับเบิลคลิก (คลิกเดียวไม่เปิด จะได้เลือก/คัดลอกข้อความในแถวได้)
// ใช้: ondblclick="handleRowDblClick(event) && openXxxModal(id)"
// - ดับเบิลคลิกโดนปุ่ม/ลิงก์/ช่องติ๊กในแถว → ไม่เปิด (ปุ่มพวกนั้นทำงานของมันเองอยู่แล้ว)
// - ล้างข้อความที่ถูกไฮไลต์จากการดับเบิลคลิกทิ้ง
function handleRowDblClick(event) {
    if (event.target.closest("button, a, input, select, textarea, label")) return false;
    window.getSelection()?.removeAllRanges();
    return true;
}

// ==================== ย่อ/ขยายเมนูข้างบนจอกว้าง (Collapsible Sidebar) ====================
// ย่อแล้วเหลือแต่ไอคอน (ดู .sidebar-collapsed ใน styles.css) จำค่าไว้ในเครื่องผ่าน localStorage
// ตอนย่อ ใส่ title ให้แต่ละเมนูเพื่อให้ชี้เมาส์แล้วเห็นชื่อเมนู
function applySidebarCollapsed(collapsed) {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;
    sidebar.classList.toggle("sidebar-collapsed", collapsed);

    sidebar.querySelectorAll(".menu-item, .btn-logout").forEach(el => {
        const label = el.querySelector("span:not(.menu-badge)")?.textContent.trim() || "";
        if (collapsed) el.setAttribute("title", label);
        else el.removeAttribute("title");
    });

    const btn = document.getElementById("sidebar-collapse-btn");
    if (btn) {
        btn.title = collapsed ? "ขยายเมนู" : "ย่อเมนู";
        btn.classList.toggle("is-collapsed", collapsed);
    }
}

function toggleSidebarCollapse() {
    const collapsed = !document.querySelector(".sidebar")?.classList.contains("sidebar-collapsed");
    applySidebarCollapsed(collapsed);
    try { localStorage.setItem("mw_sidebar_collapsed", collapsed ? "1" : "0"); } catch (e) { /* ไม่เป็นไร แค่จำค่าไม่ได้ */ }
}

document.addEventListener("DOMContentLoaded", () => {
    let saved = null;
    try { saved = localStorage.getItem("mw_sidebar_collapsed"); } catch (e) { /* ไม่เป็นไร ใช้ค่าเริ่มต้น (ขยาย) */ }
    if (saved === "1") applySidebarCollapsed(true);
    updateThemeToggleTitle();
});

// ==================== โหมดมืด (ธีม "มืดนุ่ม B — กรมท่าหม่น") ====================
// <html data-theme="dark"> + จำใน localStorage "mw_theme" — สคริปต์ใน <head> ของ index.html ตั้งค่าก่อนหน้าเว็บแสดง
// สีทั้งหมดอยู่ท้าย styles.css หัวข้อ DARK MODE
// ธีมชมพู ("ชมพู 1 — โรสอ่อน") ก็ใช้ data-theme="pink" แบบเดียวกัน — ปุ่มพระจันทร์เปิดเมนูเลือก สว่าง / ชมพู / มืด
const THEME_LABELS = { light: 'สว่าง (กรมท่า)', pink: 'ชมพู (โรสอ่อน)', dark: 'มืด (กรมท่าหม่น)' };

function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || 'light';
}

function updateThemeToggleTitle() {
    const btn = document.getElementById("theme-toggle-btn");
    if (btn) btn.title = `เลือกธีม — ตอนนี้: ${THEME_LABELS[currentTheme()]}`;
    document.querySelectorAll('#theme-menu [data-theme-option]').forEach(b => b.classList.toggle('is-active', b.dataset.themeOption === currentTheme()));
}

// ธีมผูกกับบัญชีผู้ใช้ (profiles.theme) — login เครื่องไหนก็ได้ธีมของตัวเอง
// localStorage "mw_theme" เป็นแค่ค่าล่าสุดของเครื่องนี้ ไว้ให้หน้าเว็บ/หน้า login ไม่สว่างแวบก่อนรู้ว่าใครใช้งาน
function applyThemeLocal(name) {
    if (name === 'dark' || name === 'pink') document.documentElement.setAttribute("data-theme", name);
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("mw_theme", name || 'light'); } catch (e) { /* ไม่เป็นไร แค่จำค่าไม่ได้ */ }
    updateThemeToggleTitle();
}

async function setTheme(name) {
    applyThemeLocal(name);
    closeThemeMenu();
    if (currentUser && currentUser.id && window.supabaseAdapter) {
        currentUser.theme = name;
        try { localStorage.setItem("mw_current_user", JSON.stringify(currentUser)); } catch (e) { /* ไม่เป็นไร */ }
        await callCloudAPI("setMyTheme", { theme: name });
    }
}

// หลัง login / โหลดข้อมูลใหม่: ใช้ธีมที่บันทึกไว้ในบัญชี — ถ้าบัญชียังไม่เคยเลือก ให้บันทึกธีมที่ใช้อยู่ในเครื่องนี้เป็นค่าเริ่มต้น
function syncThemeFromAccount(accountTheme) {
    if (!currentUser || !currentUser.id || !window.supabaseAdapter) return;
    if (accountTheme) {
        currentUser.theme = accountTheme;
        if (accountTheme !== currentTheme()) applyThemeLocal(accountTheme);
    } else if (!currentUser.themeSynced) {
        currentUser.themeSynced = true;
        currentUser.theme = currentTheme();
        callCloudAPI("setMyTheme", { theme: currentTheme() });
    }
}

function toggleThemeMenu() {
    const menu = document.getElementById("theme-menu");
    if (!menu) return;
    const open = menu.classList.toggle('hidden') === false;
    document.getElementById("theme-toggle-btn").setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) updateThemeToggleTitle();
}

function closeThemeMenu() {
    const menu = document.getElementById("theme-menu");
    if (menu) menu.classList.add('hidden');
    const btn = document.getElementById("theme-toggle-btn");
    if (btn) btn.setAttribute('aria-expanded', 'false');
}

// คลิกนอกเมนู / กด Esc → ปิดเมนูธีม
document.addEventListener('mousedown', (e) => {
    const picker = document.getElementById("theme-picker");
    if (picker && !picker.contains(e.target)) closeThemeMenu();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeThemeMenu(); });

// ถ้าหมุนจอ/ปรับขนาดหน้าต่างจนกว้างเกินเบรกพอยต์แล้ว ให้ล้างสถานะลิ้นชักทิ้ง กันเมนูค้างเปิดตอนสลับกลับเป็นจอกว้าง
window.addEventListener("resize", () => {
    if (window.innerWidth > 1024) closeMobileSidebar();
});

// ==================== RENEWALS VIEW (ข้อมูลคนงานต่ออายุ) ====================
// จัดกลุ่มคนงานอัตโนมัติตาม "วันหมดอายุใบอนุญาตทำงาน" ที่ตรงกันเป๊ะ ๆ:
//   - วันหมดอายุตรงกันตั้งแต่ 2 คนขึ้นไป = กลุ่มมติ/รอบลงทะเบียน (batch) ตั้งชื่อกลุ่มตามวันที่นั้นเลย
//     กลุ่มใหม่จะโผล่ขึ้นเองทุกครั้งที่เพิ่มปีใหม่ ไม่ต้องแก้โค้ด
//   - วันหมดอายุไม่ซ้ำกับใครเลย = เหมารวมไว้ในกลุ่ม MOU (แต่ละคนหมดอายุคนละวัน)
// รูปคนงานตอนยังไม่มีรูป — ไอคอนคนสีเทา เหมือนตารางหน้าข้อมูลคนงานต่างด้าว
const WORKER_AVATAR_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns=%22http:' + '/' + '/www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 width=%2232%22 height=%2232%22 fill=%22%2394a3b8%22><path d=%22M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 3.58-8 8v1h16v-1c0-4.42-3.58-8-8-8z%22/></svg>';

function renderRenewalGroups() {
    const container = document.getElementById("renewal-groups-container");
    if (!container) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const searchInput = document.getElementById("search-renewal");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const filterVal = id => (document.getElementById(id) || {}).value || "";
    const natFilter = filterVal("filter-renewal-nationality");
    const statusFilter = filterVal("filter-renewal-status");
    const bookFilter = filterVal("filter-renewal-book");
    const groupFilter = filterVal("filter-renewal-group");

    // จัดกลุ่มจากคนงาน "ทั้งหมด" ก่อน แล้วค่อยกรองภายในกลุ่ม — ไม่งั้นค้นหาจนเหลือคนเดียวในกลุ่มมติ ครม.
    // จะทำให้คนนั้นถูกย้ายไปอยู่กลุ่ม MOU ผิด ๆ (กลุ่มนิยามจาก "มีคนวันหมดอายุตรงกันตั้งแต่ 2 คน")
    const relevant = workers.filter(w => w.status !== 'archived' && w.status !== 'deleted' && w.permitExpiry);
    const matchesFilters = (w) => {
        if (natFilter && w.nationality !== natFilter) return false;
        if (statusFilter) {
            const d = daysLeftOf(w);
            const st = d === null ? '' : d < 0 ? 'expired' : d <= 60 ? 'warning' : 'normal';
            if (st !== statusFilter) return false;
        }
        if (bookFilter && (bookFilter === 'has') !== hasBook(w)) return false;
        if (!query) return true;
        const emp = customers.find(c => c.id === w.employerId);
        // ครอบคลุมเท่าช่องค้นหาหน้าคนงาน (renderWorkers) + ชื่อไทย/เลขอ้างอิง/เลขผู้เสียภาษีนายจ้าง
        const hay = [w.firstName, w.lastName, `${w.firstName || ''} ${w.lastName || ''}`, w.thaiName, w.refNo, w.workerUid,
            w.passportNo, w.permitNo, w.nationality, w.pinkCardNo, emp && emp.companyName, emp && emp.taxId]
            .filter(Boolean).join(' | ').toLowerCase();
        return hay.includes(query);
    };
    const anyFilter = !!(query || natFilter || statusFilter || bookFilter || groupFilter);

    const byDateKey = {};
    relevant.forEach(w => {
        const d = safeParseDate(w.permitExpiry);
        if (!d) return;
        const key = d.toISOString().split('T')[0];
        if (!byDateKey[key]) byDateKey[key] = { date: d, workers: [] };
        byDateKey[key].workers.push(w);
    });

    const batchGroups = [];
    const mouWorkers = [];
    Object.values(byDateKey).forEach(g => {
        if (g.workers.length >= 2) {
            batchGroups.push(g);
        } else {
            mouWorkers.push(...g.workers);
        }
    });
    batchGroups.sort((a, b) => a.date - b.date);
    mouWorkers.sort((a, b) => (safeParseDate(a.permitExpiry) || 0) - (safeParseDate(b.permitExpiry) || 0));

    function daysLeftOf(w) {
        const d = safeParseDate(w.permitExpiry);
        return d ? Math.ceil((d - today) / (1000 * 60 * 60 * 24)) : null;
    }

    function statusBadgeOf(daysDiff) {
        if (daysDiff === null) return '-';
        if (daysDiff < 0) return `<span class="badge badge-lg badge-danger">หมดอายุแล้ว</span>`;
        if (daysDiff <= 60) return `<span class="badge badge-lg badge-warning">ใกล้หมดอายุ</span>`;
        return `<span class="badge badge-lg badge-success">ปกติ</span>`;
    }

    function hasBook(w) {
        return !!(w.passportNo && w.passportNo.trim());
    }

    function bookBadgeOf(w) {
        return hasBook(w)
            ? `<span class="badge badge-success">มีเล่ม (${w.passportNo})</span>`
            : `<span class="badge badge-warning">ยังไม่มีเล่ม</span>`;
    }

    // วันหมดอายุเล่ม (พาสปอร์ต/CI) — สีตามเกณฑ์เดียวกับตารางคนงาน: ส้มเมื่อเหลือไม่ถึง 180 วัน, แดงเมื่อหมดแล้ว
    function bookExpiryOf(w) {
        const d = safeParseDate(w.passportExpiry);
        if (!d) return '<span class="text-muted">-</span>';
        const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
        const cls = diff < 0 ? 'text-danger' : (diff <= 180 ? 'text-warning' : '');
        return `<span class="${cls}">${formatThaiDate(d)}</span>`;
    }

    function buildGroupPanel(title, list) {
        const expiredCount = list.filter(w => { const d = daysLeftOf(w); return d !== null && d < 0; }).length;
        const warningCount = list.filter(w => { const d = daysLeftOf(w); return d !== null && d >= 0 && d <= 60; }).length;
        const noBookCount = list.filter(w => !hasBook(w)).length;

        const sortedList = [...list].sort((a, b) => {
            const empA = customers.find(c => c.id === a.employerId);
            const empB = customers.find(c => c.id === b.employerId);
            return (empA ? empA.companyName : '').localeCompare(empB ? empB.companyName : '', 'th');
        });

        const rows = sortedList.map(w => {
            const emp = customers.find(c => c.id === w.employerId);
            const daysDiff = daysLeftOf(w);
            return `
                <tr class="clickable-row" ondblclick="handleRowDblClick(event) && openWorkerModal('${w.id}')" title="ดับเบิลคลิกเพื่อดูรายละเอียดคนงาน">
                    <td>
                        <div><strong>${w.refNo || '-'}</strong></div>
                        <div class="worker-id-line"><span>เลขประจำตัวคนต่างด้าว</span> <b>${w.workerUid || '-'}</b></div>
                        <div class="worker-id-line"><span>เลขที่ใบอนุญาตทำงาน</span> <b>${w.permitNo || '-'}</b></div>
                    </td>
                    <td>
                        <!-- รูป + ชื่อ แบบเดียวกับตารางหน้าข้อมูลคนงานต่างด้าว (renderWorkers) -->
                        <div class="renewal-worker-cell">
                            <div class="renewal-avatar"><img src="${w.photo ? escapeHtml(w.photo) : WORKER_AVATAR_PLACEHOLDER}" alt="" loading="lazy"></div>
                            <div>
                                <strong>${w.title ? w.title + ' ' : ''}${w.firstName || '-'} ${w.lastName || ''}</strong>
                                ${w.thaiName ? `<div><small class="text-muted">ชื่อไทย (บัตรชมพู): ${w.thaiName}</small></div>` : ''}
                                <div><small class="text-muted">เพศ: ${w.gender || '-'}</small></div>
                            </div>
                        </div>
                    </td>
                    <td>${w.nationality || '-'}</td>
                    <td>${emp ? emp.companyName : '-'}</td>
                    <td>${formatThaiDate(w.permitExpiry)}</td>
                    <td>${statusBadgeOf(daysDiff)}</td>
                    <td>${bookBadgeOf(w)}</td>
                    <td>${bookExpiryOf(w)}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="dashboard-panel" style="flex: 1; margin-bottom: 20px;">
                <div class="panel-header">
                    <h3 style="margin:0;">${title}</h3>
                    <span style="font-size: 13px; color: #64748b;">
                        ทั้งหมด ${list.length} คน • ${icon("warn")} ใกล้หมดอายุ ${warningCount} • ${icon("bad")} หมดอายุแล้ว ${expiredCount} • ${icon("book")} ยังไม่มีเล่ม ${noBookCount}
                    </span>
                </div>
                <div class="panel-content" style="padding: 0; overflow-x: auto;">
                    <!-- แต่ละกลุ่มเป็นตารางแยกกัน — ล็อกความกว้างคอลัมน์ (.renewal-table) ให้ทุกกลุ่มตรงกัน -->
                    <table class="data-table renewal-table" style="box-shadow: none; border: none; border-radius: 0;">
                        <colgroup>
                            <col class="rc-id"><col class="rc-name"><col class="rc-nat"><col class="rc-emp">
                            <col class="rc-exp"><col class="rc-status"><col class="rc-book"><col class="rc-bookexp">
                        </colgroup>
                        <thead>
                            <tr>
                                <th>เลขคนงาน</th><th>ชื่อ-นามสกุล</th><th>สัญชาติ</th><th>นายจ้าง</th>
                                <th>วันหมดอายุ</th><th>สถานะ</th><th>เล่ม (พาสปอร์ต)</th><th>วันหมดอายุเล่ม</th>
                            </tr>
                        </thead>
                        <tbody>${rows || `<tr><td colspan="8" style="text-align:center; padding: 16px;">ไม่มีข้อมูล</td></tr>`}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    let html = '';
    let shownCount = 0;
    if (groupFilter !== 'mou') {
        batchGroups.forEach(g => {
            const list = g.workers.filter(matchesFilters);
            if (list.length === 0) return;
            shownCount += list.length;
            html += buildGroupPanel(`มติ ครม. ต่ออายุ (ใบอนุญาตหมดอายุ ${formatThaiDate(g.date)})`, list);
        });
    }
    if (groupFilter !== 'batch') {
        const list = mouWorkers.filter(matchesFilters);
        if (list.length > 0) {
            shownCount += list.length;
            html += buildGroupPanel('กลุ่ม MOU', list);
        }
    }

    const summaryEl = document.getElementById("renewal-filter-summary");
    const clearBtn = document.getElementById("btn-clear-renewal-filters");
    if (summaryEl) {
        summaryEl.classList.toggle("hidden", !anyFilter);
        summaryEl.textContent = anyFilter ? `พบ ${shownCount} คน จากทั้งหมด ${relevant.length} คน` : '';
    }
    if (clearBtn) clearBtn.classList.toggle("hidden", !anyFilter);

    container.innerHTML = html || `<p class="text-muted" style="text-align:center; padding: 30px;">${anyFilter ? 'ไม่พบคนงานตามตัวกรองที่เลือก' : 'ไม่มีข้อมูลคนงานที่ต้องต่ออายุ'}</p>`;
}

// เติมรายชื่อนายจ้างในตัวกรองหน้าต่ออายุ (เฉพาะนายจ้างที่มีคนงานในหน้านี้) — คงค่าที่เลือกไว้
function clearRenewalFilters() {
    ["search-renewal", "filter-renewal-nationality", "filter-renewal-status", "filter-renewal-book", "filter-renewal-group"]
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    renderRenewalGroups();
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
                    message: `คนงาน: ${w.firstName} ${w.lastName} (${w.nationality}) หมดอายุเมื่อ ${formatThaiDate(expPassDate)}`,
                    target: w,
                    empName: empName,
                    daysLeft: daysDiff
                });
            } else if (daysDiff <= 180) {
                alerts.push({
                    type: 'warning',
                    title: `พาสปอร์ตใกล้หมดอายุ (ภายใน 180 วัน)`,
                    message: `คนงาน: ${w.firstName} ${w.lastName} (${w.nationality}) จะหมดอายุวันที่ ${formatThaiDate(expPassDate)}`,
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
                    message: `คนงาน: ${w.firstName} ${w.lastName} (${w.nationality}) หมดอายุเมื่อ ${formatThaiDate(expPermitDate)}`,
                    target: w,
                    empName: empName,
                    daysLeft: daysDiff
                });
            } else if (daysDiff <= 60) {
                alerts.push({
                    type: 'warning',
                    title: `ใบอนุญาตทำงานใกล้หมดอายุ (ภายใน 60 วัน)`,
                    message: `คนงาน: ${w.firstName} ${w.lastName} (${w.nationality}) จะหมดอายุวันที่ ${formatThaiDate(expPermitDate)}`,
                    target: w,
                    empName: empName,
                    daysLeft: daysDiff
                });
            }
        }
    });

    // 3. Company Certificate Expiry Check (หนังสือรับรองบริษัท — อายุการใช้งานที่กำหนดเอง 6 เดือน, เตือนล่วงหน้า 30 วัน)
    customers.forEach(c => {
        const certExpDate = safeParseDate(c.certExpiry);
        if (!certExpDate) return;
        certExpDate.setHours(0,0,0,0);
        const daysDiff = Math.ceil((certExpDate - today) / (1000 * 60 * 60 * 24));

        if (daysDiff < 0) {
            alerts.push({
                type: 'danger',
                title: `หนังสือรับรองบริษัทหมดอายุแล้ว (Expired)`,
                message: `นายจ้าง: ${c.companyName} หมดอายุเมื่อ ${formatThaiDate(certExpDate)}`,
                target: c,
                empName: c.companyName,
                daysLeft: daysDiff
            });
        } else if (daysDiff <= 30) {
            alerts.push({
                type: 'warning',
                title: `หนังสือรับรองบริษัทใกล้หมดอายุ (ภายใน 30 วัน)`,
                message: `นายจ้าง: ${c.companyName} จะหมดอายุวันที่ ${formatThaiDate(certExpDate)}`,
                target: c,
                empName: c.companyName,
                daysLeft: daysDiff
            });
        }
    });

    return alerts;
}

const PIE_CHART_PALETTE = ['#d4af37', '#1e3a5f', '#16a34a', '#dc2626', '#7c3aed', '#0891b2', '#ea580c', '#64748b', '#db2777', '#65a30d'];

// วาดกราฟวงกลม (SVG โดนัท) ทั่วไป — รับ entries = [{name, value, color?}] ไม่ใช้ไลบรารีภายนอก
// ใช้ร่วมกันทั้งกราฟรายรับแยกประเภทงาน, แยกลูกค้า, และแยกบัญชีธนาคาร
function renderPieChartInto(containerId, entries, opts = {}) {
    const unit = opts.unit || 'บ.'; // หน่วยในคำอธิบายสี (เงิน = บ., คนงาน = คน, งาน = งาน)
    const container = document.getElementById(containerId);
    if (!container) return;

    const sorted = (entries || []).filter(e => e.value > 0).sort((a, b) => b.value - a.value);
    const total = sorted.reduce((sum, e) => sum + e.value, 0);

    if (sorted.length === 0 || total <= 0) {
        container.innerHTML = `<p class="text-muted" style="text-align:center; padding: 25px;">${icon("bad")} ${opts.emptyText || 'ไม่มีข้อมูลรายรับสำหรับแสดงกราฟ'}</p>`;
        return;
    }

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let offsetAcc = 0;

    const circles = sorted.map((e, idx) => {
        const color = e.color || PIE_CHART_PALETTE[idx % PIE_CHART_PALETTE.length];
        const fraction = e.value / total;
        const dash = fraction * circumference;
        const gap = circumference - dash;
        const circle = `<circle r="${radius}" cx="100" cy="100" fill="transparent" stroke="${color}" stroke-width="36" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offsetAcc}"></circle>`;
        offsetAcc += dash;
        return circle;
    }).join('');

    const legend = sorted.map((e, idx) => {
        const color = e.color || PIE_CHART_PALETTE[idx % PIE_CHART_PALETTE.length];
        const pct = ((e.value / total) * 100).toFixed(1);
        return `
            <div style="display:flex; align-items:center; gap:6px; font-size:12.5px; margin-bottom:6px;">
                <span style="width:12px; height:12px; border-radius:3px; background:${color}; display:inline-block; flex-shrink:0;"></span>
                <span>${e.name} — ${e.value.toLocaleString('th-TH')} ${unit} (${pct}%)</span>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <svg class="pie-chart" viewBox="0 0 200 200" width="220" height="220" style="transform: rotate(-90deg); flex-shrink: 0;">
            ${circles}
        </svg>
        <div>${legend}</div>
    `;
}

// สลับมุมมองแดชบอร์ดระหว่างตาราง/การ์ดเดิมกับกราฟวงกลม — ใช้ร่วมกันได้ทุกแผงในแท็บการเงิน
// โดยยึด id ตามรูปแบบ db-finance-{prefix}-table-wrap / -chart-wrap และ btn-{prefix}-view-table / -chart
function toggleChartView(prefix, mode) {
    // หน้าการเงินใช้ db-finance-{prefix}-… ส่วนแดชบอร์ดใช้ db-{prefix}-… (สัญชาติ/จังหวัด)
    const tableWrap = document.getElementById(`db-finance-${prefix}-table-wrap`) || document.getElementById(`db-${prefix}-table-wrap`);
    const chartWrap = document.getElementById(`db-finance-${prefix}-chart-wrap`) || document.getElementById(`db-${prefix}-chart-wrap`);
    const btnTable = document.getElementById(`btn-${prefix}-view-table`);
    const btnChart = document.getElementById(`btn-${prefix}-view-chart`);
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

// ==================== กระดิ่งแจ้งเตือนตามตำแหน่ง (มุมขวาบน) ====================
// แต่ละตำแหน่งเห็นไม่เหมือนกัน (ยืนยันกับเจ้าของระบบ 2026-10-02):
//   Admin/GM          → ทุกหมวด
//   Account Manager   → เรื่องบิลและการเงินทั้งหมด
//   Operation Manager → การแจ้งงาน/ปิดงานทั้งหมด + เอกสารคนงานใกล้หมดอายุ
//   Staff             → งานที่ตัวเองเปิด/ได้รับมอบหมาย
//   เอกสารคนงานที่ "ยังไม่ได้แนบ" ไม่แจ้งเตือนใคร
const BELL_RECENT_CLOSE_DAYS = 3;
const BELL_OVERDUE_DAYS = 15;   // ตรงกับกำหนดชำระมาตรฐานบนบิล
const BELL_MAX_ITEMS = 6;

// บิลที่ยังค้างชำระและออกมาเกินกำหนดชำระมาตรฐานแล้ว (นิยามเดียวกับหมวด "บิลค้างชำระเกิน 15 วัน" ในกระดิ่ง) — ใช้ในแคปซูลแดชบอร์ด/สรุปการเงิน
function overdueInvoices() {
    return invoices.filter(i => (i.status === 'issued' || i.status === 'partial') && invoiceBalance(i) > 0 && daysSince(i.issueDate) > BELL_OVERDUE_DAYS);
}

function bellJobItem(j, sub) {
    const cust = customers.find(c => c.id === j.customerId);
    const w = workers.find(x => x.id === j.workerId);
    return {
        text: `${getJobDisplayNo(j)} • ${getCleanJobTypeName(j.jobType)}`,
        sub: sub || `${cust ? cust.companyName : '-'} • ${w ? `${w.firstName} ${w.lastName}` : '-'}`,
        action: `openJobModal('${j.id}')`
    };
}

function bellInvoiceItem(inv, sub) {
    return { text: `${inv.invoiceNo} • ${inv.customerName || '-'}`, sub, action: `openStoredInvoice('${inv.id}')` };
}

function daysSince(dateStr) {
    const d = safeParseDate(dateStr);
    if (!d) return 0;
    const today = new Date(); today.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
    return Math.floor((today - d) / 86400000);
}

function buildNotificationGroups() {
    if (!currentUser) return [];
    const role = currentUser.role;
    const groups = [];
    const add = (g) => { if (g.items.length) groups.push(g); };
    const today = localDateISO(new Date());
    const tomorrow = localDateISO(new Date(Date.now() + 86400000));
    const jobDate = j => String(j.appointmentDate || '').slice(0, 10);
    const sortNewest = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

    // ---------- งาน (Admin, Operation Manager = ทุกงาน / Staff = เฉพาะงานของตัวเอง) ----------
    const opsAll = role === 'admin' || role === 'operation_manager';
    const mine = j => j.assignedTo === currentUser.id || (!j.assignedTo && j.openedBy === currentUser.id);
    const scope = opsAll ? jobs : role === 'staff' ? jobs.filter(mine) : [];
    if (scope.length) {
        if (opsAll) {
            add({ key: 'unassigned', icon: 'users', title: 'งานแจ้งใหม่ ยังไม่มอบหมายผู้รับผิดชอบ', view: 'jobs',
                items: scope.filter(j => isJobStatusOpen(j.status) && !j.assignedTo).sort(sortNewest).map(j => bellJobItem(j)) });
            add({ key: 'new', icon: 'inbox', title: 'งานแจ้งใหม่ (รอดำเนินการ)', view: 'jobs',
                items: scope.filter(j => j.status === 'รอดำเนินการ').sort(sortNewest).map(j => bellJobItem(j)) });
        }
        // Operation Manager ทำงานแบบ Staff ได้ด้วย — เห็น "งานของฉัน" เหมือน Staff
        if (role !== 'admin') {
            add({ key: 'mine', icon: 'clipboard', title: 'งานของฉันที่ยังไม่ปิด', view: 'jobs',
                items: scope.filter(j => isJobStatusOpen(j.status) && mine(j)).sort(sortNewest).map(j => bellJobItem(j, `${j.status} • ${(customers.find(c => c.id === j.customerId) || {}).companyName || '-'}`)) });
        }
        add({ key: 'appt', icon: 'calendar', title: 'นัดหมายวันนี้ / พรุ่งนี้', view: 'jobs',
            items: scope.filter(j => isJobStatusOpen(j.status) && [today, tomorrow].includes(jobDate(j)))
                .sort((a, b) => jobDate(a).localeCompare(jobDate(b)))
                .map(j => bellJobItem(j, `${jobDate(j) === today ? 'วันนี้' : 'พรุ่งนี้'}${j.appointmentTime ? ` ${j.appointmentTime}` : ''}${j.appointmentLocation ? ` • ${j.appointmentLocation}` : ''}`)) });
        add({ key: 'docs', icon: 'clip', title: 'งานรอเอกสารเพิ่มเติม', view: 'jobs',
            items: scope.filter(j => j.status === 'รอเอกสารเพิ่มเติม').sort(sortNewest).map(j => bellJobItem(j)) });
        add({ key: 'closed', icon: 'ok', title: `ปิดงานแล้ว (${BELL_RECENT_CLOSE_DAYS} วันล่าสุด)`, view: 'jobs', info: true,
            items: scope.filter(j => j.status === 'ปิดงานแล้ว' && j.closedAt && daysSince(j.closedAt) <= BELL_RECENT_CLOSE_DAYS)
                .sort((a, b) => String(b.closedAt).localeCompare(String(a.closedAt)))
                .map(j => bellJobItem(j, `ปิดเมื่อ ${formatThaiDate(j.closedAt, true)}${j.closedBy ? ` โดย ${getUserNameById(j.closedBy)}` : ''}`)) });
    }

    // ---------- เอกสารคนงานใกล้หมดอายุ / หมดอายุ (Admin, Operation Manager) — ไม่รวม "ยังไม่ได้แนบเอกสาร" ----------
    if (opsAll) {
        add({ key: 'expiry', icon: 'warn', title: 'เอกสารคนงานใกล้หมดอายุ / หมดอายุแล้ว', view: 'renewals',
            items: calculateDeadlines().sort((a, b) => a.daysLeft - b.daysLeft).map(a => ({
                text: a.title, sub: `${a.message.replace(/^คนงาน: /, '')} • ${a.empName}`,
                action: a.target && a.target.id ? `openWorkerModal('${a.target.id}')` : `switchView('renewals')`
            })) });
    }

    // ---------- บิลและการเงิน (Admin, Account Manager) ----------
    if (can('finance')) {
        const unbilledClosed = jobs.filter(j => j.status === 'ปิดงานแล้ว' && jobAwaitingBill(j));
        add({ key: 'unbilled', icon: 'receipt', title: 'ปิดงานแล้ว ยังไม่ออกบิล', view: 'billing',
            items: unbilledClosed.map(j => ({ ...bellJobItem(j), action: `openInvoiceModal('${j.id}')` })) });
        const prepay = jobs.filter(j => isJobStatusOpen(j.status) && !isJobPaid(j) && !isJobNoCharge(j) && (customers.find(c => c.id === j.customerId) || {}).requirePrepayment);
        add({ key: 'prepay', icon: 'lock', title: 'ลูกค้าต้องชำระก่อนเริ่มงาน (ยังไม่ได้รับเงิน)', view: 'billing',
            items: prepay.map(j => ({ ...bellJobItem(j, `${j.paymentStatus || 'ยังไม่ออกบิล'} • ${(customers.find(c => c.id === j.customerId) || {}).companyName || '-'}`),
                action: getJobInvoice(j) ? `openStoredInvoice('${getJobInvoice(j).id}')` : `openInvoiceModal('${j.id}')` })) });
        const open = invoices.filter(i => (i.status === 'issued' || i.status === 'partial') && invoiceBalance(i) > 0);
        add({ key: 'overdue', icon: 'hourglass', title: `บิลค้างชำระเกิน ${BELL_OVERDUE_DAYS} วัน`, view: 'billing',
            items: open.filter(i => daysSince(i.issueDate) > BELL_OVERDUE_DAYS).sort((a, b) => daysSince(b.issueDate) - daysSince(a.issueDate))
                .map(i => bellInvoiceItem(i, `ค้าง ${fmtMoney(invoiceBalance(i))} บาท • ${daysSince(i.issueDate)} วัน`)) });
        add({ key: 'awaiting', icon: 'receipt', title: 'บิลรอชำระ (ยังไม่เกินกำหนด)', view: 'billing', info: true,
            items: open.filter(i => daysSince(i.issueDate) <= BELL_OVERDUE_DAYS).sort((a, b) => daysSince(b.issueDate) - daysSince(a.issueDate))
                .map(i => bellInvoiceItem(i, `${i.status === 'partial' ? 'ชำระบางส่วน • ' : ''}ค้าง ${fmtMoney(invoiceBalance(i))} บาท • ครบกำหนดอีก ${BELL_OVERDUE_DAYS - daysSince(i.issueDate)} วัน`)) });
        add({ key: 'deposit', icon: 'cash', title: 'มัดจำ / เงินรับล่วงหน้า ยังไม่ได้หักบิล', view: 'billing', info: true,
            items: receipts.filter(r => receiptUnapplied(r) > 0).map(r => ({
                text: `${r.receiptNo || '-'} • ${r.customerName || '-'}`, sub: `คงเหลือ ${fmtMoney(receiptUnapplied(r))} บาท • รับเมื่อ ${formatThaiDate(r.paidDate)}`,
                action: `openReceiptDoc('${r.id}')` })) });
    }
    if (can('commission')) {
        add({ key: 'commission', icon: 'users', title: 'ค่าคอม Agent ถึงกำหนดจ่าย', view: 'agents',
            items: agents.map(a => ({ a, s: agentCommissionSummary(a.id) })).filter(x => x.s.due > 0)
                .map(x => ({ text: x.a.name, sub: `${fmtMoney(x.s.due)} บาท • ${x.s.dueCount} งาน`, action: `openCommissionPayoutModal('${x.a.id}')` })) });
    }
    return groups;
}

// ตัวเลขบนกระดิ่ง = รายการที่ต้องทำ (ไม่นับหมวดข้อมูลอ้างอิง เช่น ปิดงานล่าสุด/บิลที่ยังไม่ถึงกำหนด/มัดจำ)
function updateNotificationBell() {
    const groups = buildNotificationGroups();
    const count = groups.filter(g => !g.info).reduce((s, g) => s + g.items.length, 0);
    const bellBadge = document.getElementById("bell-alert-badge");
    const navBadge = document.getElementById("nav-alert-badge");
    if (bellBadge) { bellBadge.innerText = count > 99 ? '99+' : count; bellBadge.style.display = count > 0 ? 'flex' : 'none'; }
    if (navBadge) { navBadge.innerText = count > 99 ? '99+' : count; navBadge.style.display = count > 0 ? 'inline-block' : 'none'; }
    const panel = document.getElementById("bell-panel");
    if (panel && !panel.classList.contains('hidden')) renderNotificationPanel(groups);
}

function renderNotificationPanel(groups = buildNotificationGroups()) {
    const panel = document.getElementById("bell-panel");
    if (!panel || !currentUser) return;
    const roleName = (ROLE_LABELS[currentUser.role] || '').split(' (')[0];
    panel.innerHTML = `
        <div class="bell-panel-head"><strong>การแจ้งเตือน</strong><span>${escapeHtml(roleName)}</span></div>
        ${groups.length === 0 ? `<div class="bell-empty">${icon('ok')} ไม่มีเรื่องที่ต้องติดตาม</div>` : groups.map(g => `
            <div class="bell-group${g.info ? ' is-info' : ''}">
                <button type="button" class="bell-group-head" onclick="closeNotificationPanel(); ${g.view === 'billing' ? "switchView('expenses'); switchFinancePageTab('billing')" : `switchView('${g.view}')`}">
                    ${icon(g.icon)} <span>${escapeHtml(g.title)}</span><b>${g.items.length}</b>
                </button>
                ${g.items.slice(0, BELL_MAX_ITEMS).map(it => `
                    <button type="button" class="bell-item" onclick="closeNotificationPanel(); ${it.action}">
                        <span class="bell-item-text">${escapeHtml(it.text)}</span>
                        <small>${escapeHtml(it.sub || '')}</small>
                    </button>`).join('')}
                ${g.items.length > BELL_MAX_ITEMS ? `<div class="bell-more">และอีก ${g.items.length - BELL_MAX_ITEMS} รายการ — กดหัวข้อเพื่อดูทั้งหมด</div>` : ''}
            </div>`).join('')}`;
}

function toggleNotificationPanel() {
    const panel = document.getElementById("bell-panel");
    if (!panel) return;
    const open = panel.classList.toggle('hidden') === false;
    if (open) { closeThemeMenu(); updateNotificationBell(); } // คำนวณตัวเลขและรายการใหม่พร้อมกัน ให้ตรงกันเสมอ
}

function closeNotificationPanel() {
    const panel = document.getElementById("bell-panel");
    if (panel) panel.classList.add('hidden');
}

document.addEventListener('mousedown', (e) => {
    const wrap = document.getElementById("bell-wrap");
    if (wrap && !wrap.contains(e.target)) closeNotificationPanel();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNotificationPanel(); });

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

    // แคปซูลเพิ่ม: งานที่ยังไม่ปิด + บิลค้างเกินกำหนด (แคปซูลบิลซ่อนจากคนที่ไม่มีสิทธิ์การเงินด้วย needs-finance)
    const openJobsEl = document.getElementById("stat-open-jobs");
    if (openJobsEl) openJobsEl.innerText = jobs.filter(j => JOB_OPEN_STATUSES.includes(j.status)).length;
    const overdueEl = document.getElementById("stat-overdue-invoices");
    if (overdueEl) overdueEl.innerText = overdueInvoices().length;

    // กระดิ่ง + ตัวเลขที่เมนูแดชบอร์ด: แยกตามตำแหน่ง (ดู buildNotificationGroups)
    updateNotificationBell();

    // Default Tab
    switchDashboardTab('overview');
}

function switchDashboardTab(tabName) {
    const tabs = ['overview', 'monthly', 'completed'];
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
    } else if (tabName === 'completed') {
        renderCompletedJobsStats();
    }
}

function switchFinancePageTab(tabName) {
    writeSessionValue('mw_last_fin_tab', tabName);
    const tabs = ['overview', 'billing', 'expenses', 'banks', 'prices'];
    tabs.forEach(t => {
        const pane = document.getElementById(`finpage-tab-${t}`);
        const btn = document.getElementById(`btn-finpage-tab-${t}`);
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
        renderFinanceStats();
    } else if (tabName === 'billing') {
        renderBillingTab();
    } else if (tabName === 'expenses') {
        renderExpenses();
    } else if (tabName === 'prices') {
        renderServicePrices();
    } else if (tabName === 'banks') {
        renderBanks();
    }
}

// badge สถานะการเงิน ใช้ร่วมกันทั้งบิลที่ผูกใบงานจริง (jobs) และบิลอิสระ (freeInvoices) ในตาราง "ออกบิล/รับเงิน"
function buildFinancePaymentBadge(paymentStatus, paymentMethod, isClosedUnpaid) {
    let badge = `<span class="badge badge-warning" style="font-size: 11.5px; padding: 2px 6px;">${icon("hourglass")} ยังไม่ออกบิล</span>`;
    if (paymentStatus === JOB_NO_CHARGE) {
        badge = `<span class="badge badge-nocharge">${icon("ok")} ไม่เรียกเก็บเงิน</span>`;
    } else if (isClosedUnpaid && paymentStatus === 'ยังไม่ออกบิล') {
        badge = `<span class="badge badge-danger" style="font-size: 11.5px; padding: 2px 6px;">${icon("warn")} ยังไม่ออกบิล/ยังไม่ชำระ</span>`;
    } else if (isClosedUnpaid && paymentStatus === 'ออกบิลแล้ว') {
        badge = `<span class="badge badge-danger" style="font-size: 11.5px; padding: 2px 6px;">${icon("warn")} ออกบิลแล้ว รอชำระ</span>`;
    } else if (paymentStatus === 'ออกบิลแล้ว') {
        badge = `<span class="badge" style="font-size: 11.5px; padding: 2px 6px; background-color: #3b82f6; color: white;">${icon("receipt")} ออกบิลแล้ว</span>`;
    } else if (paymentStatus === 'ชำระเงินแล้ว') {
        badge = `<span class="badge badge-success" style="font-size: 11.5px; padding: 2px 6px;">${icon("ok")} ชำระเงินแล้ว${paymentMethod ? ` (${paymentMethod})` : ''}</span>`;
    }
    return badge;
}

// แท็บ "ออกบิล / รับเงิน" — 2 ส่วนในตารางเดียว:
//   1) ใบงานที่ยังไม่ออกบิล (ไม่มีบิลที่ใช้งานอยู่) → ปุ่ม "ออกบิล" เปิดร่างบิล
//   2) บิลที่ออกแล้วทุกใบ (invoices) พร้อมยอดรับแล้ว/คงเหลือ → ปุ่ม "เปิดบิล" (รับเงิน/พิมพ์/ใบเสร็จ/ยกเลิก)
function renderBillingTab() {
    const searchInput = document.getElementById("search-billing");
    const squash = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); // ช่องว่างซ้อนในชื่อไม่มีผลกับการค้นหา
    const query = squash(searchInput ? searchInput.value : "");
    const statusFilterEl = document.getElementById("filter-billing-payment-status");
    const statusFilter = statusFilterEl ? statusFilterEl.value : "pending";
    const tbody = document.getElementById("billing-list-tbody");
    if (!tbody) return;
    renderBillingCreditPanel();
    const receiveBtn = document.getElementById("btn-receive-money");
    if (receiveBtn) receiveBtn.classList.toggle('hidden', !can('finance'));

    // ตัวเลือก "บิลที่ยกเลิก" เห็นเฉพาะ Admin (ไว้ลบทิ้ง) — ตำแหน่งอื่นไม่เห็นบิลที่ยกเลิกเลย
    const voidOpt = statusFilterEl && statusFilterEl.querySelector('option[value="void"]');
    if (voidOpt) voidOpt.hidden = voidOpt.disabled = currentUser.role !== 'admin';

    const showUnbilled = ['pending', 'unbilled', 'all'].includes(statusFilter);
    const invoiceStatuses = {
        pending: ['issued', 'partial'], unbilled: [], outstanding: ['issued', 'partial'], overdue: ['issued', 'partial'],
        // บิลที่ยกเลิกไม่แสดงที่ไหน (รวม "ทั้งหมด") — ยกเว้นตัวกรอง "บิลที่ยกเลิก" ของ Admin ไว้ลบทิ้ง (deleteVoidInvoice)
        paid: ['paid'], void: currentUser.role === 'admin' ? ['void'] : [], nocharge: [], all: ['issued', 'partial', 'paid']
    }[statusFilter] || ['issued', 'partial'];

    const matchesJobQuery = j => {
        if (!query) return true;
        const cust = customers.find(c => c.id === j.customerId);
        const work = workers.find(w => w.id === j.workerId);
        const hay = squash([getJobDisplayNo(j), j.jobType, cust && cust.companyName, work && `${work.firstName} ${work.lastName || ''}`, work && work.workerUid, j.noChargeReason]
            .filter(Boolean).join(' | '));
        return hay.includes(query);
    };
    const unbilledJobs = !showUnbilled ? [] : jobs.filter(jobAwaitingBill).filter(matchesJobQuery);
    const noChargeJobs = !['nocharge', 'all'].includes(statusFilter) ? [] : jobs.filter(isJobNoCharge).filter(matchesJobQuery)
        .sort((a, b) => String(b.noChargeAt || '').localeCompare(String(a.noChargeAt || '')));

    const overdueIds = statusFilter === 'overdue' ? new Set(overdueInvoices().map(i => i.id)) : null; // ค้างเกินกำหนด (นิยามเดียวกับกระดิ่ง)
    const shownInvoices = invoices.filter(inv => invoiceStatuses.includes(inv.status) && (!overdueIds || overdueIds.has(inv.id))).filter(inv => {
        if (!query) return true;
        const jobWorkers = (inv.jobIds || []).map(id => jobs.find(j => j.id === id)).filter(Boolean)
            .map(j => workers.find(w => w.id === j.workerId)).filter(Boolean).map(w => `${w.firstName} ${w.lastName}`);
        const hay = squash([inv.invoiceNo, inv.customerName, inv.workerName, ...jobWorkers, ...(inv.items || []).map(i => i.title)]
            .filter(Boolean).join(' | '));
        return hay.includes(query);
    }).sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || '') || (b.invoiceNo || '').localeCompare(a.invoiceNo || ''));

    if (unbilledJobs.length === 0 && shownInvoices.length === 0 && noChargeJobs.length === 0) {
        const emptyMsg = statusFilter === 'pending' ? `${icon("ok")} ไม่มีงานที่ค้างออกบิลหรือค้างรับเงิน` : `${icon("search")} ไม่พบรายการ`;
        tbody.innerHTML = `<tr><td colspan="8" class="text-muted" style="text-align: center; padding: 40px;">${emptyMsg}</td></tr>`;
        return;
    }

    const kindLabel = { job: 'บิลใบงาน', combined: 'บิลรวม', free: 'บิลอิสระ' };
    const invoiceRows = shownInvoices.map(inv => {
        const meta = INVOICE_STATUS_META[inv.status] || INVOICE_STATUS_META.issued;
        const paid = invoicePaidAmount(inv);
        const balance = invoiceBalance(inv);
        const jobCount = (inv.jobIds || []).length;
        const detail = inv.kind === 'free'
            ? (inv.workerName || (inv.items || [])[0]?.title || '-')
            : `${jobCount} ใบงาน • ${(inv.items || []).map(i => i.serviceName || i.title).filter(Boolean).slice(0, 2).join(', ')}${(inv.items || []).length > 2 ? '…' : ''}`;
        const days = inv.status === 'issued' || inv.status === 'partial'
            ? Math.max(0, Math.floor((new Date() - (safeParseDate(inv.issueDate) || new Date())) / 86400000)) : null;
        return `
            <tr class="${inv.status === 'void' ? 'is-voided-row' : ''}">
                <td><strong>${escapeHtml(inv.invoiceNo)}</strong><div class="employer-id-line"><span>ออกเมื่อ</span> <b>${formatThaiDate(inv.issueDate)}</b></div></td>
                <td><span class="badge badge-gold">${icon("receipt")} ${kindLabel[inv.kind] || 'บิล'}</span></td>
                <td><div class="employer-name">${escapeHtml(inv.customerName || '-')}</div></td>
                <td>${escapeHtml(detail)}</td>
                <td class="inv-num"><strong>${fmtMoney(inv.grandTotal)}</strong></td>
                <td class="inv-num">
                    <div class="text-success">รับ ${fmtMoney(paid)}</div>
                    ${balance > 0 && inv.status !== 'void' ? `<div class="text-danger">ค้าง ${fmtMoney(balance)}${days !== null ? ` <small>(${days} วัน)</small>` : ''}</div>` : ''}
                </td>
                <td><span class="badge badge-lg ${meta.cls}">${icon(meta.icon)} ${meta.label}</span></td>
                <td class="actions-col">
                    <button class="btn btn-sm btn-gold" onclick="openStoredInvoice('${inv.id}')" style="white-space: nowrap;">${icon("receipt")} เปิดบิล</button>
                    ${inv.status === 'void' && currentUser.role === 'admin' ? `<button class="btn btn-sm btn-outline" onclick="restoreVoidInvoice('${inv.id}')" style="white-space: nowrap;" title="กู้คืนบิลที่ยกเลิกผิดใบ — ตรวจใบงานซ้ำก่อนกู้">${icon("refresh")} กู้คืน</button>` : ''}
                    ${inv.status === 'void' && currentUser.role === 'admin' ? `<button class="btn btn-sm btn-outline btn-danger-outline" onclick="deleteVoidInvoice('${inv.id}')" style="white-space: nowrap;" title="ลบถาวร — ใช้เฉพาะบิลที่ออกผิดจริง ๆ (ปกติให้เก็บบิลที่ยกเลิกไว้เป็นหลักฐาน)">${icon("trash")} ลบบิล</button>` : ''}
                </td>
            </tr>`;
    });

    const jobRows = unbilledJobs.map(j => {
        const cust = customers.find(c => c.id === j.customerId);
        const work = workers.find(w => w.id === j.workerId);
        const cleanJobType = (j.jobType || "").replace(/\s*\(\d+\)/g, "");
        const isClosed = j.status === 'ปิดงานแล้ว';
        const estimate = j.fee > 0 ? j.fee : parseJobTypeItems(j.jobType, 0).reduce((s, it) => {
            const std = getServicePrice(it.name);
            return s + (std ? std.govFee + std.serviceFee : 0);
        }, 0);
        return `
            <tr>
                <td><strong>${getJobDisplayNo(j)}</strong></td>
                <td><span class="badge badge-warning">${icon("edit")} ยังไม่ออกบิล</span></td>
                <td><div class="employer-name">${escapeHtml(cust ? cust.companyName : "ไม่พบนายจ้าง")}</div>${buildEmployerIdLinesHtml(cust)}</td>
                <td>${escapeHtml(cleanJobType)}<br><small class="text-muted">${escapeHtml(work ? `${work.firstName} ${work.lastName}` : 'ไม่พบข้อมูลคนงาน')}</small>${work && work.workerUid ? `<br><small class="text-muted">เลขประจำตัว ${escapeHtml(work.workerUid)}</small>` : ''}</td>
                <td class="inv-num"><strong>${fmtMoney(estimate)}</strong>${j.fee > 0 ? '' : '<br><small class="text-muted">ราคามาตรฐาน</small>'}</td>
                <td class="inv-num text-muted">-</td>
                <td><span class="badge ${isClosed ? 'badge-danger' : 'badge-gold'}">${isClosed ? `${icon("warn")} ปิดงานแล้ว ยังไม่ออกบิล` : escapeHtml(j.status || '-')}</span></td>
                <td class="actions-col">
                    <button class="btn btn-sm btn-gold" onclick="openInvoiceModal('${j.id}')" style="white-space: nowrap;">${icon("receipt")} ออกบิล</button>
                    ${can('finance') ? `<button class="btn btn-sm btn-outline" onclick="markJobNoCharge('${j.id}')" style="white-space: nowrap;" title="งานนี้ไม่คิดเงินลูกค้า — ไม่ต้องออกบิล">ไม่เรียกเก็บเงิน</button>` : ''}
                </td>
            </tr>`;
    });

    // งานที่ตั้งเป็น "ไม่เรียกเก็บเงิน" — แสดงเฉพาะตัวกรอง "ไม่เรียกเก็บเงิน" / "ทั้งหมด"
    const noChargeRows = noChargeJobs.map(j => {
        const cust = customers.find(c => c.id === j.customerId);
        const work = workers.find(w => w.id === j.workerId);
        return `
            <tr>
                <td><strong>${getJobDisplayNo(j)}</strong></td>
                <td>${noChargeBadgeHtml(j)}</td>
                <td><div class="employer-name">${escapeHtml(cust ? cust.companyName : "ไม่พบนายจ้าง")}</div>${buildEmployerIdLinesHtml(cust)}</td>
                <td>${escapeHtml(getCleanJobTypeName(j.jobType))}<br><small class="text-muted">${escapeHtml(work ? `${work.firstName} ${work.lastName}` : 'ไม่พบข้อมูลคนงาน')}</small>${work && work.workerUid ? `<br><small class="text-muted">เลขประจำตัว ${escapeHtml(work.workerUid)}</small>` : ''}</td>
                <td class="inv-num"><strong>0.00</strong></td>
                <td class="inv-num text-muted">-</td>
                <td><small>${escapeHtml(j.noChargeReason || '-')}</small><br><small class="text-muted">${j.noChargeBy ? `โดย ${escapeHtml(getUserNameById(j.noChargeBy))} • ` : ''}${j.noChargeAt ? formatThaiDate(j.noChargeAt, true) : ''}</small></td>
                <td class="actions-col">
                    ${can('finance') ? `<button class="btn btn-sm btn-outline" onclick="unmarkJobNoCharge('${j.id}')" style="white-space: nowrap;">กลับไปเรียกเก็บเงิน</button>` : ''}
                </td>
            </tr>`;
    });

    // รวมทุกรายการ (ใบงานรอออกบิล / ไม่เรียกเก็บเงิน / บิล) แล้วเรียงแบบเดียวกับตารางแจ้งงาน (sortBillingRows)
    const day = v => String(v || '').slice(0, 10);
    const custName = id => { const c = customers.find(x => x.id === id); return c ? c.companyName || '' : ''; };
    const jobAmount = j => j.fee > 0 ? j.fee : parseJobTypeItems(j.jobType, 0).reduce((s, it) => {
        const std = getServicePrice(it.name);
        return s + (std ? std.govFee + std.serviceFee : 0);
    }, 0);
    // บิลที่มีใบงาน → ใช้วันเปิดงาน/เลขใบงานของใบงานที่เปิดล่าสุดในบิลนั้น (เรียงตามการเปิดงาน เหมือนหน้าแจ้งงาน)
    const newestInvoiceJob = inv => (inv.jobIds || []).map(id => jobs.find(j => j.id === id)).filter(Boolean)
        .sort((a, b) => jobOpenedSortKey(b).localeCompare(jobOpenedSortKey(a)))[0] || null;
    const rows = [
        ...unbilledJobs.map((j, i) => ({ d: day(j.createdAt || j.updatedAt), t: 1, s: jobOpenedSortKey(j), html: jobRows[i],
            no: getJobDisplayNo(j), kind: 'ยังไม่ออกบิล', customer: custName(j.customerId), detail: getCleanJobTypeName(j.jobType),
            amount: jobAmount(j), balance: 0, status: 0 })),
        ...noChargeJobs.map((j, i) => ({ d: day(j.createdAt || j.updatedAt), t: 1, s: jobOpenedSortKey(j), html: noChargeRows[i],
            no: getJobDisplayNo(j), kind: JOB_NO_CHARGE, customer: custName(j.customerId), detail: getCleanJobTypeName(j.jobType),
            amount: 0, balance: 0, status: 4 })),
        ...shownInvoices.map((inv, i) => { const nj = newestInvoiceJob(inv); return {
            d: nj ? day(nj.createdAt || nj.updatedAt) : day(inv.issueDate), t: 1, s: nj ? jobOpenedSortKey(nj) : String(inv.invoiceNo || ''), html: invoiceRows[i],
            free: inv.kind === 'free', no: inv.invoiceNo || '', kind: kindLabel[inv.kind] || 'บิล', customer: inv.customerName || '',
            detail: inv.kind === 'free' ? (inv.workerName || (inv.items || [])[0]?.title || '') : (inv.items || []).map(x => x.serviceName || x.title).filter(Boolean).join(', '),
            amount: Number(inv.grandTotal) || 0, balance: inv.status === 'void' ? 0 : invoiceBalance(inv),
            status: ({ issued: 1, partial: 2, paid: 3, void: 5 })[inv.status] || 1 }; })
    ];
    tbody.innerHTML = sortBillingRows(rows).map(r => r.html).join('');
    markBillingSortHeaders();
}

// ---------- เรียงตารางออกบิลตามหัวคอลัมน์ (แบบเดียวกับตารางแจ้งงาน) ----------
// คลิกหัวคอลัมน์ = น้อยไปมาก, คลิกซ้ำ = มากไปน้อย, ครั้งที่ 3 = ค่าเริ่มต้น:
// บิลอิสระอยู่บนสุด แล้วเรียงตามการเปิดงาน งานที่เปิดใหม่ล่าสุดอยู่บน (เจ้าของระบบกำหนด 2026-10-07)
let billingSort = { key: null, dir: 1 };

function sortBillingBy(key) {
    if (billingSort.key !== key) billingSort = { key, dir: 1 };
    else if (billingSort.dir === 1) billingSort.dir = -1;
    else billingSort = { key: null, dir: 1 };
    renderBillingTab();
}

function sortBillingRows(rows) {
    if (!billingSort.key) {
        return rows.sort((a, b) => (b.free ? 1 : 0) - (a.free ? 1 : 0) || b.d.localeCompare(a.d) || a.t - b.t
            || b.s.localeCompare(a.s, undefined, { numeric: true }));
    }
    const { key, dir } = billingSort;
    return rows.sort((a, b) => {
        const va = key === 'no' ? `${a.d}|${a.no}` : a[key], vb = key === 'no' ? `${b.d}|${b.no}` : b[key];
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        // ค่าว่างอยู่ท้ายเสมอ ไม่ว่าเรียงทางไหน
        if (!va && vb) return 1;
        if (va && !vb) return -1;
        return String(va).localeCompare(String(vb), 'th', { numeric: true }) * dir;
    });
}

function markBillingSortHeaders() {
    document.querySelectorAll('#billing-table th.sortable-th').forEach(th => {
        const active = th.dataset.sort === billingSort.key;
        th.classList.toggle('is-sorted', active);
        th.dataset.dir = active ? (billingSort.dir === 1 ? 'asc' : 'desc') : '';
    });
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
                <span class="location-name">${icon("pin")} จังหวัด ${p}</span>
                <span class="badge badge-gold" style="font-weight: 500;">${count} สาขา/กิจการ</span>
            </div>
        `;
    }).join('');
    customerLocsEl.innerHTML = provincesList;
    renderWorkerProvinces();
    renderDashboardPies(nationalityCounts);
    
    // Render missing docs list
    renderMissingDocsOverview();
}

function renderEmployerAlerts() {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const tbody = document.getElementById("dashboard-employer-alerts-tbody");
    if (!tbody) return;

    const searchInput = document.getElementById("search-dashboard-employer-alerts");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    // Filter employers who have document warnings/expires
    const rows = customers.filter(c => !query || (c.companyName || "").toLowerCase().includes(query)).map(c => {
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

        // หนังสือรับรองบริษัท: ไม่มีวันหมดอายุพิมพ์จริง ใช้ค่าที่คำนวณไว้ (cert_expiry = วันที่ออก + 6 เดือน)
        let certStatus = null; // 'expired' | 'warning' | null
        let certDaysDiff = null;
        if (c.certExpiry) {
            const exp = new Date(c.certExpiry);
            certDaysDiff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
            if (certDaysDiff < 0) certStatus = 'expired';
            else if (certDaysDiff <= 30) certStatus = 'warning';
        }

        return {
            customer: c,
            expiredCount,
            warningCount,
            certStatus,
            certDaysDiff,
            totalAlerts: expiredCount + warningCount + (certStatus ? 1 : 0)
        };
    }).filter(item => item.totalAlerts > 0)
      .sort((a, b) => b.totalAlerts - a.totalAlerts);

    document.getElementById("alert-employer-count-badge").innerText = `${rows.length} บริษัท`;

    if (rows.length === 0) {
        const emptyMsg = query ? "" + icon("bad") + " ไม่พบนายจ้างตามคำค้นหา" : "" + icon("ok") + " เอกสารคนงานทุกบริษัทอยู่ในสถานะปกติเรียบร้อยดี";
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-muted" style="text-align: center; padding: 20px;">
                    ${emptyMsg}
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = rows.map(r => {
        const expiredBadge = r.expiredCount > 0 ? 
            `<span class="badge badge-lg badge-danger" style="font-weight: 600;">${icon("warn")} หมดอายุแล้ว ${r.expiredCount} คน</span>` : 
            `<span class="text-muted">ไม่มี</span>`;
            
        const warningBadge = r.warningCount > 0 ?
            `<span class="badge badge-lg badge-warning" style="font-weight: 600; color: var(--navy-medium); border-color: var(--navy-medium);">${icon("clock")} ใกล้หมดอายุ ${r.warningCount} คน</span>` :
            `<span class="text-muted">ไม่มี</span>`;

        let certBadge = `<span class="text-muted">-</span>`;
        const certExpText = r.customer.certExpiry ? formatThaiDate(r.customer.certExpiry) : '';
        if (r.certStatus === 'expired') {
            certBadge = `<span class="badge badge-lg badge-danger" style="font-weight: 600;">${icon("warn")} ${certExpText}</span>`;
        } else if (r.certStatus === 'warning') {
            certBadge = `<span class="badge badge-lg badge-warning" style="font-weight: 600; color: var(--navy-medium); border-color: var(--navy-medium);">${icon("clock")} ${certExpText}</span>`;
        } else if (r.customer.certExpiry) {
            certBadge = `<span class="badge badge-lg badge-success">${certExpText}</span>`;
        }

        return `
            <tr>
                <td><strong>${r.customer.companyName}</strong></td>
                <td>${warningBadge}</td>
                <td>${expiredBadge}</td>
                <td>${certBadge}</td>
                <td>
                    <div class="alert-row-actions">
                        <button class="btn btn-sm btn-gold" onclick="viewEmployerAlertedWorkers('${r.customer.id}')">
                            ${icon("search")} ตรวจสอบรายชื่อ
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="openCustomerModal('${r.customer.id}')">
                            ${icon("edit")} แก้ไขนายจ้าง
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function viewEmployerAlertedWorkers(employerId) {
    switchView('workers');
    const selectEmp = document.getElementById("filter-worker-employer");
    if (selectEmp) {
        selectEmp.value = "";
        const searchWorker = document.getElementById("search-worker");
        const empRec = customers.find(c => c.id === employerId);
        if (searchWorker) searchWorker.value = empRec ? empRec.companyName : "";
    }
    const selectStatus = document.getElementById("filter-worker-employment-status");
    if (selectStatus) {
        selectStatus.value = "all"; // ทุกคนที่ยังไม่พ้นสภาพ (ปกติ + รอขึ้นทะเบียน) — คนพ้นสภาพดูได้จากตัวกรอง "เฉพาะแจ้งออก/พ้นสภาพ"
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

// ประเภทกิจการ: นายจ้าง 1 รายทำได้หลายประเภท — เก็บในคอลัมน์เดิม (customers.business_type) คั่นด้วย ", "
// (ชื่อประเภทตามกรมจัดหางานไม่มีเครื่องหมายจุลภาค) ฟอร์มเป็นช่องติ๊ก name="cust-business-type"
const BUSINESS_TYPE_SEP = ', ';
function customerBusinessTypes(c) {
    return String((c && c.businessType) || '').split(/\s*,\s*/).map(s => s.trim()).filter(Boolean);
}

function setCustomerBusinessTypes(value) {
    const types = customerBusinessTypes({ businessType: value });
    const box = document.getElementById("cust-business-type");
    // ประเภทเก่าที่ไม่อยู่ในรายการมาตรฐาน — เพิ่มช่องติ๊กให้ ไม่ให้ข้อมูลเดิมหาย
    types.forEach(t => {
        if (box && !box.querySelector(`input[value="${CSS.escape(t)}"]`)) {
            box.insertAdjacentHTML('beforeend', `<label class="bt-option bt-extra"><input type="checkbox" name="cust-business-type" value="${escapeHtml(t)}"> ${escapeHtml(t)}</label>`);
        }
    });
    document.querySelectorAll('input[name="cust-business-type"]').forEach(cb => { cb.checked = types.includes(cb.value); });
}

function readCustomerBusinessTypes() {
    return Array.from(document.querySelectorAll('input[name="cust-business-type"]:checked')).map(cb => cb.value);
}

// จังหวัดของนายจ้าง = จังหวัดของทุกสาขา (สำนักงานใหญ่ + สาขาอื่น)
function customerProvinces(c) {
    return [...new Set((c.branches || []).map(b => String(b.province || '').trim()).filter(Boolean))];
}

// ตัวเลือก dropdown ประเภทธุรกิจ/จังหวัด จากข้อมูลจริง — คงค่าที่เลือกไว้เดิม
function fillCustomerFilterOptions() {
    const live = customers.filter(c => c.status !== 'deleted');
    const fill = (id, allLabel, values) => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const prev = sel.value;
        const sorted = [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b, 'th'));
        sel.innerHTML = `<option value="">${allLabel}</option>` + sorted.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
        sel.value = sorted.includes(prev) ? prev : '';
    };
    fill("filter-customer-business", "ทุกประเภทธุรกิจ", live.flatMap(customerBusinessTypes));
    fill("filter-customer-province", "ทุกจังหวัด", live.flatMap(customerProvinces));
}

function renderCustomers() {
    const query = document.getElementById("search-customer").value.toLowerCase();
    const tbody = document.getElementById("customers-list-tbody");
    fillCustomerFilterOptions();
    const businessFilter = (document.getElementById("filter-customer-business") || {}).value || '';
    const provinceFilter = (document.getElementById("filter-customer-province") || {}).value || '';
    const entityFilter = (document.getElementById("filter-customer-entity") || {}).value || '';

    // Filter
    const filtered = customers.filter(c => {
        const isDeleted = c.status === 'deleted';
        if (entityFilter === 'inactive' && !isCustomerInactive(c)) return false;
        if (entityFilter === 'individual' && !isIndividualCustomer(c)) return false;
        if (entityFilter === 'juristic' && isIndividualCustomer(c)) return false;
        if (businessFilter && !customerBusinessTypes(c).includes(businessFilter)) return false;
        if (provinceFilter && !customerProvinces(c).includes(provinceFilter)) return false;
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
                <td colspan="10" class="text-muted" style="text-align: center; padding: 40px;">
                    ${icon("bad")} ไม่พบข้อมูลลูกค้า/นายจ้างตามคำค้นหา
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
                <button class="action-icon-btn delete-btn" onclick="deleteCustomer('${c.id}', ${c._rowNum || 'null'})" title="ลบนายจ้าง">
                    ${icon("trash")}
                </button>
            `;
        }

        // ไม่มีปุ่มดินสอ (แก้ไข) แล้ว — ดับเบิลคลิกที่แถวเพื่อเปิดข้อมูล/แก้ไขนายจ้างแทน (เหมือนตารางคนงาน)
        const activeWorkersCount = allWorkers().filter(w => w.employerId === c.id && w.status !== 'archived' && w.status !== 'deleted').length;
        const totalWorkersCount = allWorkers().filter(w => w.employerId === c.id && w.status !== 'deleted').length;

        const statusLabel = c.status === 'deleted' ?
            ' <span class="badge" style="background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); font-size: 11.5px; padding: 2px 6px; margin-left: 4px;">ลบแล้ว/เก็บถาวร</span>' :
            isCustomerInactive(c) ? ' <span class="badge badge-danger" style="font-size: 11.5px; padding: 2px 6px; margin-left: 4px;">ปิดใช้งาน (Inactive)</span>' :
            '';
        if (currentUser.role === 'admin') {
            deleteBtn = (isCustomerInactive(c)
                ? `<button class="action-icon-btn" onclick="toggleCustomerActive('${c.id}')" title="เปิดใช้งานนายจ้าง">${icon("unlock")}</button>`
                : `<button class="action-icon-btn" onclick="toggleCustomerActive('${c.id}')" title="ปิดใช้งานนายจ้าง (ซ่อนคนงานของนายจ้างนี้)">${icon("ban")}</button>`) + deleteBtn;
        }
        const prepaymentLabel = c.requirePrepayment ?
            ' <span class="badge" style="background-color: #fffbeb; color: #92400e; border: 1px solid #fde68a; font-size: 11.5px; padding: 2px 6px; margin-left: 4px;" title="ต้องออกบิลและรับชำระก่อนย้ายใบงานเข้ากำลังดำเนินการ">' + icon("moneybag") + ' ต้องชำระก่อนดำเนินการ</span>' :
            '';
        
        const attachHtml = `
            <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                <button class="btn btn-sm btn-gold btn-open-folder" onclick="openCustomerFolderModal('${c.id}')">
                    ${icon("folder")} เปิดแฟ้มเอกสาร
                </button>
            </div>
        `;

        const referredAgent = c.referredByAgentId ? agents.find(a => a.id === c.referredByAgentId) : null;
        const referredAgentHtml = referredAgent
            ? `<span class="badge" style="background-color:#e0f2fe; color:#0369a1; font-weight:600;">${icon("users")} ${referredAgent.name}</span>`
            : `<span class="text-muted" style="font-size:12.5px;">-</span>`;

        // หนังสือรับรองนิติบุคคล: มีเฉพาะลูกค้าที่กรอกวันที่ออกหนังสือรับรองไว้ (cert_expiry = วันที่ออก + 6 เดือน)
        let certCellHtml = `<span class="text-muted" style="font-size:12.5px;">-</span>`;
        if (c.certExpiry) {
            const certExpDate = new Date(c.certExpiry);
            const certDaysDiff = Math.ceil((certExpDate.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
            const certExpText = formatThaiDate(certExpDate);
            if (certDaysDiff < 0) {
                certCellHtml = `<span class="badge badge-lg badge-danger" style="font-weight:600;" title="หมดอายุแล้ว">${icon("warn")} ${certExpText}</span>`;
            } else if (certDaysDiff <= 30) {
                certCellHtml = `<span class="badge badge-lg badge-warning" style="font-weight:600; color: var(--navy-medium); border-color: var(--navy-medium);" title="ใกล้หมดอายุ">${icon("clock")} ${certExpText}</span>`;
            } else {
                certCellHtml = `<span class="badge badge-lg badge-success">${certExpText}</span>`;
            }
        }

        const idPartsHtml = buildEmployerIdLinesHtml(c);

        return `
            <tr class="clickable-row" ondblclick="handleRowDblClick(event) && openCustomerModal('${c.id}')" title="ดับเบิลคลิกเพื่อดูรายละเอียดนายจ้าง">
                <td>${idPartsHtml}</td>
                <td><strong>${c.companyName}${statusLabel}${prepaymentLabel}</strong></td>
                <td><div class="bt-badges">${customerBusinessTypes(c).map(t => `<span class="badge badge-lg badge-gold">${escapeHtml(t)}</span>`).join("") || "-"}</div></td>
                <td>${certCellHtml}</td>
                <td>${hqAddress}</td>
                <td>
                    <div>${c.coordinator}</div>
                    <small class="text-muted">${c.phone}</small>
                </td>
                <td>${referredAgentHtml}</td>
                <td>
                    <span class="badge badge-lg badge-gold" style="cursor: pointer;" onclick="event.stopPropagation(); filterWorkersByEmployer('${c.id}')" title="คลิกเพื่อสืบค้นรายชื่อคนงาน">
                        ${icon("user")} ${activeWorkersCount} คน (ทั้งหมด ${totalWorkersCount} คน)
                    </span>
                </td>
                <td onclick="event.stopPropagation()">${attachHtml}</td>
                <td class="actions-col" onclick="event.stopPropagation()">
                    <div class="actions-cell">
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

// ที่อยู่สำนักงานใหญ่ของนายจ้าง 1 ราย = "สถานที่ทำงาน" ของคนงานทุกคนของนายจ้างรายนี้ (ล็อคไว้ ไม่ใช้ค่าจาก AI/พิมพ์เอง —
// ที่อยู่ที่ AI อ่านจากใบอนุญาตทำงานไม่ตรงกับที่อยู่นายจ้างในระบบ) ข้ามช่องที่ว่าง ไม่ให้มี "ม." ลอย ๆ
function getCustomerHQAddress(customerId) {
    const c = customers.find(item => item.id === customerId);
    if (!c || !Array.isArray(c.branches) || c.branches.length === 0) return "";
    const b = c.branches.find(br => (br.name || "").includes("สำนักงานใหญ่")) || c.branches[0];
    if (!b) return "";
    return [
        b.houseNo && `เลขที่ ${b.houseNo}`,
        b.moo && `ม.${b.moo}`,
        b.soi && `ซ.${b.soi}`,
        b.road && `ถ.${b.road}`,
        b.subdistrict && `ต.${b.subdistrict}`,
        b.district && `อ.${b.district}`,
        b.province && `จ.${b.province}`,
        b.postalCode
    ].filter(Boolean).join(' ');
}

function fillWorkerWorkplaceFromEmployer(employerId) {
    const workplaceInput = document.getElementById("worker-workplace");
    if (!workplaceInput) return;
    workplaceInput.value = employerId ? getCustomerHQAddress(employerId) : '';
}

// แก้ที่อยู่นายจ้างแล้ว สถานที่ทำงานของคนงานทุกคนของนายจ้างรายนี้ต้องเปลี่ยนตาม (ไม่งั้นค่าในคนงานค้างเป็นที่อยู่เก่า)
async function syncWorkersWorkplaceForEmployer(customerId) {
    const address = getCustomerHQAddress(customerId);
    const stale = workers.filter(w => w.employerId === customerId && (w.workplace || '') !== address);
    let failCount = 0;
    for (const w of stale) {
        const res = await callCloudAPI("saveWorker", { workerData: { ...w, workplace: address } });
        if (!res || res.status === "error") failCount++;
        else w.workplace = address;
    }
    if (stale.length > 0) {
        saveData();
        showToast(failCount ? `⚠️ อัปเดตสถานที่ทำงานของคนงานไม่สำเร็จ ${failCount} คน` : `📍 อัปเดตสถานที่ทำงานของคนงาน ${stale.length} คนตามที่อยู่นายจ้างแล้ว`, failCount ? "danger" : "success");
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

// 1 บรรทัดในคอลัมน์ "วันหมดอายุ" ของตารางคนงาน (แสดงแค่วันที่ ไม่แสดงจำนวนวันที่เหลือ) — สีตามเกณฑ์เดียวกับป้ายสถานะเอกสาร
// (ใบอนุญาตทำงานเตือนก่อน 60 วัน / พาสปอร์ตเตือนก่อน 180 วัน)
function renderWorkerExpiryLine(label, expDate, daysLeft, warnDays) {
    if (!expDate || isNaN(expDate.getTime())) {
        return `<div class="worker-expiry-line text-muted"><span>${label}:</span> -</div>`;
    }
    const cls = daysLeft < 0 ? 'text-danger' : (daysLeft <= warnDays ? 'text-warning' : 'text-muted');
    return `<div class="worker-expiry-line ${cls}"><span>${label}:</span> <strong>${formatThaiDate(expDate)}</strong></div>`;
}

let selectedPendingWorkerIds = new Set();
let lastPendingFilteredIds = [];

function updateWorkerBulkStatusBar(visible) {
    const bar = document.getElementById("worker-bulk-status-bar");
    if (!bar) return;
    bar.classList.toggle("hidden", !visible);
    if (!visible) return;
    const selected = selectedPendingWorkerIds.size;
    const total = lastPendingFilteredIds.length;
    document.getElementById("worker-bulk-total").innerText = total;
    document.getElementById("worker-bulk-count").innerText = `เลือกแล้ว ${selected} คน`;
    const selectAll = document.getElementById("worker-bulk-select-all");
    selectAll.checked = total > 0 && selected === total;
    selectAll.indeterminate = selected > 0 && selected < total;
    document.getElementById("btn-bulk-activate-workers").disabled = selected === 0;
}

function togglePendingWorkerSelection(id, checked) {
    if (checked) selectedPendingWorkerIds.add(id); else selectedPendingWorkerIds.delete(id);
    updateWorkerBulkStatusBar(true);
}

// เลือกทุกคนที่ตรงตัวกรองตอนนี้ (ทุกหน้า ไม่ใช่แค่หน้าที่เห็น)
function toggleSelectAllPendingWorkers(checked) {
    selectedPendingWorkerIds = checked ? new Set(lastPendingFilteredIds) : new Set();
    renderWorkers();
}

async function bulkActivateSelectedWorkers() {
    if (currentUser.role !== 'admin') {
        showToast("❌ เฉพาะ Admin เท่านั้นที่เปลี่ยนสถานะทีละหลายคนได้", "danger");
        return;
    }
    const ids = [...selectedPendingWorkerIds];
    if (ids.length === 0) return;
    if (!(await uiConfirm(`ยืนยันเปลี่ยนสถานะคนงาน ${ids.length} คน จาก "รอขึ้นทะเบียน" เป็น "ปกติ (Active)"?`, { okText: "เปลี่ยนเป็นปกติ", card: { imageIcon: "users", imageIconColor: "teal", title: `คนงาน ${ids.length} คน`, subtitle: "รอขึ้นทะเบียน → ปกติ (Active)", list: ids.map(id => workers.find(w => w.id === id)).filter(Boolean).map(workerFullName) } }))) return;

    showToast(`💾 กำลังเปลี่ยนสถานะคนงาน ${ids.length} คน...`, "warning");
    const res = await callCloudAPI("bulkSetWorkerStatus", { ids, status: 'active' });
    if (!res || res.status === "error") {
        showToast("❌ เปลี่ยนสถานะไม่สำเร็จ: " + (res && res.message ? res.message : "กรุณาลองใหม่"), "danger");
        return;
    }
    const updated = new Set(res.updatedIds || ids);
    workers.forEach(w => { if (updated.has(w.id)) w.status = 'active'; });
    selectedPendingWorkerIds = new Set();
    saveData();
    renderWorkers();
    const missed = ids.length - updated.size;
    showToast(`✅ เปลี่ยนเป็นปกติแล้ว ${updated.size} คน${missed > 0 ? ` (ไม่สำเร็จ ${missed} คน)` : ''}`, missed > 0 ? "warning" : "success");
}

// admin กดป้าย "รอแจ้งเข้า" ทีเดียว → ตั้ง skipNotifyEntry = true (เหมือนติ๊ก worker-skip-notify ในฟอร์ม) แล้วบันทึกขึ้นคลาวด์
async function markWorkerNotifySkipped(workerId, btn) {
    if (currentUser.role !== 'admin') return;
    const w = workers.find(x => x.id === workerId);
    if (!w) return;
    if (btn) btn.disabled = true;

    w.skipNotifyEntry = true;
    const res = await callCloudAPI("saveWorker", { workerData: w });
    if (!res || res.status === "error") {
        w.skipNotifyEntry = false;
        if (btn) btn.disabled = false;
        showToast("❌ บันทึกไม่สำเร็จ: " + (res && res.message ? res.message : "กรุณาลองใหม่"), "danger");
        return;
    }
    saveData();
    renderWorkers();
    showToast(`✅ ${w.firstName || ''} ${w.lastName || ''}: ไม่ต้องแจ้งเข้าแล้ว (ยกเลิกได้ในฟอร์มแก้ไขคนงาน)`, "success");
}

// ---------- เรียงตารางฐานข้อมูลคนงานตามหัวคอลัมน์ (แบบเดียวกับตารางแจ้งงาน) ----------
// คลิก = น้อยไปมาก, คลิกซ้ำ = มากไปน้อย, ครั้งที่ 3 = กลับเป็นลำดับเดิม
let workersSort = { key: null, dir: 1 };

function sortWorkersBy(key) {
    if (workersSort.key !== key) workersSort = { key, dir: 1 };
    else if (workersSort.dir === 1) workersSort.dir = -1;
    else workersSort = { key: null, dir: 1 };
    workersCurrentPage = 1;
    renderWorkers();
}

function workerSortValue(w, key) {
    const daysTo = d => { const t = safeParseDate(d); return t ? Math.ceil((t - new Date()) / 86400000) : null; };
    switch (key) {
        case 'uid': return w.workerUid || '';
        case 'name': return `${w.firstName || ''} ${w.lastName || ''}`.replace(/\s+/g, ' ').trim();
        case 'nationality': return w.nationality || '';
        case 'passport': return w.passportNo || '';
        case 'expiry': {
            // วันหมดอายุใบอนุญาตทำงาน (ไม่มีใช้พาสปอร์ต) เทียบเป็นวันที่จริง — วันที่เก็บได้หลายรูปแบบ
            const t = safeParseDate(w.permitExpiry) || safeParseDate(w.passportExpiry);
            return t && !isNaN(t.getTime()) ? t.getTime() : '';
        }
        case 'employer': { const c = customers.find(x => x.id === w.employerId); return c ? c.companyName || '' : ''; }
        case 'docStatus': {
            // หมดอายุ → ใกล้หมด → ปกติ (เกณฑ์เดียวกับตัวกรองสถานะเอกสาร)
            const p = daysTo(w.passportExpiry), wp = daysTo(w.permitExpiry);
            if ((p !== null && p < 0) || (wp !== null && wp < 0)) return 0;
            if ((p !== null && p <= 180) || (wp !== null && wp <= 60)) return 1;
            return 2;
        }
        case 'docs': return Object.values(w.attachments || {}).reduce((s, v) => s + (Array.isArray(v) ? v.length : (v ? 1 : 0)), 0);
        default: return '';
    }
}

function sortWorkersList(list) {
    if (!workersSort.key) return list;
    const { key, dir } = workersSort;
    return list.sort((a, b) => {
        const va = workerSortValue(a, key), vb = workerSortValue(b, key);
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        if (!va && vb) return 1; // ค่าว่างอยู่ท้ายเสมอ
        if (va && !vb) return -1;
        return String(va).localeCompare(String(vb), 'th', { numeric: true }) * dir;
    });
}

function markWorkerSortHeaders() {
    document.querySelectorAll('#workers-table th.sortable-th').forEach(th => {
        const active = th.dataset.sort === workersSort.key;
        th.classList.toggle('is-sorted', active);
        th.dataset.dir = active ? (workersSort.dir === 1 ? 'asc' : 'desc') : '';
    });
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
        // คนงานพ้นสภาพ/แจ้งออก (และที่ลบแล้ว) ไม่แสดงในหน้านี้เลย — ยกเว้นเลือกตัวกรอง "เฉพาะแจ้งออก/พ้นสภาพ" (เจ้าของระบบกำหนด 2026-10-06)
        // เดิมพิมพ์ค้นหาแล้วตัวกรองสถานะถูกข้ามทั้งหมด ทำให้คนที่พ้นสภาพโผล่มาปน
        const wStatus = w.status || 'active';
        const isGone = wStatus === 'archived' || wStatus === 'deleted';
        let matchEmpStatus;
        if (empStatusFilter === 'archived') matchEmpStatus = isGone;
        else if (isGone) matchEmpStatus = false;
        else if (empStatusFilter === 'pending_register') matchEmpStatus = wStatus === 'pending_register';
        else if (empStatusFilter === 'active') matchEmpStatus = searchVal ? true : wStatus === 'active'; // ค้นหา = เจอทั้งปกติและรอขึ้นทะเบียน
        else matchEmpStatus = true; // "all" = ทุกคนที่ยังไม่พ้นสภาพ

        return matchSearch && matchNat && matchEmp && matchStatus && matchEmpStatus;
    });

    // คลิกหัวคอลัมน์เพื่อเรียง (sortWorkersBy) — เรียงก่อนแบ่งหน้า
    sortWorkersList(filtered);
    markWorkerSortHeaders();

    // เปลี่ยน "รอขึ้นทะเบียน" → "ปกติ" ทีละหลายคน: เฉพาะ admin และเฉพาะตอนกรองดู "รอขึ้นทะเบียน" อยู่
    const bulkPendingMode = currentUser.role === 'admin' && empStatusFilter === 'pending_register';
    const pendingFilteredIds = bulkPendingMode ? filtered.filter(w => w.status === 'pending_register').map(w => w.id) : [];
    selectedPendingWorkerIds = new Set([...selectedPendingWorkerIds].filter(id => pendingFilteredIds.includes(id)));
    lastPendingFilteredIds = pendingFilteredIds;
    updateWorkerBulkStatusBar(bulkPendingMode);

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
                    ${icon("bad")} ไม่พบข้อมูลคนงานต่างด้าวตามตัวกรอง
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
        // ยังไม่เคยมีใบงานเลยสักใบ = ยังไม่เคยแจ้งงานให้คนงานคนนี้เลย (ไม่รวมคนที่กำลังรอขึ้นทะเบียนอยู่แล้ว เพราะขึ้นทะเบียนเสร็จก็ถือว่าเข้าระบบแล้วไม่ต้องแจ้งเข้าซ้ำ,
        // และไม่รวมคนที่ admin ระบุไว้ว่าไม่ต้องแจ้งเข้า — ดู worker-skip-notify ในฟอร์มเพิ่ม/แก้ไขคนงาน)
        // admin กดที่ป้ายได้เลย = ติ๊ก "ไม่ต้องแจ้งเข้า" ให้ทันที (ดู markWorkerNotifySkipped) — คนอื่นเห็นเป็นป้ายเฉย ๆ
        // ป้าย "รอแจ้งเข้า" หายเมื่อมีใบงานของคนงานคนนี้ที่ "ปิดงานแล้ว" อย่างน้อย 1 ใบ (เจ้าของระบบกำหนด 2026-10-08 —
        // เดิมหายทันทีที่เปิดงาน ทั้งที่ยังแจ้งเข้าไม่เสร็จ)
        const needsNotify = w.status !== 'pending_register' && !w.skipNotifyEntry && !jobs.some(j => j.workerId === w.id && j.status === 'ปิดงานแล้ว');
        const pendingNotifyBadge = !needsNotify ? '' : currentUser.role === 'admin'
            ? `<div class="worker-notify-badge"><button type="button" class="badge badge-warning notify-skip-btn" onclick="event.stopPropagation(); markWorkerNotifySkipped('${w.id}', this)" title="ยังแจ้งเข้าไม่เสร็จ (ยังไม่มีใบงานที่ปิดงานแล้ว) — กดเพื่อทำเครื่องหมายว่าไม่ต้องแจ้งเข้า (ยกเลิกได้ในฟอร์มแก้ไขคนงาน)">${icon("hourglass")} รอแจ้งเข้า <span class="notify-skip-action">${icon("ok", "green")} ผ่าน</span></button></div>`
            : `<div class="worker-notify-badge"><span class="badge badge-warning" title="ยังแจ้งเข้าไม่เสร็จ (ยังไม่มีใบงานที่ปิดงานแล้ว)">${icon("hourglass")} รอแจ้งเข้า</span></div>`;
        // นายจ้างเขียนโน้ตไว้จากพอร์ทัล (set_my_worker_note) → ป้ายเล็ก ชี้เมาส์อ่านข้อความเต็ม
        const clientNoteBadge = w.clientNote ? `<div class="worker-notify-badge"><span class="badge badge-gold client-note-badge" title="โน้ตจากนายจ้าง: ${escapeHtml(w.clientNote)}">${icon("chat")} โน้ตจากนายจ้าง</span></div>` : '';

        // Status badges logic
        const pExpDate = safeParseDate(w.passportExpiry);
        const wpExpDate = safeParseDate(w.permitExpiry);
        const pDiff = pExpDate && !isNaN(pExpDate.getTime()) ? Math.ceil((pExpDate - today) / (1000 * 60 * 60 * 24)) : 9999;
        const wpDiff = wpExpDate && !isNaN(wpExpDate.getTime()) ? Math.ceil((wpExpDate - today) / (1000 * 60 * 60 * 24)) : 9999;

        let statusBadge = '<span class="badge badge-lg badge-success">ปกติ</span>';
        if (w.status === 'deleted') {
            statusBadge = '<span class="badge badge-lg" style="background-color: #ef4444; color: white;">ลบแล้ว/เก็บถาวร</span>';
        } else if (w.status === 'archived') {
            statusBadge = '<span class="badge badge-lg" style="background-color: #64748b; color: white;">พ้นสภาพ/แจ้งออก</span>';
        } else if ((pExpDate && pDiff < 0) || (wpExpDate && wpDiff < 0)) {
            statusBadge = '<span class="badge badge-lg badge-danger">หมดอายุ</span>';
        } else if ((pExpDate && pDiff <= 180) || (wpExpDate && wpDiff <= 60)) {
            statusBadge = '<span class="badge badge-lg badge-warning">ใกล้หมดอายุ</span>';
        }

        // Attachments logic: เปิดแฟ้มเอกสารในระบบ (Supabase Storage) ไม่ใช่ Google Drive แล้ว
        const attachHtml = `
            <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                <button class="btn btn-sm btn-gold btn-open-folder" onclick="openWorkerFolderModal('${w.id}')">
                    ${icon("folder")} เปิดแฟ้มเอกสาร
                </button>
                <button class="btn btn-sm btn-outline" onclick="openBt46Modal('${w.id}')" title="สร้างแบบ บต.46 หนังสือรับรองการจ้าง">
                    ${icon("print")} บต.46
                </button>
            </div>
        `;

        // Exclude delete buttons for managers/staff
        let deleteBtn = '';
        if (currentUser.role === 'admin') {
            deleteBtn = `
                <button class="action-icon-btn delete-btn" onclick="deleteWorker('${w.id}', ${w._rowNum || 'null'})" title="ลบคนงาน">
                    ${icon("trash")}
                </button>
            `;
        }

        // ไม่มีปุ่มดินสอ (แก้ไข) แล้ว — ดับเบิลคลิกที่แถวเพื่อเปิดข้อมูล/แก้ไขคนงานแทน
        const avatarUrl = w.photo ? w.photo : 'data:image/svg+xml;utf8,<svg xmlns=%22http:' + '/' + '/www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 width=%2232%22 height=%2232%22 fill=%22%2394a3b8%22><path d=%22M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 3.58-8 8v1h16v-1c0-4.42-3.58-8-8-8z%22/></svg>';

        // ดับเบิลคลิกแถวเพื่อเปิดดูข้อมูลคนงาน เหมือนตาราง "ข้อมูลคนงานต่ออายุ" (ปุ่มในแถวใช้ stopPropagation ไม่ให้เปิดซ้อน)
        return `
            <tr class="clickable-row" ondblclick="handleRowDblClick(event) && openWorkerModal('${w.id}')" title="ดับเบิลคลิกเพื่อดูรายละเอียดคนงาน">
                <td>
                    ${bulkPendingMode && w.status === 'pending_register' ? `<label class="worker-bulk-check" onclick="event.stopPropagation()"><input type="checkbox" ${selectedPendingWorkerIds.has(w.id) ? 'checked' : ''} onchange="togglePendingWorkerSelection('${w.id}', this.checked)"> เลือก</label>` : ''}
                    <div><strong>${w.refNo || '-'}</strong></div>
                    <div class="worker-id-line"><span>เลขประจำตัวคนต่างด้าว</span> <b>${w.workerUid || '-'}</b></div>
                    <div class="worker-id-line"><span>เลขที่ใบอนุญาตทำงาน</span> <b>${w.permitNo || '-'}</b></div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background-color: #f1f5f9; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div>
                            <strong>${w.title ? w.title + ' ' : ''}${w.firstName || '-'} ${w.lastName || ''}</strong>
                            ${w.thaiName ? `<div><small class="text-muted">ชื่อไทย (บัตรชมพู): ${w.thaiName}</small></div>` : ''}
                            <div><small class="text-muted">เพศ: ${w.gender || '-'}</small></div>
                            ${pendingNotifyBadge}${clientNoteBadge}
                            ${(w.fatherName || w.motherName) ? `<div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">พ่อ: ${w.fatherName || '-'} / แม่: ${w.motherName || '-'}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td><span class="badge badge-gold">${w.nationality || '-'}</span></td>
                <td>
                    <div>เล่ม: ${w.passportNo || '-'}</div>
                </td>
                <td class="worker-expiry-cell">
                    ${renderWorkerExpiryLine('ใบอนุญาต', wpExpDate, wpDiff, 60)}
                    ${renderWorkerExpiryLine('พาสปอร์ต', pExpDate, pDiff, 180)}
                </td>
                <td>
                    <div class="employer-name">${empName}</div>
                    ${buildEmployerIdLinesHtml(emp)}
                </td>
                <td>${statusBadge}</td>
                <td onclick="event.stopPropagation()">${attachHtml}</td>
                <td class="actions-col" onclick="event.stopPropagation()">
                    <div class="actions-cell">
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
                <span class="branch-card-title">${icon("pin")} สาขาที่ ${idx + 1}: </span>
                <input type="text" class="branch-name-input" value="${b.name}" placeholder="ชื่อสาขา เช่น สำนักงานใหญ่, คลังสินค้า" oninput="updateBranchField(${idx}, 'name', this.value)">
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

async function removeBranchInput(idx) {
    const br = customerBranches[idx] || {};
    if (!(await uiConfirm("คุณแน่ใจหรือไม่ที่จะลบที่อยู่สาขานี้ออกจากฟอร์ม?", { card: { imageIcon: "pin", imageIconColor: "red", title: `สาขาที่ ${idx + 1}`, subtitle: [br.houseNo, br.moo ? `ม.${br.moo}` : "", br.soi, br.road, br.subdistrict ? `ต.${br.subdistrict}` : "", br.district ? `อ.${br.district}` : "", br.province ? `จ.${br.province}` : "", br.postalCode].filter(Boolean).join(" ") || "ยังไม่ได้กรอกที่อยู่" } }))) return;
    customerBranches.splice(idx, 1);
    renderBranchesInputs();
}

function updateBranchField(idx, field, value) {
    if (customerBranches[idx]) {
        customerBranches[idx][field] = value;
        refreshDeliverySamePreview();
    }
}

function updateBranchProvince(idx, province) {
    if (customerBranches[idx]) {
        customerBranches[idx].province = province;
        customerBranches[idx].district = "";
        customerBranches[idx].subdistrict = "";
        customerBranches[idx].postalCode = "";
        renderBranchesInputs();
        refreshDeliverySamePreview();
    }
}

function updateBranchDistrict(idx, district) {
    if (customerBranches[idx]) {
        customerBranches[idx].district = district;
        customerBranches[idx].subdistrict = "";
        customerBranches[idx].postalCode = "";
        renderBranchesInputs();
        refreshDeliverySamePreview();
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
        refreshDeliverySamePreview();
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

// ==================== วางภาพจากคลิปบอร์ด (Ctrl+V) เป็นไฟล์แนบ ====================
// เช่น แคปหน้าจอด้วย Win+Shift+S / Print Screen แล้ววาง — ภาพไม่มีบอกว่าเป็นเอกสารประเภทไหน จึงใช้ช่องที่เมาส์ชี้อยู่
// เป็นตัวบอก (ใช้ "คลิกช่อง" ไม่ได้ เพราะคลิกแล้วเปิดหน้าต่างเลือกไฟล์) — ยกเว้นหน้าต่างนำเข้าหลายไฟล์
// ที่ AI แยกประเภทและจับคู่คนงานให้เองอยู่แล้ว วางได้เลยไม่ต้องชี้
let lastPointerPos = null;
document.addEventListener('mousemove', e => { lastPointerPos = { x: e.clientX, y: e.clientY }; }, { passive: true });

function getClipboardImageFiles(e) {
    const items = Array.from((e.clipboardData && e.clipboardData.items) || []);
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return items
        .filter(it => it.kind === 'file' && it.type.startsWith('image/'))
        .map((it, i) => {
            const f = it.getAsFile();
            const ext = (f.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
            // ภาพจากคลิปบอร์ดชื่อ "image.png" เหมือนกันหมด — ตั้งชื่อใหม่ให้แยกกันได้ (แนบเข้าคนงานแล้วระบบตั้งชื่อตามแพทเทิร์นอีกที)
            return new File([f], `screenshot_${stamp}${i ? '_' + (i + 1) : ''}.${ext}`, { type: f.type });
        });
}

// ช่องแนบไฟล์ที่เมาส์ชี้อยู่: ช่องในฟอร์มคนงาน/นายจ้าง (.upload-box id="drop-<ประเภท>") หรือช่อง ➕ ในแฟ้มเอกสาร (data-paste-target)
function findPasteTarget() {
    if (!lastPointerPos) return null;
    const el = document.elementFromPoint(lastPointerPos.x, lastPointerPos.y);
    if (!el) return null;
    const tile = el.closest('[data-paste-target]');
    if (tile) {
        const [kind, docType] = tile.dataset.pasteTarget.split(':');
        return { kind, docType, el: tile };
    }
    const box = el.closest('.upload-box[id^="drop-"]');
    if (box) {
        const docType = box.id.slice('drop-'.length);
        if (docType.startsWith('worker-')) return { kind: 'worker-form', docType, el: box };
        if (docType.startsWith('cust-') || docType === 'employer-house') return { kind: 'customer-form', docType, el: box };
    }
    return null;
}

document.addEventListener('paste', async e => {
    const files = getClipboardImageFiles(e);
    if (files.length === 0) return; // วางข้อความธรรมดา — ปล่อยให้ทำงานตามปกติ

    const bulkModal = document.getElementById('bulk-import-modal');
    if (bulkModal && !bulkModal.classList.contains('hidden')) {
        e.preventDefault();
        addFilesToBulkImport(files);
        showToast(`📋 วางภาพ ${files.length} ภาพลงรายการนำเข้าแล้ว`, "success");
        return;
    }

    const target = findPasteTarget();
    if (!target) {
        // วางภาพตอนเปิดหน้าที่มีช่องแนบไฟล์ แต่ไม่ได้ชี้ช่องไหน — บอกวิธีใช้ แทนที่จะเงียบหาย
        if (document.querySelector('.modal-backdrop:not(.hidden) .upload-box, .modal-backdrop:not(.hidden) [data-paste-target]')) {
            showToast("📋 ชี้เมาส์ไว้ที่ช่องเอกสารที่ต้องการก่อน แล้วกด Ctrl+V", "warning");
        }
        return;
    }
    e.preventDefault();
    target.el.classList.add('dragover');
    setTimeout(() => target.el.classList.remove('dragover'), 800);

    if (target.kind === 'worker-form') {
        for (const f of files) await processUploadedFile(f, target.docType);
    } else if (target.kind === 'customer-form') {
        files.forEach(f => processCustomerDocFile(f, target.docType));
    } else if (target.kind === 'worker-folder') {
        activeFolderDocType = target.docType;
        await handleFolderFileUpload({ target: { files } });
    } else if (target.kind === 'customer-folder') {
        activeFolderCustomerDocType = target.docType;
        await handleCustomerFolderFileUpload({ target: { files } });
    }
});

async function dropDocHandler(e, docType) {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        // ประมวลผลทีละไฟล์ตามลำดับ (ไม่ยิงพร้อมกัน) เพื่อให้ไฟล์สุดท้ายที่แนบเป็นตัวเติมข้อมูลลงฟอร์มเสมอ
        // (กันปัญหาแนบหลายไฟล์พร้อมกันแล้ว AI อ่านเสร็จไม่พร้อมกัน ทำให้ไฟล์ที่เสร็จช้ากว่าทับข้อมูลแบบสุ่ม)
        for (const file of Array.from(e.dataTransfer.files)) {
            await processUploadedFile(file, docType);
        }
    }
}

async function fileSelectHandler(e, docType) {
    if (e.target.files && e.target.files.length > 0) {
        for (const file of Array.from(e.target.files)) {
            await processUploadedFile(file, docType);
        }
    }
}

let tempWorkerAttachments = {};
let tempCustomerAttachments = {}; // ไฟล์แนบของนายจ้างที่ยังไม่ได้อัปโหลด รอจนกว่าจะบันทึกลูกค้า/นายจ้างสำเร็จก่อน (มี id + โฟลเดอร์ Drive จริง)
let tempExpenseAttachment = null; // สลิป/ใบเสร็จของรายจ่ายที่กำลังกรอกอยู่ — { name, data(url) } หรือ null
let tempJobAppointmentDocUrl = null; // ไฟล์ใบนัดหมายของใบงานที่กำลังแก้ไขอยู่ (ช่องเดียว แนบใหม่แทนที่ของเดิม) — string url หรือ null

// อัปโหลดไฟล์ใบนัดหมาย (ช่องเดียวต่อใบงาน) ให้ AI อ่านวันที่/เวลา/เลขที่นัดหมาย/สถานที่มากรอกฟอร์มให้อัตโนมัติ
function dropJobAppointmentFile(e) {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processJobAppointmentFile(e.dataTransfer.files[0]);
    }
}

function jobAppointmentFileSelected(e) {
    if (e.target.files && e.target.files.length > 0) {
        processJobAppointmentFile(e.target.files[0]);
    }
}

function processJobAppointmentFile(file) {
    const statusEl = document.getElementById("status-job-appointment");
    if (!statusEl) return;
    statusEl.innerHTML = `<span class="ai-processing">${icon("clip")} กำลังแนบไฟล์...</span>`;

    const reader = new FileReader();
    reader.onload = async function (e) {
        const fileContent = e.target.result;
        const editId = document.getElementById("job-edit-id").value;
        const customerId = document.getElementById("job-customer-id").value;
        const workerIds = getSelectedJobWorkerIds();
        const fileName = `job-appointment_${editId || Date.now()}${extFromDataUrl(fileContent)}`;

        const uploadResult = await uploadDocumentFile(fileContent, fileName, customerId, workerIds[0] || "", "job-appointment");
        if (uploadResult && uploadResult.aiRejected) {
            statusEl.innerHTML = `<span class="ai-error">${icon("warn", "amber")} ${getAiRejectedMessage(uploadResult.ocrError)}</span>`;
            return;
        }
        if (!uploadResult) {
            statusEl.innerHTML = `<span class="ai-error">${icon("bad")} อัปโหลดไม่สำเร็จ กรุณาลองใหม่</span>`;
            return;
        }

        tempJobAppointmentDocUrl = uploadResult.fileUrl;
        statusEl.innerHTML = `<span class="ai-success">${icon("ok")} แนบไฟล์ "${file.name}" แล้ว</span>`;

        if (uploadResult.parsedData) {
            const setVal = (id, val) => {
                if (val === undefined || val === null || val === "") return;
                const el = document.getElementById(id);
                if (el) el.value = val;
            };
            setVal("job-appointment-date", normalizeDisplayDateYear(uploadResult.parsedData.appointmentDate));
            setVal("job-appointment-time", uploadResult.parsedData.appointmentTime);
            setVal("job-appointment-no", uploadResult.parsedData.appointmentNo);
            setVal("job-appointment-location", uploadResult.parsedData.appointmentLocation);
            showToast("✨ AI อ่านข้อมูลใบนัดหมายและกรอกฟอร์มให้อัตโนมัติแล้ว กรุณาตรวจสอบความถูกต้องอีกครั้ง", "success");
        } else if (uploadResult.manualEntry) {
            focusManualEntryFields("job-appointment");
        }
    };
    reader.readAsDataURL(file);
}

function dropCustomerDocHandler(e, docType) {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        Array.from(e.dataTransfer.files).forEach(file => processCustomerDocFile(file, docType));
    }
}

function customerFileSelectHandler(e, docType) {
    if (e.target.files && e.target.files.length > 0) {
        Array.from(e.target.files).forEach(file => processCustomerDocFile(file, docType));
    }
}

// เติมฟอร์ม "เพิ่ม/แก้ไขข้อมูลนายจ้าง" จากผลลัพธ์ AI OCR (คู่กับ applyOcrDataToCustomer ที่ใช้ฝั่งแฟ้มเอกสาร/object)
function applyGeminiDataToCustomerForm(docType, parsedData) {
    if (!parsedData) return;
    const setVal = (id, val) => {
        if (val === undefined || val === null || val === "") return;
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    if (docType === 'cust-id-card') {
        if (getCustomerEntityType() === 'individual') {
            // บุคคลธรรมดา: เลขบัตรประชาชนนายจ้าง = เลขประจำตัวผู้เสียภาษี, ชื่อบนบัตร = ชื่อผู้ว่าจ้าง
            setVal("cust-tax-id", parsedData.directorId);
            const nameInput = document.getElementById("cust-company-name");
            if (parsedData.coordinatorName && nameInput && !nameInput.value) nameInput.value = parsedData.coordinatorName;
        } else {
            setVal("cust-director-id", parsedData.directorId);
        }
        const coordInput = document.getElementById("cust-coordinator");
        if (parsedData.coordinatorName && coordInput && !coordInput.value) coordInput.value = parsedData.coordinatorName;
    } else if (docType === 'cust-cert' || docType === 'cust-commerce') {
        setVal("cust-company-name", parsedData.companyName);
        setVal("cust-tax-id", parsedData.taxId);
        if (docType === 'cust-cert') {
            setVal("cust-cert-issue-date", normalizeDisplayDateYear(parsedData.issueDate));
            updateCertExpiryDisplay();
        }
    } else if (docType === 'cust-house') {
        const nameInput = document.getElementById("cust-company-name");
        if (parsedData.companyName && nameInput && !nameInput.value) nameInput.value = parsedData.companyName;
    }
}

// หนังสือรับรองบริษัทไม่มีวันหมดอายุพิมพ์ไว้จริง — ใช้กฎอายุการใช้งานเอง (ออกไม่เกิน 6 เดือนถึงใช้ยื่นได้)
// คำนวณจากวันที่ออกที่ผู้ใช้กรอก/OCR อ่านมา แล้วแสดงผลอย่างเดียว ค่าจริงที่บันทึกลง DB คำนวณซ้ำอีกครั้งใน saveCustomer()
function calcCertExpiry(issueDateStr) {
    const d = safeParseDate(issueDateStr);
    if (!d) return null;
    const expiry = new Date(d);
    expiry.setMonth(expiry.getMonth() + 6);
    return expiry;
}

function updateCertExpiryDisplay() {
    const issueVal = document.getElementById("cust-cert-issue-date").value.trim();
    const displayEl = document.getElementById("cust-cert-expiry-display");
    if (!displayEl) return;
    const expiry = isValidDate(issueVal) ? calcCertExpiry(issueVal) : null;
    displayEl.value = expiry ? expiry.toLocaleDateString('en-GB') : '';
}

// แนบไฟล์เอกสารนายจ้างแล้วอัปโหลดขึ้น Supabase Storage ทันที (เหมือนฟอร์มคนงาน — ใช้ Gemini จริงอ่านข้อมูลให้)
// นายจ้างใหม่ที่ยังไม่มี id ก็อัปโหลดได้ตามปกติ (uploadDocumentFile รองรับ customerId ว่างอยู่แล้ว เหมือน workerId
// ว่างของฟอร์มคนงาน) จึงไม่ต้องรอให้กด "บันทึกข้อมูล" ก่อนเหมือนเดิม — ผู้ใช้เห็นผล AI เติมฟอร์มได้ก่อนบันทึกจริง
// แนบได้หลายไฟล์ต่อประเภทเอกสาร (สะสมไว้ทั้งหมด) และลบไฟล์ที่แนบผิดออกได้ก่อนกดบันทึก
function processCustomerDocFile(file, docType) {
    const statusEl = document.getElementById(`status-${docType}`);
    const uploadBox = document.getElementById(`drop-${docType}`);
    if (!statusEl) return Promise.resolve();

    statusEl.innerHTML = `<span class="ai-processing">${icon("clip")} กำลังแนบไฟล์...</span>`;

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const fileContent = e.target.result;

            const editId = document.getElementById("customer-edit-id").value;
            const nameClean = (document.getElementById("cust-company-name").value.trim() || "customer").replace(/\s+/g, '_');
            const existingList = tempCustomerAttachments[docType] || [];
            const suffix = existingList.length > 0 ? `_${existingList.length + 1}` : "";
            const fileName = `${nameClean}_${docType}${suffix}${extFromDataUrl(fileContent)}`;

            const uploadResult = await uploadDocumentFile(fileContent, fileName, editId, "", docType);
            if (uploadResult && uploadResult.aiRejected) {
                renderCustomerAttachmentStatus(docType);
                statusEl.insertAdjacentHTML('afterbegin', `<span class="ai-error">${icon("warn", "amber")} ${getAiRejectedMessage(uploadResult.ocrError)}</span>`);
                resolve();
                return;
            }
            const storedUrl = uploadResult ? uploadResult.fileUrl : null;
            const serverUrl = storedUrl || await uploadFileToServer(fileContent, fileName);
            const updatedList = [...(tempCustomerAttachments[docType] || []), { name: fileName, data: serverUrl || fileContent }];
            tempCustomerAttachments[docType] = updatedList;

            if (uploadResult && uploadResult.parsedData) {
                applyGeminiDataToCustomerForm(docType, uploadResult.parsedData);
                showToast("✨ AI อ่านข้อมูลจากเอกสารและกรอกฟอร์มให้อัตโนมัติแล้ว กรุณาตรวจสอบความถูกต้องอีกครั้ง", "success");
            }

            if (uploadResult) {
                renderCustomerAttachmentStatus(docType);
                if (uploadResult.manualEntry) focusManualEntryFields(docType);
            } else {
                statusEl.innerHTML = `<span class="ai-error">${icon("bad")} อัปโหลดไม่สำเร็จ (ไฟล์ถูกเก็บไว้ในเครื่องชั่วคราว)</span>` + renderAttachmentChipsHtml(updatedList, idx => `removeStagedCustomerAttachment('${docType}', ${idx})`, idx => `previewStagedCustomerAttachment('${docType}', ${idx})`);
                if (uploadBox) uploadBox.classList.add("success-upload");
            }
            resolve();
        };
        reader.readAsDataURL(file);
    });
}

// สร้าง HTML รายการไฟล์ที่แนบไว้ (ยังไม่ได้อัปโหลด/บันทึก) พร้อมปุ่มดูตัวอย่างไฟล์ และปุ่ม × ลบไฟล์ที่แนบผิดออกทีละไฟล์
function renderAttachmentChipsHtml(fileList, buildRemoveCall, buildPreviewCall) {
    if (!fileList || fileList.length === 0) return '';
    return `<div style="display:flex; flex-direction:column; gap:4px; text-align:left; margin-top:4px;">` +
        fileList.map((f, idx) => `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:4px; padding:3px 6px; font-size:11.5px;">
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#166534; ${buildPreviewCall ? 'cursor:pointer; text-decoration:underline dotted;' : ''}"
                      title="${buildPreviewCall ? `คลิกเพื่อดูตัวอย่างไฟล์: ${f.name}` : f.name}"
                      ${buildPreviewCall ? `onclick="${buildPreviewCall(idx)}"` : ''}>${icon("ok")} ${f.name}</span>
                <button type="button" onclick="${buildRemoveCall(idx)}" title="ลบไฟล์นี้ออก" style="background:none; border:none; color:#dc2626; cursor:pointer; font-weight:700; font-size:14px; line-height:1; flex-shrink:0; padding:0 2px;">×</button>
            </div>
        `).join('') +
    `</div>`;
}

// เปิดไฟล์ที่แนบไว้ (ยังไม่ได้บันทึกจริง อาจเป็น data URL ในเครื่อง หรือ URL ที่อัปโหลดขึ้นคลาวด์แล้ว) ในแท็บใหม่เพื่อดูตัวอย่างก่อนกดบันทึก
// เปิดแท็บเปล่าไว้ก่อนแบบ sync (กัน popup blocker) แล้วค่อยเซ็ต location ทีหลังหลัง fetch/แปลงเป็น blob เสร็จ
async function previewAttachmentData(dataOrUrl) {
    if (!dataOrUrl) return;
    const win = window.open('', '_blank');
    if (typeof dataOrUrl === 'string' && dataOrUrl.startsWith('data:')) {
        try {
            const res = await fetch(dataOrUrl);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            if (win) win.location.href = blobUrl;
            return;
        } catch (err) {
            // แปลงเป็น blob ไม่สำเร็จ — ลองเปิด data URL ตรงๆ แทน
        }
    }
    if (win) win.location.href = dataOrUrl;
}

function previewStagedWorkerAttachment(docType, index) {
    const list = tempWorkerAttachments[docType] || [];
    if (list[index]) previewAttachmentData(list[index].data);
}

function previewStagedCustomerAttachment(docType, index) {
    const list = tempCustomerAttachments[docType] || [];
    if (list[index]) previewAttachmentData(list[index].data);
}

function renderCustomerAttachmentStatus(docType) {
    const statusEl = document.getElementById(`status-${docType}`);
    const uploadBox = document.getElementById(`drop-${docType}`);
    if (!statusEl) return;
    const list = tempCustomerAttachments[docType] || [];
    statusEl.innerHTML = renderAttachmentChipsHtml(list, idx => `removeStagedCustomerAttachment('${docType}', ${idx})`, idx => `previewStagedCustomerAttachment('${docType}', ${idx})`);
    if (uploadBox) uploadBox.classList.toggle('success-upload', list.length > 0);
}

// ลบไฟล์ที่แนบผิดออกจากรายการที่รอบันทึก (ยังไม่ได้อัปโหลดขึ้นคลาวด์ ลบได้ทันทีไม่ต้องยืนยัน)
function removeStagedCustomerAttachment(docType, index) {
    const list = tempCustomerAttachments[docType] || [];
    list.splice(index, 1);
    if (list.length === 0) delete tempCustomerAttachments[docType];
    else tempCustomerAttachments[docType] = list;
    renderCustomerAttachmentStatus(docType);
}

// ==================== AI (Gemini) FIELD MAPPING — ใช้ร่วมกันทั้งฝั่งฟอร์ม (DOM) และฝั่งแฟ้มเอกสาร/bulk import (object) ====================
// แปลงค่าเพศ/คำนำหน้าดิบจาก AI ให้เป็นค่ามาตรฐานของระบบ คืน null ถ้าอ่านไม่ออก/ไม่ตรงรูปแบบที่รู้จัก
// รองรับทุกรูปแบบที่ AI อาจส่งมา: Male/Female, ชาย/หญิง, ตัวย่อบนพาสปอร์ต M/F (หรือ "Sex: M"), ช./ญ.,
// คำนำหน้าอังกฤษ Mr/Mrs/Miss/Ms และภาษาพม่า ကျား (ชาย) / မ (หญิง)
function mapGeminiGender(rawGender) {
    if (!rawGender) return null;
    const g = String(rawGender).trim().toLowerCase();
    if (g.includes("female") || g.includes("หญิง") || g.includes("woman")) return "Female";
    if (g.includes("male") || g.includes("ชาย") || g.includes("man")) return "Male";
    const core = g.replace(/^(sex|gender|เพศ)\s*[:\-]?\s*/, '').replace(/[.\s]/g, '');
    if (["f", "ญ", "mrs", "miss", "ms", "မ"].includes(core)) return "Female";
    if (["m", "ช", "mr", "ကျား"].includes(core)) return "Male";
    return null;
}

// เพศว่างแต่มีคำนำหน้า (นาย/นาง/นางสาว/เด็กชาย/เด็กหญิง) → เติมเพศจากคำนำหน้า; ใช้ก่อนบันทึกคนงานทุกช่องทาง
function fillGenderFromTitle(w) {
    if (w && !w.gender) {
        const g = deriveGenderFromTitle(w.title);
        if (g) w.gender = g;
    }
    return w;
}

// อ่านคำนำหน้าจากต้นข้อความ — รองรับทั้งคำเต็ม, ตัวย่อ (น.ส. / ด.ช. / ด.ญ. / Mr.) และแบบติดกับชื่อ (เช่น "นายหม่อง")
// เรียงคำยาวก่อน: "นางสาว" ต้องเช็คก่อน "นาง" ไม่งั้นจะได้ "นาง" ผิด
const TITLE_PATTERNS = [
    [/^เด็กชาย/, "เด็กชาย"], [/^ด\s*\.\s*ช\s*\.?/, "เด็กชาย"],
    [/^เด็กหญิง/, "เด็กหญิง"], [/^ด\s*\.\s*ญ\s*\.?/, "เด็กหญิง"],
    [/^นางสาว/, "นางสาว"], [/^น\s*\.\s*ส\s*\.?/, "นางสาว"],
    [/^นาง/, "นาง"],
    [/^นาย/, "นาย"],
    [/^mrs\b/i, "นาง"],
    [/^(miss|ms)\b/i, "นางสาว"],
    [/^mr\b/i, "นาย"]
];

function mapGeminiTitle(rawTitle) {
    if (!rawTitle) return null;
    const t = String(rawTitle).trim();
    const hit = TITLE_PATTERNS.find(([re]) => re.test(t));
    return hit ? hit[1] : null;
}

// คำนำหน้าจากผล AI: ช่อง title ก่อน ถ้าว่างให้ดูว่าพิมพ์ติดมากับชื่อหรือไม่ (บัตรชมพูมักพิมพ์ "นายxxx" ในชื่อไทย เลยไม่ถูกแยกมาใส่ช่อง title)
function readOcrTitle(p) {
    if (!p) return null;
    return mapGeminiTitle(p.title) || mapGeminiTitle(p.thaiName) || mapGeminiTitle(p.firstName);
}

// เอกสารส่วนใหญ่ (พาสปอร์ต/ใบอนุญาตทำงาน) ไม่พิมพ์คำนำหน้า มีแต่เพศ — ใช้ค่าตั้งต้นเดียวกับ Bulk Import (หญิง = นางสาว แก้เป็น นาง ได้เอง)
function defaultTitleForGender(gender) {
    if (gender === 'Male') return 'นาย';
    if (gender === 'Female') return 'นางสาว';
    return null;
}

// สูตรเชื่อมโยงคำนำหน้านามกับเพศ — ใช้เติมเพศให้อัตโนมัติตอนแนบไฟล์เอกสาร กรณี AI อ่านคำนำหน้าได้แต่ไม่ได้อ่านเพศแยกมาให้ (หรืออ่านเพศไม่ออก)
const TITLE_TO_GENDER = {
    "นาย": "Male",
    "เด็กชาย": "Male",
    "นาง": "Female",
    "นางสาว": "Female",
    "เด็กหญิง": "Female"
};

function deriveGenderFromTitle(mappedTitle) {
    return TITLE_TO_GENDER[mappedTitle] || null;
}

// เติมข้อมูลลงฟอร์มคนงานจากผลลัพธ์ AI (Gemini) เท่านั้น — เติมเฉพาะฟิลด์ที่ AI อ่านเจอจริงๆ
// ไม่มีการเดา/สุ่มข้อมูลใดๆ ถ้า AI อ่านฟิลด์ไหนไม่เจอ ฟิลด์นั้นจะถูกข้ามไปเฉยๆ
function applyGeminiGenderToWorkerForm(rawGender) {
    const mapped = mapGeminiGender(rawGender);
    const genderSelect = document.getElementById("worker-gender");
    if (mapped && genderSelect) genderSelect.value = mapped;
}

function applyGeminiTitleToWorkerForm(parsedData) {
    const mapped = readOcrTitle(parsedData);
    const titleSelect = document.getElementById("worker-title");
    if (!mapped && titleSelect && !titleSelect.value) {
        // ไม่มีคำนำหน้าพิมพ์ในเอกสาร — เติมจากเพศเฉพาะตอนช่องยังว่าง (ไม่ทับที่ผู้ใช้เลือกไว้)
        const fallback = defaultTitleForGender(document.getElementById("worker-gender")?.value);
        if (fallback) titleSelect.value = fallback;
        return;
    }
    if (mapped && titleSelect) {
        titleSelect.value = mapped;

        // เชื่อมโยงคำนำหน้านามกับเพศ: ถ้ายังไม่มีการเติมเพศไว้ (AI ไม่ได้อ่านเพศแยกมาให้ หรืออ่านไม่ออก) ให้เติมเพศให้อัตโนมัติตามคำนำหน้า
        const genderSelect = document.getElementById("worker-gender");
        const derivedGender = deriveGenderFromTitle(mapped);
        if (genderSelect && !genderSelect.value && derivedGender) {
            genderSelect.value = derivedGender;
        }
    }
}

// กฎอ่านเอกสาร (2026-10-06): AI อ่านเลขประจำตัวคนต่างด้าว 13 หลักจากเอกสารที่แนบได้ แต่ไม่ตรงกับเลขเดิมของคนงาน
// → ถามก่อนพร้อมชื่อ + เลข 13 หลักของเดิมและของใหม่ว่าจะเปลี่ยนไหม (อาจแนบเอกสารผิดคน)
// คืน true = อัปโหลด + ใช้ข้อมูลจากเอกสาร (รวมเลขใหม่), false = ไม่อัปโหลดไฟล์เลย คงข้อมูลเดิม (ส่งเป็น options.confirmParsed ให้ uploadFile)
async function confirmWorkerUidChange(old, parsed, fileName) {
    const digits = v => String(v || '').replace(/\D/g, '');
    const oldUid = digits(old.uid), newUid = digits(parsed && parsed.uid);
    if (oldUid.length !== 13 || newUid.length !== 13 || oldUid === newUid) return true;
    const name = (f, l) => `${f || ''} ${l || ''}`.trim() || '-';
    return uiConfirm(`เลขประจำตัวคนต่างด้าว 13 หลักในเอกสาร${fileName ? ` "${fileName}"` : ''} ไม่ตรงกับข้อมูลเดิมของคนงาน — อาจแนบเอกสารผิดคน\nต้องการอัปโหลดและเปลี่ยนเป็นข้อมูลจากเอกสารนี้หรือไม่? (กด "ไม่อัปโหลด" = ไม่เก็บไฟล์นี้ และคงข้อมูลเดิม)`, {
        title: 'เลข 13 หลักไม่ตรงกับข้อมูลเดิม',
        summary: [
            { heading: 'ข้อมูลเดิม' },
            { label: 'ชื่อ', value: name(old.firstName, old.lastName) },
            { label: 'เลขประจำตัว 13 หลัก', value: oldUid },
            { heading: 'จากเอกสารที่แนบ' },
            { label: 'ชื่อ', value: name(parsed.firstName, parsed.lastName) },
            { label: 'เลขประจำตัว 13 หลัก', value: newUid },
        ],
        okText: 'เปลี่ยนเป็นข้อมูลใหม่',
        cancelText: 'ไม่อัปโหลด',
        danger: false
    });
}

function applyGeminiDataToWorkerForm(docType, parsedData) {
    if (!parsedData) return;
    const setVal = (id, val) => {
        if (val === undefined || val === null || val === "") return;
        const el = document.getElementById(id);
        if (el) el.value = normalizeDisplayDateYear(val); // ช่องวันที่: ปี พ.ศ. จาก AI -> ค.ศ.
    };
    // ข้อมูลจากใบอนุญาตทำงาน (ไฟล์ในช่องใบอนุญาต หรือ QR ของกรม): ถ้าใบนี้เก่ากว่าข้อมูลที่ฟอร์มมีอยู่
    // (เช่น ใบแทนฉบับเก่า) -> เติมเฉพาะช่องที่ยังว่าง ไม่ทับ (ดู shouldWpDocOverride)
    const wpOverride = (docType !== 'worker-wp-doc' && !parsedData.ewp) ||
        shouldWpDocOverride(parsedData, document.getElementById("worker-permit-expiry").value.trim());
    const setPermitVal = (id, val) => {
        const el = document.getElementById(id);
        if (!wpOverride && el && el.value.trim()) return;
        setVal(id, val);
    };
    if (!wpOverride) showToast("เอกสารใบอนุญาตทำงานนี้เก่ากว่าข้อมูลเดิม (หมดอายุก่อน) — คงข้อมูลเดิมไว้ เติมเฉพาะช่องที่ยังว่าง", "warning");
    const applyNationality = () => {
        if (!parsedData.nationality) return;
        const natSelect = document.getElementById("worker-nationality");
        const validOption = Array.from(natSelect.options).some(o => o.value === parsedData.nationality);
        if (validOption) natSelect.value = parsedData.nationality;
    };

    if (docType === 'worker-wp-doc') {
        setPermitVal("worker-uid", parsedData.uid);
        setPermitVal("worker-permit-no", parsedData.permitNo);
        setPermitVal("worker-permit-expiry", parsedData.permitExpiry);
        setPermitVal("worker-first-name", parsedData.firstName);
        setPermitVal("worker-last-name", parsedData.lastName);
        setPermitVal("worker-dob", parsedData.dob);
        setPermitVal("worker-ref-no", parsedData.refNo);
        setPermitVal("worker-position", parsedData.position);
        applyNationality();
        applyGeminiGenderToWorkerForm(parsedData.gender);
        applyGeminiTitleToWorkerForm(parsedData);
    } else if (docType === 'worker-passport') {
        setVal("worker-passport-no", parsedData.passportNo);
        setVal("worker-passport-pob", parsedData.passportPob);
        setVal("worker-passport-auth", parsedData.passportAuth);
        setVal("worker-passport-issue", parsedData.passportIssue);
        setVal("worker-passport-expiry", parsedData.passportExpiry);
        setVal("worker-dob", parsedData.dob);
        applyGeminiGenderToWorkerForm(parsedData.gender);
        applyGeminiTitleToWorkerForm(parsedData);
    } else if (docType === 'worker-pink-card') {
        setVal("worker-pink-card-no", parsedData.pinkCardNo);
        setVal("worker-thai-name", parsedData.thaiName);
        setVal("worker-insurance-no", parsedData.insuranceNo);
        setVal("worker-dob", parsedData.dob);
        applyGeminiGenderToWorkerForm(parsedData.gender);
        applyGeminiTitleToWorkerForm(parsedData);
    } else if (docType === 'worker-myanmar-id') {
        setVal("worker-first-name", parsedData.firstName);
        setVal("worker-last-name", parsedData.lastName);
        setVal("worker-dob", parsedData.dob);
        applyNationality();
        applyGeminiGenderToWorkerForm(parsedData.gender);
        applyGeminiTitleToWorkerForm(parsedData);
    } else if (docType === 'worker-insurance-doc') {
        setVal("worker-insurance-no", parsedData.insuranceNo);
    } else if (docType === 'worker-receipt') {
        // ใบเสร็จ: เติมเฉพาะช่องที่ยังว่าง (ไม่ทับข้อมูลจากใบอนุญาตทำงาน)
        if (!document.getElementById("worker-uid").value.trim()) setVal("worker-uid", parsedData.uid);
        if (!document.getElementById("worker-ref-no").value.trim()) setVal("worker-ref-no", parsedData.refNo);
    }
    if (parsedData.ewp) applyEwpDataToWorkerForm(parsedData, setPermitVal, wpOverride);
    if (docType === 'worker-wp-doc' || (parsedData.ewp && docType !== 'worker-passport')) applyWpPassportInfoToForm(parsedData);
    if (!document.getElementById("worker-email").value.trim()) setVal("worker-email", parsedData.email);
}

// ข้อมูลจาก QR ของกรมการจัดหางาน (parsedData.ewp — ดู ewpCardToParsedData ใน supabase-client.js) เป็นข้อมูลทางการ
// เติมครบทุกช่องที่กรมส่งมา ไม่ว่าจะแนบไว้ในช่องเอกสารประเภทไหน
const EWP_FORM_FIELDS = {
    uid: "worker-uid", permitNo: "worker-permit-no", permitExpiry: "worker-permit-expiry",
    firstName: "worker-first-name", lastName: "worker-last-name", dob: "worker-dob", position: "worker-position",
    thaiName: "worker-thai-name"
};
const EWP_OBJECT_FIELDS = {
    uid: "workerUid", permitNo: "permitNo", firstName: "firstName", lastName: "lastName", position: "position",
    thaiName: "thaiName"
};
const EWP_OBJECT_DATE_FIELDS = { permitExpiry: "permitExpiry", dob: "dob" };

// ==================== ข้อมูลเล่ม Passport/CI ที่พิมพ์อยู่ในใบอนุญาตทำงาน ====================
// e-WorkPermit (เช่น ใบมติ ครม.) มีหัวข้อ "ข้อมูลหนังสือเดินทาง" และ QR ของกรมก็ส่งเลขเอกสารเข้าเมืองมา —
// เติมลงช่องพาสปอร์ตเฉพาะเมื่อใบอนุญาตยังไม่หมดอายุ/ไม่ถูกยกเลิก (ใบเก่าอาจอ้างเล่มที่เลิกใช้แล้ว)
// ช่องพาสปอร์ตที่มีค่าอยู่แล้ว: เลขเล่มเดียวกัน = เติมเฉพาะช่องที่ยังว่าง, คนละเล่ม = ทับเฉพาะเมื่อเล่มในใบอนุญาตหมดอายุช้ากว่า
// (กันใบอนุญาตที่ออกก่อนต่อเล่มใหม่ มาทับเล่มใหม่ที่แนบจากพาสปอร์ตจริงแล้ว)
const WP_PASSPORT_KEYS = ["passportNo", "passportIssue", "passportExpiry", "passportAuth"];

function isWpDocStillValid(p) {
    if (p.ewp && EWP_BAD_STATUS_RE.test(`${p.ewp.statusName} ${p.ewp.statusDesc}`)) return false;
    const expiry = safeParseDate(p.permitExpiry);
    if (!expiry) return false; // อ่านวันหมดอายุไม่ได้ = ยืนยันไม่ได้ว่ายังใช้ได้ ไม่เติม
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return expiry >= todayStart;
}

// ช่องใบอนุญาตทำงานรับทั้งใบอนุญาตจริงและ "ใบแทนใบอนุญาตทำงาน" (ซึ่งอาจเป็นฉบับเก่าที่หมดอายุแล้ว) — ใช้ข้อมูลจากใบที่ยังไม่หมดอายุก่อนเสมอ
// ถ้าใช้ได้/หมดอายุเหมือนกันทั้งคู่ ใช้ใบที่หมดอายุช้ากว่า (= ฉบับล่าสุด) วันเท่ากัน (ใบแทนของใบเดียวกัน) ใบที่แนบทีหลังชนะ
// คืน true = ใบที่แนบใหม่ทับข้อมูลใบอนุญาตเดิมได้, false = เติมเฉพาะช่องที่ยังว่าง (ไม่ขึ้นกับลำดับที่แนบ)
function shouldWpDocOverride(p, currentPermitExpiry) {
    // เทียบเฉพาะวันที่ — "2026-03-01" (ค่าที่บันทึก) ถูกอ่านเป็นเที่ยงคืน UTC แต่ "01/03/2026" (จากเอกสาร) เป็นเที่ยงคืนเวลาไทย
    const dayOf = s => { const d = safeParseDate(s); return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null; };
    const cur = dayOf(currentPermitExpiry);
    if (!cur) return true; // ยังไม่มีข้อมูลใบอนุญาต -> ใช้ใบใหม่
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const curValid = cur >= todayStart;
    const newExp = dayOf(p.permitExpiry);
    if (isWpDocStillValid(p)) return !curValid || newExp >= cur;
    // ใบใหม่หมดอายุ/ถูกยกเลิก/อ่านวันไม่ได้: ไม่ทับใบที่ยังใช้ได้ — หมดอายุทั้งคู่เทียบวันหมดอายุ (อ่านวันไม่ได้ = ไม่ทับ)
    return !curValid && !!newExp && newExp >= cur;
}

// current = ค่าพาสปอร์ตปัจจุบันของคนงาน (key เดียวกับ WP_PASSPORT_KEYS) คืนเฉพาะช่องที่ควรเติม/ทับ หรือ null
function pickWpPassportUpdates(p, current) {
    if (!p || !p.passportNo || !isWpDocStillValid(p)) return null;
    const norm = v => String(v || "").replace(/\s+/g, "").toUpperCase();
    const updates = {};
    if (!norm(current.passportNo) || norm(current.passportNo) === norm(p.passportNo)) {
        WP_PASSPORT_KEYS.forEach(k => { if (p[k] && !current[k]) updates[k] = p[k]; });
    } else {
        const newExp = safeParseDate(p.passportExpiry), curExp = safeParseDate(current.passportExpiry);
        if (!newExp || (curExp && newExp <= curExp)) return null;
        WP_PASSPORT_KEYS.forEach(k => { if (p[k]) updates[k] = p[k]; });
    }
    return Object.keys(updates).length ? updates : null;
}

const WP_PASSPORT_FORM_IDS = {
    passportNo: "worker-passport-no", passportIssue: "worker-passport-issue",
    passportExpiry: "worker-passport-expiry", passportAuth: "worker-passport-auth"
};

function applyWpPassportInfoToForm(p) {
    const current = {};
    Object.entries(WP_PASSPORT_FORM_IDS).forEach(([k, id]) => { current[k] = document.getElementById(id).value.trim(); });
    const updates = pickWpPassportUpdates(p, current);
    if (!updates) return;
    Object.entries(updates).forEach(([k, v]) => {
        document.getElementById(WP_PASSPORT_FORM_IDS[k]).value = k === "passportNo" || k === "passportAuth" ? v : normalizeDisplayDateYear(v);
    });
}

function applyWpPassportInfoToWorker(w, p) {
    const updates = pickWpPassportUpdates(p, {
        passportNo: w.passportNo, passportIssue: w.passportIssue, passportExpiry: w.passportExpiry, passportAuth: w.passportAuth
    });
    if (!updates) return;
    Object.entries(updates).forEach(([k, v]) => {
        w[k] = k === "passportNo" || k === "passportAuth" ? v : (parseDateInput(v) || w[k]);
    });
}

// override = false: QR มาจากใบที่หมดอายุแล้ว แต่ฟอร์มมีข้อมูลจากใบที่ยังใช้ได้ — setVal เติมเฉพาะช่องว่าง และไม่ล้าง/เปลี่ยนค่าอื่น
function applyEwpDataToWorkerForm(p, setVal, override = true) {
    Object.entries(EWP_FORM_FIELDS).forEach(([key, id]) => setVal(id, p[key]));
    if (!override) return;
    if (p.lastName === "") document.getElementById("worker-last-name").value = "";
    const natSelect = document.getElementById("worker-nationality");
    if (p.nationality && Array.from(natSelect.options).some(o => o.value === p.nationality)) natSelect.value = p.nationality;
    const title = mapGeminiTitle(p.title);
    if (title) {
        document.getElementById("worker-title").value = title;
        const gender = deriveGenderFromTitle(title);
        if (gender) document.getElementById("worker-gender").value = gender;
    }
}

// override = false: QR มาจากใบที่หมดอายุแล้ว แต่คนงานมีข้อมูลจากใบที่ยังใช้ได้ — เติมเฉพาะช่องที่ยังว่าง
function applyEwpDataToWorker(w, p, override = true) {
    if (!override) {
        Object.entries(EWP_OBJECT_FIELDS).forEach(([key, field]) => { if (p[key] && !w[field]) w[field] = p[key]; });
        Object.entries(EWP_OBJECT_DATE_FIELDS).forEach(([key, field]) => { if (p[key] && !w[field]) w[field] = parseDateInput(p[key]); });
        if (p.nationality && !w.nationality) w.nationality = p.nationality;
        return;
    }
    Object.entries(EWP_OBJECT_FIELDS).forEach(([key, field]) => { if (p[key]) w[field] = p[key]; });
    if (p.firstName && p.lastName === "") w.lastName = "";
    Object.entries(EWP_OBJECT_DATE_FIELDS).forEach(([key, field]) => { if (p[key]) w[field] = parseDateInput(p[key]) || w[field]; });
    if (p.nationality) w.nationality = p.nationality;
    const title = mapGeminiTitle(p.title);
    if (title) {
        w.title = title;
        w.gender = deriveGenderFromTitle(title) || w.gender;
    }
}

// แจ้งผลจาก QR ของกรม: ใบอนุญาตถูกยกเลิก/เพิกถอน/หมดอายุ = เตือนแดง (บนบัตรไม่มีข้อมูลนี้ ต้องรู้จาก QR เท่านั้น)
const EWP_BAD_STATUS_RE = /ยกเลิก|เพิกถอน|หมดอายุ|สิ้นสุด|cancel|revok|expire|terminat/i;
function notifyEwpStatus(parsedData, label = "") {
    const ewp = parsedData && parsedData.ewp;
    if (!ewp) return;
    const who = label ? ` (${label})` : "";
    if (EWP_BAD_STATUS_RE.test(`${ewp.statusName} ${ewp.statusDesc}`)) {
        showToast(`⛔ กรมการจัดหางานแจ้ง: ${ewp.statusName || ewp.statusDesc}${who} — ตรวจสอบกับนายจ้างก่อนดำเนินการ`, "danger");
    } else {
        showToast(`🔎 อ่าน QR กรมการจัดหางานแล้ว${who}: ${ewp.statusName || "ได้ข้อมูลทางการ"}`, "success");
    }
}

// คืนนามสกุลไฟล์จาก data URL (เช่น "data:image/jpeg;base64,..." -> ".jpg")
// จำเป็นเพราะชื่อไฟล์ที่อัปโหลดขึ้น Storage ถูกสร้างขึ้นใหม่ (ไม่ใช้ชื่อไฟล์เดิม) — ถ้าไม่มีนามสกุลติดไปด้วย
// renderDriveThumbnail() จะดูไม่ออกว่าเป็นไฟล์รูปภาพ เลยแสดงไอคอนเปล่าแทน preview รูปจริง
function extFromDataUrl(dataUrl) {
    const match = (dataUrl || '').match(/^data:([^;]+);/);
    if (!match) return '';
    const mimeType = match[1].toLowerCase();
    const MIME_EXT_MAP = {
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
        'image/webp': 'webp', 'image/bmp': 'bmp', 'application/pdf': 'pdf'
    };
    if (MIME_EXT_MAP[mimeType]) return '.' + MIME_EXT_MAP[mimeType];
    const subtype = mimeType.split('/')[1];
    return subtype ? '.' + subtype.replace(/[^a-z0-9]/g, '') : '';
}

// แนบไฟล์เอกสารคนงาน แล้วอัปโหลดขึ้น Supabase Storage (ไม่มีการอ่านข้อมูลด้วย AI ปลอมๆ อีกต่อไป — ใช้ Gemini จริงเท่านั้น)
// ชื่อไฟล์เอกสารคนงาน = เลขประจำตัวคนต่างด้าว 13 หลัก_ชื่อ_ประเภทเอกสาร (เช่น 1234567890123_AUNG_NAING_WP.pdf)
// ไม่มีเลข 13 หลักครบ = ขึ้นต้นด้วยชื่อ, ไฟล์ที่ 2 ขึ้นไปของประเภทเดียวกันต่อท้าย _2, _3
// ประเภทเป็นภาษาอังกฤษ — ชื่อไฟล์ใน Storage ใช้ได้เฉพาะ A-Z/0-9 (ภาษาไทยจะกลายเป็น _)
const WORKER_DOC_FILE_CODES = {
    'worker-wp-doc': 'WP', 'worker-passport': 'Passport', 'worker-visa': 'Visa', 'worker-myanmar-id': 'MyanmarID',
    'worker-pink-card': 'PinkCard', 'worker-receipt': 'Receipt', 'worker-medical': 'Medical',
    'worker-insurance-doc': 'Insurance', 'worker-application': 'Application', 'worker-other': 'Other'
};
function workerDocFileName(uid, firstName, lastName, docType, suffix, ext) {
    const digits = String(uid || '').replace(/\D/g, '');
    const name = [firstName, lastName].map(s => String(s || '').trim()).filter(Boolean).join(' ').replace(/\s+/g, '_') || 'worker';
    const code = WORKER_DOC_FILE_CODES[docType] || String(docType || 'doc').replace(/^worker-/, '');
    return `${digits.length === 13 ? `${digits}_` : ''}${name}_${code}${suffix}${ext}`;
}

// ให้ uploadDocumentFile ตั้งชื่อไฟล์จากข้อมูลคนงานที่มีอยู่ ส่วนที่ยังว่าง (เช่น เพิ่มคนงานใหม่ เลข 13 หลัก/ชื่อยังไม่ได้กรอก)
// เติมจากที่ AI อ่านได้จากเอกสารใบนั้น
function workerDocNameOptions(known, docType, suffix, ext) {
    return {
        nameFromOcr: (p) => {
            const knownUid = String(known.uid || '').replace(/\D/g, '').length === 13;
            const uid = knownUid ? known.uid : (p && p.uid) || known.uid;
            const useOcrName = !String(known.firstName || '').trim() && p && p.firstName;
            return workerDocFileName(uid, useOcrName ? p.firstName : known.firstName, useOcrName ? (p.lastName || '') : known.lastName, docType, suffix, ext);
        }
    };
}

// เปลี่ยนชื่อไฟล์เอกสารคนงานที่แนบไว้แล้วทั้งหมดให้เป็นรูปแบบเดียวกัน (Admin, หน้าสำรองข้อมูล)
// เปลี่ยนเฉพาะชื่อที่แสดง/ชื่อตอนดาวน์โหลด — ลิงก์ไฟล์ใน Storage คงเดิม ไม่ต้องอัปโหลดใหม่
async function renameAllWorkerDocFiles() {
    if (currentUser.role !== 'admin') { showToast("❌ เฉพาะ Admin เท่านั้น", "danger"); return; }
    const pending = [];
    allWorkers().forEach(w => {
        const atts = w.attachments || {};
        let changed = 0;
        const next = {};
        Object.keys(atts).forEach(docType => {
            // getAttachments แปลงไฟล์แบบเก่า (string เดี่ยว) เป็นรายการให้ด้วย — ห้ามทิ้งไฟล์ที่ไม่ใช่ array
            const list = getAttachments(w, docType);
            next[docType] = list.map((f, idx) => {
                if (!f || typeof f !== 'object') return f;
                const m = String(f.name || '').match(/\.[A-Za-z0-9]{1,5}$/);
                const ext = m ? m[0] : extFromDataUrl(String(f.data || ''));
                const name = workerDocFileName(w.workerUid, w.firstName, w.lastName, docType, idx > 0 ? `_${idx + 1}` : '', ext);
                if (name === f.name) return f;
                changed++;
                return { ...f, name };
            });
        });
        if (changed) pending.push({ w, next, changed });
    });
    if (!pending.length) { uiAlert("ชื่อไฟล์เอกสารคนงานทุกไฟล์เป็นรูปแบบใหม่อยู่แล้ว"); return; }
    const files = pending.reduce((s, p) => s + p.changed, 0);
    if (!(await uiConfirm(`จะเปลี่ยนชื่อไฟล์ ${files} ไฟล์ ของคนงาน ${pending.length} คน\nเป็นรูปแบบ เลข13หลัก_ชื่อ_ประเภท (เช่น 1234567890123_AUNG_NAING_WP.pdf)\nลิงก์ไฟล์เดิมยังใช้ได้ ไม่ต้องอัปโหลดใหม่`, {
        title: 'เปลี่ยนชื่อไฟล์เอกสารคนงานย้อนหลัง', okText: 'เปลี่ยนชื่อ', danger: false }))) return;
    let ok = 0, fail = 0;
    for (const { w, next } of pending) {
        const before = w.attachments;
        w.attachments = next;
        const res = await callCloudAPI("saveWorker", { workerData: w });
        if (!res || res.status === "error") { w.attachments = before; fail++; } else ok++;
        if ((ok + fail) % 20 === 0) showToast(`กำลังเปลี่ยนชื่อไฟล์... ${ok + fail}/${pending.length} คน`, "warning");
    }
    saveData();
    renderWorkers();
    if (fail) showToast(`⚠️ เปลี่ยนชื่อสำเร็จ ${ok} คน ไม่สำเร็จ ${fail} คน — กดอีกครั้งเพื่อลองใหม่เฉพาะที่เหลือ`, "danger");
    else showToast(`✅ เปลี่ยนชื่อไฟล์เอกสารของคนงาน ${ok} คนเรียบร้อยแล้ว`, "success");
}

function processUploadedFile(file, docType) {
    const statusEl = document.getElementById(`status-${docType}`);
    const uploadBox = document.getElementById(`drop-${docType}`);

    if (!statusEl) return Promise.resolve();

    statusEl.innerHTML = `<span class="ai-processing">${icon("clip")} กำลังแนบไฟล์...</span>`;

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const fileContent = e.target.result;

            const editId = document.getElementById("worker-edit-id").value;
            const employerId = document.getElementById("worker-employer-id").value;
            const workerUid = document.getElementById("worker-uid").value.trim();
            const existingList = tempWorkerAttachments[docType] || [];
            const suffix = existingList.length > 0 ? `_${existingList.length + 1}` : "";
            const ext = extFromDataUrl(fileContent);
            const known = { uid: workerUid, firstName: document.getElementById("worker-first-name").value.trim(), lastName: document.getElementById("worker-last-name").value.trim() };
            let fileName = workerDocFileName(known.uid, known.firstName, known.lastName, docType, suffix, ext);

            // เลข 13 หลักในเอกสารไม่ตรงกับในฟอร์ม → ถามก่อนอัปโหลด (กด "ไม่อัปโหลด" = ไม่เก็บไฟล์)
            const uploadResult = await uploadDocumentFile(fileContent, fileName, employerId, editId, docType, {
                ...workerDocNameOptions(known, docType, suffix, ext),
                confirmParsed: (p) => confirmWorkerUidChange(known, p, file.name)
            });
            if (uploadResult && uploadResult.cancelled) {
                renderWorkerAttachmentStatus(docType);
                statusEl.insertAdjacentHTML('afterbegin', `<span class="ai-error">${icon("warn", "amber")} ไม่ได้อัปโหลด "${escapeHtml(file.name)}" — เลข 13 หลักไม่ตรงกับคนงานนี้</span>`);
                resolve();
                return;
            }
            if (uploadResult && uploadResult.fileName) fileName = uploadResult.fileName;
            if (uploadResult && uploadResult.aiRejected) {
                renderWorkerAttachmentStatus(docType);
                statusEl.insertAdjacentHTML('afterbegin', `<span class="ai-error">${icon("warn", "amber")} ${getAiRejectedMessage(uploadResult.ocrError)}</span>`);
                resolve();
                return;
            }
            const storedUrl = uploadResult ? uploadResult.fileUrl : null;
            const serverUrl = storedUrl || await uploadFileToServer(fileContent, fileName);
            // เก็บสะสมทุกไฟล์ที่เคยแนบไว้ (เช่น เอกสารต่ออายุรายปี) ไม่ลบของเก่าทิ้งเมื่อแนบไฟล์ใหม่
            const updatedList = [...(tempWorkerAttachments[docType] || []), { name: fileName, data: serverUrl || fileContent, expiryDate: extractDocExpiryDate(docType, uploadResult && uploadResult.parsedData) }];
            tempWorkerAttachments[docType] = updatedList;

            if (uploadResult && uploadResult.parsedData) {
                applyGeminiDataToWorkerForm(docType, uploadResult.parsedData);
                showToast("✨ AI อ่านข้อมูลจากเอกสารและกรอกฟอร์มให้อัตโนมัติแล้ว กรุณาตรวจสอบความถูกต้องอีกครั้ง", "success");
            }

            if (uploadResult) {
                renderWorkerAttachmentStatus(docType);
                if (uploadResult.manualEntry) focusManualEntryFields(docType);
            } else {
                statusEl.innerHTML = `<span class="ai-error">${icon("bad")} อัปโหลดไม่สำเร็จ (ไฟล์ถูกเก็บไว้ในเครื่องชั่วคราว)</span>` + renderAttachmentChipsHtml(updatedList, idx => `removeStagedWorkerAttachment('${docType}', ${idx})`, idx => `previewStagedWorkerAttachment('${docType}', ${idx})`);
                uploadBox.classList.add("success-upload");
            }
            resolve();
        };
        reader.readAsDataURL(file);
    });
}

function renderWorkerAttachmentStatus(docType) {
    const statusEl = document.getElementById(`status-${docType}`);
    const uploadBox = document.getElementById(`drop-${docType}`);
    if (!statusEl) return;
    const list = tempWorkerAttachments[docType] || [];
    statusEl.innerHTML = renderAttachmentChipsHtml(list, idx => `removeStagedWorkerAttachment('${docType}', ${idx})`, idx => `previewStagedWorkerAttachment('${docType}', ${idx})`);
    if (uploadBox) uploadBox.classList.toggle('success-upload', list.length > 0);
}

// ลบไฟล์ที่แนบผิดออกจากรายการที่รอบันทึก — ใช้ได้ทั้งไฟล์ที่เพิ่งแนบใหม่และไฟล์เดิมตอนแก้ไขคนงาน
// (ถ้าเป็นไฟล์เดิมที่เคยบันทึกไว้แล้ว ต้องกด "บันทึกข้อมูล" อีกครั้งถึงจะมีผลจริงกับฐานข้อมูล)
function removeStagedWorkerAttachment(docType, index) {
    const list = tempWorkerAttachments[docType] || [];
    list.splice(index, 1);
    if (list.length === 0) delete tempWorkerAttachments[docType];
    else tempWorkerAttachments[docType] = list;
    renderWorkerAttachmentStatus(docType);
}

// ==================== MODAL ACTIONS (SAVE, EDIT, DELETE) ====================

// --- CUSTOMERS ---
function openCustomerModal(id = null) {
    // Reset forms
    document.getElementById("customer-form").reset();
    document.querySelectorAll("#cust-business-type .bt-extra").forEach(el => el.remove());
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
        applyCustomerEntityType(isIndividualCustomer(c) ? 'individual' : 'juristic');
        setCustomerBusinessTypes(c.businessType);
        document.getElementById("cust-coordinator").value = c.coordinator;
        document.getElementById("cust-phone").value = c.phone;
        document.getElementById("cust-billing-note").value = c.billingNote || "";
        document.getElementById("cust-require-prepayment").checked = !!c.requirePrepayment;
        document.getElementById("cust-email").value = c.email || "";
        document.getElementById("cust-drive-share").checked = !!c.driveShare;
        refreshCustomerAgentDropdown(c.referredByAgentId);
        document.getElementById("cust-cert-issue-date").value = formatDateForInput(c.certIssueDate || '');
        updateCertExpiryDisplay();

        customerBranches = JSON.parse(JSON.stringify(c.branches)); // Clone
        loadDeliveryAddressFields(c.deliveryAddress);
    } else {
        modalTitle.innerText = "เพิ่มลูกค้า / นายจ้างใหม่";
        editIdInput.value = "";
        applyCustomerEntityType('');
        refreshCustomerAgentDropdown();
        updateCertExpiryDisplay();

        // Initialize with default empty branch
        customerBranches = [{
            name: "สำนักงานใหญ่",
            houseNo: "", moo: "", soi: "", road: "", subdistrict: "", district: "", province: "สงขลา", postalCode: ""
        }];
        loadDeliveryAddressFields(null);
    }

    renderBranchesInputs();
    switchCustomerModalTab('general');
    document.getElementById("customer-modal").classList.remove("hidden");
}

function closeCustomerModal() {
    document.getElementById("customer-modal").classList.add("hidden");
}

// ==================== DOCUMENT DELIVERY ADDRESS (ใบปะหน้า A5) ====================
function switchCustomerModalTab(tab) {
    const tabs = ['general', 'delivery'];
    tabs.forEach(t => {
        const pane = document.getElementById(`cust-tab-${t}`);
        const btn = document.getElementById(`btn-cust-tab-${t}`);
        if (pane) pane.classList.toggle('hidden', t !== tab);
        if (btn) {
            btn.classList.toggle('btn-gold', t === tab);
            btn.classList.toggle('btn-outline', t !== tab);
        }
    });
    if (tab === 'delivery') refreshDeliverySamePreview();
}

function loadDeliveryAddressFields(deliveryAddress) {
    const da = deliveryAddress || { sameAsMain: true };
    const sameAsMain = da.sameAsMain !== false;
    document.getElementById("cust-delivery-same-as-main").checked = sameAsMain;
    document.getElementById("cust-delivery-recipient").value = da.recipientName || "";
    document.getElementById("cust-delivery-phone").value = da.phone || "";
    document.getElementById("cust-delivery-house-no").value = da.houseNo || "";
    document.getElementById("cust-delivery-moo").value = da.moo || "";
    document.getElementById("cust-delivery-soi").value = da.soi || "";
    document.getElementById("cust-delivery-road").value = da.road || "";
    document.getElementById("cust-delivery-subdistrict").value = da.subdistrict || "";
    document.getElementById("cust-delivery-district").value = da.district || "";
    document.getElementById("cust-delivery-province").value = da.province || "";
    document.getElementById("cust-delivery-postal").value = da.postalCode || "";
    updateDeliveryAddressLists(); // รายการอำเภอ/ตำบลตามจังหวัดที่บันทึกไว้
    toggleDeliverySameAsMain();
}

function toggleDeliverySameAsMain() {
    const sameAsMain = document.getElementById("cust-delivery-same-as-main").checked;
    document.getElementById("cust-delivery-fields-wrap").classList.toggle('hidden', sameAsMain);
    document.getElementById("cust-delivery-same-preview").classList.toggle('hidden', !sameAsMain);
    if (sameAsMain) refreshDeliverySamePreview();
}

// อ่านที่อยู่จัดส่งเอกสารจาก "สถานะปัจจุบันของฟอร์ม" เสมอ (ไม่ใช่ข้อมูลที่บันทึกไว้ล่าสุด)
// เพื่อให้ preview และใบปะหน้า A5 ตรงกับสิ่งที่กำลังกรอกอยู่ ไม่ต้องกดบันทึกก่อนถึงจะพิมพ์ได้
function getCurrentFormDeliveryInfo() {
    const companyName = document.getElementById("cust-company-name").value || "";
    const phone = document.getElementById("cust-phone").value || "";
    const coordinator = document.getElementById("cust-coordinator").value || "";
    const sameAsMain = document.getElementById("cust-delivery-same-as-main").checked;

    if (sameAsMain) {
        const hq = customerBranches.find(b => (b.name || "").includes("สำนักงานใหญ่")) || customerBranches[0] || {};
        return {
            recipientName: coordinator || companyName,
            companyName, phone,
            houseNo: hq.houseNo || '', moo: hq.moo || '', soi: hq.soi || '', road: hq.road || '',
            subdistrict: hq.subdistrict || '', district: hq.district || '', province: hq.province || '', postalCode: hq.postalCode || ''
        };
    }

    return {
        recipientName: document.getElementById("cust-delivery-recipient").value || coordinator || companyName,
        companyName,
        phone: document.getElementById("cust-delivery-phone").value || phone,
        houseNo: document.getElementById("cust-delivery-house-no").value,
        moo: document.getElementById("cust-delivery-moo").value,
        soi: document.getElementById("cust-delivery-soi").value,
        road: document.getElementById("cust-delivery-road").value,
        subdistrict: document.getElementById("cust-delivery-subdistrict").value,
        district: document.getElementById("cust-delivery-district").value,
        province: document.getElementById("cust-delivery-province").value,
        postalCode: document.getElementById("cust-delivery-postal").value
    };
}

function formatDeliveryAddressLine(info) {
    const parts = [
        `เลขที่ ${info.houseNo || '-'}`,
        info.moo ? `ม.${info.moo}` : '',
        info.soi ? `ซอย${info.soi}` : '',
        info.road ? `ถ.${info.road}` : '',
        `ต.${info.subdistrict || '-'}`,
        `อ.${info.district || '-'}`,
        `จ.${info.province || '-'}`,
        info.postalCode || ''
    ];
    return parts.filter(Boolean).join(' ');
}

function refreshDeliverySamePreview() {
    const previewEl = document.getElementById("cust-delivery-same-preview");
    if (!previewEl) return;
    const info = getCurrentFormDeliveryInfo();

    // ยังไม่มีข้อมูลอะไรให้ดึงเลย (เช่น เพิ่งเปิดฟอร์ม "เพิ่มลูกค้าใหม่" แล้วสลับมาแท็บนี้ทันที
    // ก่อนกรอกแท็บ "ข้อมูลทั่วไป" เลย) — โชว์คำแนะนำแทนกล่องว่างๆ ที่ดูเหมือนบั๊ก
    const hasAnyData = info.recipientName || info.companyName || info.phone || info.houseNo || info.subdistrict;
    if (!hasAnyData) {
        previewEl.innerHTML = `<span class="text-muted">${icon("warn")} ยังไม่มีข้อมูลให้ดึงมาแสดง — กรุณากรอกชื่อบริษัท, เบอร์โทร และที่อยู่สำนักงานใหญ่ในแท็บ "${icon("clipboard")} ข้อมูลทั่วไป" ก่อน แล้วค่อยกลับมาที่แท็บนี้</span>`;
        return;
    }

    previewEl.innerHTML = `
        <strong>${info.recipientName || '-'}</strong>${info.companyName ? ` (${info.companyName})` : ''}<br>
        ${formatDeliveryAddressLine(info)}<br>
        โทร: ${info.phone || '-'}
    `;
}

// บิล/ใบเสร็จพิมพ์ลง A4 แนวตั้ง ขอบ 10 มม. (หน้าตาบนจอเป็นแผ่น A4 เท่ากัน — ดู .invoice-sheet ใน styles.css)
const INVOICE_PAGE_CSS = "size: A4 portrait; margin: 10mm;";

function setPrintPageSize(pageCss) {
    let styleTag = document.getElementById("dynamic-print-page-size");
    if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "dynamic-print-page-size";
        document.head.appendChild(styleTag);
    }
    styleTag.textContent = pageCss ? `@media print { @page { ${pageCss} } }` : "";
}

function openDeliveryLabelModal() {
    const info = getCurrentFormDeliveryInfo();
    document.getElementById("dlv-recipient-name").innerText = info.recipientName || "-";
    document.getElementById("dlv-company-name").innerText = info.companyName || "-";
    document.getElementById("dlv-address").innerText = formatDeliveryAddressLine(info);
    document.getElementById("dlv-phone").innerText = info.phone ? `โทร: ${info.phone}` : "-";
    document.getElementById("dlv-date").innerText = formatThaiDate(new Date());

    setPrintPageSize("size: A5; margin: 12mm;");
    document.getElementById("delivery-label-modal").classList.remove("hidden");
}

// ==================== แบบ บต.46 หนังสือรับรองการจ้าง (รายบุคคล) ====================
// เติมข้อมูลนายจ้าง/คนงานที่มีในระบบ ช่องที่ไม่มีข้อมูล (รายได้ ค่าจ้าง ฯลฯ) เป็นเส้นประให้คลิกพิมพ์เองก่อนพิมพ์
// ลายเซ็น = ไฟล์ล่าสุดในแฟ้มนายจ้าง "cust-signature"
function openBt46Modal(workerId) {
    const w = workers.find(item => item.id === workerId);
    if (!w) return;
    const c = customers.find(item => item.id === w.employerId) || {};
    const individual = isIndividualCustomer(c);
    const sigs = getAttachments(c, 'cust-signature');
    const sigUrl = sigs.length ? (sigs[sigs.length - 1].data || '') : '';
    const f = (val, width) => `<span class="bt46-f" contenteditable="true" style="min-width:${width || 120}px">${escapeHtml(val || '')}</span>`;
    const box = (on) => `<span class="bt46-box" onclick="this.textContent = this.textContent === '☑' ? '☐' : '☑'">${on ? '☑' : '☐'}</span>`;
    const en = (t) => `<span class="bt46-en">${t}</span>`;
    const workerName = [w.title, w.firstName, w.lastName].filter(Boolean).join(' ');
    const address = getCustomerHQAddress(c.id) || w.workplace || '';
    const signer = individual ? c.companyName : (c.coordinator || '');

    document.getElementById("bt46-sheet").innerHTML = `
        <div class="bt46-head">
            <div class="bt46-formno">แบบ บต. ๔๖<br>${en('Form WP. 46')}</div>
            <div class="bt46-title">หนังสือรับรองการจ้าง<br>${en('EMPLOYMENT CERTIFICATION')}</div>
        </div>
        <h4>๑. ข้อมูลนายจ้าง ${en('Particulars of employer')}</h4>
        <p>๑.๑ ${box(!individual)} นิติบุคคลไทย จดทะเบียนเมื่อ ${f('', 120)} เลขที่ ${f(individual ? '' : c.taxId, 130)} ทุนจดทะเบียนชำระแล้ว ${f('', 100)} บาท</p>
        <p class="bt46-ind">${box(false)} นิติบุคคลต่างด้าว จดทะเบียนเมื่อ ${f('', 120)} จำนวนเงินที่นำเข้ามาจากต่างประเทศ ${f('', 120)} บาท</p>
        <p class="bt46-ind">${box(individual)} บุคคลธรรมดา บัตรประจำตัวประชาชนเลขที่ ${f(individual ? c.taxId : '', 150)} ใบอนุญาตทำงานเลขที่ ${f('', 110)}</p>
        <p>ชื่อนายจ้าง/สถานประกอบการ ${en('Name of employer')} ${f(c.companyName, 380)}</p>
        <p>ที่ตั้งสถานประกอบการ ${en('Address')} ${f(address, 470)}</p>
        <p>ประเภทกิจการ ${en('Type of business')} ${f(String(c.businessType || '').split(BUSINESS_TYPE_SEP).join(', '), 470)}</p>
        <p>๑.๒ สถานะด้านการเงิน ในรอบปีที่ผ่านมา ${en('Financial status of the company during the previous year')}</p>
        <table class="bt46-table">
            <tr><th>ปี พ.ศ.<br>${en('Years')}</th><th>รายได้<br>${en('Income')}</th><th>ภาษีเงินได้<br>${en('Tax')}</th></tr>
            <tr><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td></tr>
        </table>
        <p>รายได้ ปัจจุบัน ${en('Current income')} ${f('', 120)} บาท ในช่วงระยะเวลา ${en('For a duration of')} ${f('', 80)} เดือน</p>
        <p>${box(false)} มูลค่าการส่งออก ${en('Value of export')} ${f('', 160)} บาท</p>
        <p>${box(false)} ได้นำคนต่างประเทศเข้ามาท่องเที่ยวในรอบปีที่ผ่านมา ${f('', 100)} คน</p>
        <p>${box(false)} มีพนักงานคนไทย ${en('Total number of Thai employees')} ${f('', 80)} คน</p>
        <p>${box(true)} มีคนต่างด้าวทำงานอยู่ด้วยแล้ว ${en('Total number of foreign worker(s)')} ${f(String(workers.filter(x => x.employerId === c.id && x.status !== 'archived').length), 60)} คน</p>
        <p>${box(false)} จำนวนห้องเรียน ${f('', 50)} ห้อง ${box(false)} จำนวนนักเรียน ${f('', 50)} คน</p>
        <h4>๒. ข้อมูลการจ้าง ${en('Particulars of employment')}</h4>
        <p>ข้าพเจ้าประสงค์จะจ้างคนต่างด้าวชื่อ ${en('I wish to employ a foreigner named')} ${f(workerName, 300)}</p>
        <p>สัญชาติ ${en('Nationality')} ${f(w.nationality, 200)} หมู่โลหิต ${en('Blood type')} ${f('', 80)}</p>
        <p>ที่อยู่ในประเทศไทย ${en('Address in Thailand')} ${f(w.workplace || address, 430)}</p>
        <p>ประเภทงาน ${en('Type(s) of work')} ${f(w.position, 450)}</p>
        <p>ลักษณะงาน ${en('Nature of work')} ${f('', 460)}</p>
        <p>สถานที่ทำงานของคนต่างด้าว ${en('Place of work of the foreigner')} ${f(w.workplace || address, 330)}</p>
        <p>ระยะเวลาการจ้าง ${f('', 50)} ปี ${f('', 50)} เดือน ${f('', 50)} วัน มีสัญญาจ้างถึงวันที่ ${f(w.permitExpiry ? formatThaiDate(w.permitExpiry) : '', 150)}</p>
        <p>ค่าจ้างหรือรายได้ วันละ / เดือนละ ${f('', 110)} บาท ผลประโยชน์อื่น วันละ / เดือนละ ${f('', 110)} บาท</p>
        <p>ระดับการศึกษาสูงสุด ${f('', 150)} ประสบการณ์ทำงาน ${f('', 40)} ปี สถานภาพ ${box(false)} โสด ${box(false)} สมรส</p>
        <h4>๓. เหตุผลที่ไม่จ้างบุคคลสัญชาติไทยเข้าทำงาน ${en('Please specify the reason(s) for not employing a Thai national')}</h4>
        <p>${f('ขาดแคลนแรงงานไทย', 640)}</p>
        <div class="bt46-certify">ข้าพเจ้าขอรับรองว่า ข้อความข้างต้นนี้เป็นความจริงทุกประการ<br>${en('I hereby certify that all particulars given in this form are true and correct to the best of my knowledge and belief.')}</div>
        <div class="bt46-sign">
            <div>ลงชื่อ <span class="bt46-sigline">${sigUrl ? `<img src="${escapeHtml(sigUrl)}" alt="ลายเซ็น">` : ''}</span> นายจ้าง</div>
            <div>( ${f(signer, 220)} )</div>
            <div>ตำแหน่ง ${en('Title')} ${f(individual ? 'นายจ้าง' : 'กรรมการผู้มีอำนาจ', 180)}</div>
            <div>ลงวันที่ ${en('Date')} ${f(formatThaiDate(new Date()), 180)}</div>
        </div>
        <div class="bt46-note">หมายเหตุ : ผู้ทำหนังสือรับรองนี้ จะต้องเป็นผู้มีอำนาจลงชื่อผูกพันสถานประกอบการ หรือได้รับมอบอำนาจให้ทำการแทน</div>
    `;
    if (!sigUrl) showToast("ยังไม่มีลายเซ็นนายจ้าง — อัปโหลดได้ที่แฟ้มเอกสารนายจ้าง หมวด \"ลายเซ็นนายจ้าง\"", "warning");
    setPrintPageSize("size: A4 portrait; margin: 10mm;");
    document.getElementById("bt46-modal").classList.remove("hidden");
}

function closeBt46Modal() {
    document.getElementById("bt46-modal").classList.add("hidden");
    setPrintPageSize("");
}

function closeDeliveryLabelModal() {
    document.getElementById("delivery-label-modal").classList.add("hidden");
    setPrintPageSize("");
}

async function saveCustomer(e) {
    e.preventDefault();
    const editId = document.getElementById("customer-edit-id").value;
    const taxId = document.getElementById("cust-tax-id").value;
    const companyName = document.getElementById("cust-company-name").value;
    if (!getCustomerEntityType()) { uiAlert("กรุณาเลือกประเภทนายจ้างก่อน: นิติบุคคล หรือ บุคคลธรรมดา"); return; }
    const directorId = getCustomerEntityType() === 'individual' ? "" : document.getElementById("cust-director-id").value.trim();
    const businessTypes = readCustomerBusinessTypes();
    if (businessTypes.length === 0) { uiAlert("กรุณาเลือกประเภทกิจการอย่างน้อย 1 ประเภท"); return; }
    const businessType = businessTypes.join(BUSINESS_TYPE_SEP);
    const coordinator = document.getElementById("cust-coordinator").value;
    const phone = document.getElementById("cust-phone").value;
    const referredByAgentId = document.getElementById("cust-referred-by-agent").value || null;
    const billingNote = document.getElementById("cust-billing-note").value.trim();
    const requirePrepayment = document.getElementById("cust-require-prepayment").checked;
    const email = document.getElementById("cust-email").value.trim();
    const driveShare = document.getElementById("cust-drive-share").checked;
    if (driveShare && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { uiAlert("กรุณากรอกอีเมลลูกค้าให้ถูกต้องก่อนเปิดแชร์โฟลเดอร์ Google Drive"); return; }
    const certIssueDateRaw = document.getElementById("cust-cert-issue-date").value.trim();
    if (certIssueDateRaw && !isValidDate(certIssueDateRaw)) {
        uiAlert("รูปแบบวันที่ออกหนังสือรับรองบริษัทไม่ถูกต้อง กรุณากรอกเป็น วัน/เดือน/ปี ค.ศ. (เช่น 15/03/2026)");
        return;
    }
    // หมดอายุไม่ได้พิมพ์อยู่ในเอกสารจริง คำนวณเองจากวันที่ออก + 6 เดือน ณ ตอนบันทึกเสมอ (ไม่เชื่อค่าที่โชว์ในฟอร์มเฉยๆ)
    const certIssueDate = parseDateInput(certIssueDateRaw) || null;
    const certExpiryDate = certIssueDateRaw ? calcCertExpiry(certIssueDateRaw) : null;
    const certExpiry = certExpiryDate ? certExpiryDate.toISOString().split('T')[0] : null;
    const deliverySameAsMain = document.getElementById("cust-delivery-same-as-main").checked;
    const deliveryAddress = deliverySameAsMain
        ? { sameAsMain: true }
        : {
            sameAsMain: false,
            recipientName: document.getElementById("cust-delivery-recipient").value.trim(),
            phone: document.getElementById("cust-delivery-phone").value.trim(),
            houseNo: document.getElementById("cust-delivery-house-no").value.trim(),
            moo: document.getElementById("cust-delivery-moo").value.trim(),
            soi: document.getElementById("cust-delivery-soi").value.trim(),
            road: document.getElementById("cust-delivery-road").value.trim(),
            subdistrict: document.getElementById("cust-delivery-subdistrict").value.trim(),
            district: document.getElementById("cust-delivery-district").value.trim(),
            province: document.getElementById("cust-delivery-province").value.trim(),
            postalCode: document.getElementById("cust-delivery-postal").value.trim()
        };

    // Validate branches
    for (let b of customerBranches) {
        if (!b.houseNo || !b.subdistrict || !b.district || !b.province || !b.postalCode) {
            uiAlert("กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วนในทุกสาขาที่เปิดอยู่");
            return;
        }
        if (!PROVINCES.includes(b.province)) {
            uiAlert(`จังหวัดต้องอยู่ใน 4 จังหวัดนี้เท่านั้น: ${PROVINCES.join(', ')}`);
            return;
        }
        if (!/^\d{5}$/.test(b.postalCode)) {
            uiAlert("รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก");
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
            const oldAttachments = JSON.parse(JSON.stringify(customers[idx].attachments || {}));
            customerData = {
                id: editId, status: customers[idx].status || "active", taxId, companyName, directorId, businessType, coordinator, phone, referredByAgentId, billingNote, requirePrepayment, email, driveShare, certIssueDate, certExpiry, deliveryAddress, branches: customerBranches, createdAt: oldCreatedAt, drive_folder_id: oldDriveId, attachments: oldAttachments
            };
        }
    } else {
        // Add Mode
        const newId = 'cust-' + Date.now();
        const createdAt = new Date().toISOString().split('T')[0];
        customerData = {
            id: newId, taxId, companyName, directorId, businessType, coordinator, phone, referredByAgentId, billingNote, requirePrepayment, email, driveShare, certIssueDate, certExpiry, deliveryAddress, branches: customerBranches, createdAt, drive_folder_id: "", attachments: {}
        };
    }

    if (!customerData) return;

    // Cloud Sync
    if (!(await confirmBeforeSave(e.target.closest("form") || e.target, "ตรวจสอบข้อมูลนายจ้าง/ลูกค้า"))) return;
    showToast("💾 กำลังบันทึกข้อมูลเข้าคลาวด์...", "warning");
    const res = await callCloudAPI("saveCustomer", { customerData: customerData });
    if (!res || res.status === "error") {
        showToast("❌ บันทึกไม่สำเร็จ: " + (res && res.message ? res.message : "ข้อมูลยังไม่ถูกบันทึกลงคลาวด์ กรุณาลองใหม่"), "danger");
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
            await syncWorkersWorkplaceForEmployer(editId);
        }
    } else {
        customers.push(customerData);
        showToast("เพิ่มข้อมูลนายจ้าง/ลูกค้าคนใหม่สำเร็จ", "success");
    }

    // ไฟล์แนบถูกอัปโหลดขึ้น Storage ไปแล้วตั้งแต่ตอนเลือกไฟล์ (ดู processCustomerDocFile) — เหลือแค่ผูก
    // reference เข้ากับข้อมูลลูกค้าที่บันทึกสำเร็จแล้ว (รวมกับไฟล์เดิมที่มีอยู่แล้ว ไม่เขียนทับ)
    const stagedDocTypes = Object.keys(tempCustomerAttachments);
    if (stagedDocTypes.length > 0) {
        customerData.attachments = customerData.attachments || {};
        for (const docType of stagedDocTypes) {
            const stagedFiles = tempCustomerAttachments[docType] || [];
            const existing = getAttachments(customerData, docType);
            customerData.attachments[docType] = existing.concat(stagedFiles);
        }
        tempCustomerAttachments = {};

        // บันทึกซ้ำอีกครั้งเพื่อผูกลิงก์ไฟล์ (และฟิลด์ที่ AI เติมให้ระหว่างแนบไฟล์) เข้ากับข้อมูลลูกค้า
        const attachRes = await callCloudAPI("saveCustomer", { customerData });
        if (!attachRes || attachRes.status === "error") {
            showToast("⚠️ บันทึกลิงก์ไฟล์แนบเข้าข้อมูลลูกค้าไม่สำเร็จ กรุณาลองแนบใหม่จากหน้าแฟ้มเอกสาร", "danger");
        }
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
        uiAlert("ไม่สามารถลบลูกค้านี้ได้ เนื่องจากมีคนงานต่างด้าวผูกกับบริษัทนี้อยู่ กรุณาย้ายหรือลบคนงานก่อน");
        return;
    }

    if (await uiConfirm("คุณแน่ใจหรือไม่ที่จะลบข้อมูลผู้ว่าจ้าง/ลูกค้ารายนี้? ข้อมูลทั้งหมดของเขาจะหายไป", { card: dialogCardForCustomer(customers.find(c => c.id === id)) })) {
        showToast("🗑️ กำลังลบข้อมูลออกจากคลาวด์...", "warning");
        let res = await callCloudAPI("deleteRecord", { sheetName: "Customers", id: id });

        // ถ้าลบด้วย id ไม่สำเร็จ (เช่น id เพี้ยน/undefined จากปัญหาหัวตาราง) ให้ลองลบตามตำแหน่งแถวจริงแทน
        if ((!res || res.status === "error") && rowNum) {
            res = await callCloudAPI("deleteRecordByRow", { sheetName: "Customers", rowNum: rowNum });
        }

        if (res && res.status !== "error") {
            customers = customers.filter(c => c.id !== id && c._rowNum !== rowNum);
            saveData();
            renderCustomers();
            showToast("ลบข้อมูลลูกค้าเรียบร้อยแล้ว", "success");
        } else {
            showToast("❌ ลบไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
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

// ปี พ.ศ. -> ค.ศ. — เอกสารราชการไทยพิมพ์ปี พ.ศ. (เช่น 2570) และ AI บางครั้งคัดลอกมาตรง ๆ ไม่แปลง
// ทำให้บันทึกคนงานไม่ได้ ("วันหมดอายุใบอนุญาตทำงาน ไม่ถูกต้อง") ปี ค.ศ. จริงไม่มีทางเกิน 2400 จึงแปลงได้ปลอดภัย
function toGregorianYear(year) {
    const n = parseInt(year, 10);
    return !isNaN(n) && n >= 2400 ? String(n - 543) : String(year);
}

// วัน/เดือน/ปี ที่ปีเป็น พ.ศ. -> ปี ค.ศ. (ค่าอื่นคืนตามเดิม)
function normalizeDisplayDateYear(val) {
    const m = String(val || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    return m ? `${m[1]}/${m[2]}/${toGregorianYear(m[3])}` : val;
}

function formatDateForInput(val) {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${toGregorianYear(parts[0])}`;
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

// ตัดเวลา/timezone ทิ้ง เหลือแค่วันที่ล้วนๆ สำหรับแสดงผล — รับได้ทั้งค่าปกติ ("2026-09-01") ค่าที่ Supabase
// (timestamptz) คืนมาเป็น ISO เต็มรูปแบบ ("2026-09-01T00:00:00+00:00") และค่าที่พังมีต่อท้ายซ้ำ
// ("...+00:00+00:00" จากข้อมูลเก่าที่เคยบันทึกผิด) เพราะดึงแค่ตัวเลขวันที่ 10 ตัวแรกไปแปลง ไม่สนใจส่วนที่เหลือเลย
function formatDateOnly(dateStr) {
    if (!dateStr) return '-';
    const match = String(dateStr).match(/^(\d{4}-\d{2}-\d{2})/);
    const datePart = match ? match[1] : dateStr;
    const d = safeParseDate(datePart);
    return d ? formatThaiDate(d) : String(dateStr);
}

// รูปแบบวันที่มาตรฐานของทั้งระบบ (ที่แสดงให้ผู้ใช้เห็น): วัน/เดือน/ปี พ.ศ. เติม 0 ครบ 2 หลัก เช่น 13/02/2570
// รับได้ทั้ง Date, "YYYY-MM-DD", ISO timestamp และ "DD/MM/YYYY" (ค.ศ. หรือ พ.ศ.) — withTime: true ต่อท้ายเวลา "14:30"
// หมายเหตุ: ช่องกรอกวันที่ในฟอร์มยังเป็น ค.ศ. (ดู formatDateForInput / parseDateInput) — ฟังก์ชันนี้ใช้แสดงผลเท่านั้น
function formatThaiDate(value, withTime = false) {
    if (!value) return '-';
    let d = value instanceof Date ? value : null;
    if (!d) {
        const s = String(value);
        d = /T\d{2}:\d{2}/.test(s) ? new Date(s) : safeParseDate((s.match(/^(\d{4}-\d{2}-\d{2})/) || [])[1] || s);
    }
    if (!d || isNaN(d.getTime())) return String(value);
    const pad = n => String(n).padStart(2, '0');
    const out = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543}`;
    return withTime ? `${out} ${pad(d.getHours())}:${pad(d.getMinutes())}` : out;
}

function parseDateInput(val) {
    if (!val) return null;
    const parts = val.split('/');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        if (day && month && year && year.length === 4) {
            return `${toGregorianYear(year)}-${month}-${day}`;
        }
    }
    // ค่าที่เป็น ปปปป-ดด-วว อยู่แล้ว (เช่น จาก AI) ก็แปลงปี พ.ศ. เหมือนกัน
    const iso = String(val).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${toGregorianYear(iso[1])}-${iso[2]}-${iso[3]}`;
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
        uiAlert("กรุณาเพิ่มข้อมูล นายจ้าง/ลูกค้า อย่างน้อย 1 รายการก่อนจัดการคนงาน");
        return;
    }

    document.getElementById("worker-form").reset();
    updateEmployerDropdownOptions();

    // โน้ตจากนายจ้าง (พอร์ทัล) — แสดงให้เจ้าหน้าที่อ่าน แก้ไม่ได้จากฟอร์มนี้
    const noteBox = document.getElementById("worker-client-note-box");
    const noteWorker = id ? workers.find(x => x.id === id) : null;
    if (noteBox) {
        const hasNote = !!(noteWorker && noteWorker.clientNote);
        noteBox.classList.toggle("hidden", !hasNote);
        noteBox.innerHTML = hasNote ? `<div class="client-note-head">${icon("chat")} โน้ตจากนายจ้าง${noteWorker.clientNoteUpdatedAt ? ` <small>แก้ล่าสุด ${formatThaiDate(noteWorker.clientNoteUpdatedAt, true)}</small>` : ""}</div><div class="client-note-text">${escapeHtml(noteWorker.clientNote)}</div>` : "";
    }

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

    // ช่อง "ไม่ต้องแจ้งเข้า" เห็นเฉพาะ admin
    const skipNotifyRow = document.getElementById("worker-skip-notify-row");
    const skipNotifyCheckbox = document.getElementById("worker-skip-notify");
    if (currentUser.role === 'admin') {
        skipNotifyRow.classList.remove("hidden");
    } else {
        skipNotifyRow.classList.add("hidden");
    }
    skipNotifyCheckbox.checked = false;

    if (id) {
        modalTitle.innerText = "แก้ไขข้อมูลคนงานต่างด้าว";
        editIdInput.value = id;

        const w = workers.find(item => item.id === id);
        
        // Load existing attachments to temp store (แปลงฟอร์แมตเก่าที่เก็บเป็น string เดี่ยวให้เป็น array ก่อนเสมอ)
        tempWorkerAttachments = JSON.parse(JSON.stringify(w.attachments || {}));
        Object.keys(tempWorkerAttachments).forEach(key => {
            if (!Array.isArray(tempWorkerAttachments[key])) {
                tempWorkerAttachments[key] = getAttachments(w, key);
            }
        });

        // Display existing attachments status visually in the modal (พร้อมปุ่มลบไฟล์ที่แนบผิดออกทีละไฟล์)
        ['worker-wp-doc', 'worker-passport', 'worker-myanmar-id', 'worker-pink-card', 'worker-receipt', 'worker-other', 'worker-medical', 'worker-insurance-doc'].forEach(key => {
            renderWorkerAttachmentStatus(key);
        });

        document.getElementById("worker-employer-id").value = w.employerId;
        // Sync ข้อความที่แสดงในช่องค้นหา (search-select) ให้ตรงกับนายจ้างที่บันทึกไว้เดิม
        const employerForSearch = customers.find(c => c.id === w.employerId);
        const employerSearchInput = document.getElementById("worker-employer-search");
        if (employerSearchInput) employerSearchInput.value = employerForSearch ? employerForSearch.companyName : '';
        
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
        fillWorkerWorkplaceFromEmployer(w.employerId); // ล็อคตามที่อยู่นายจ้าง ไม่ใช้ค่าที่เคยเก็บไว้
        document.getElementById("worker-email").value = w.email || '';
        
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

        // Pink Card / Insurance Info
        document.getElementById("worker-pink-card-no").value = w.pinkCardNo || '';
        document.getElementById("worker-thai-name").value = w.thaiName || '';
        document.getElementById("worker-insurance-no").value = w.insuranceNo || '';
        skipNotifyCheckbox.checked = !!w.skipNotifyEntry;
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
            uiAlert("กรุณาระบุระบุสัญชาติคนงานต่างด้าวในกล่องระบุเพิ่มเติม");
            return;
        }
    }

    const title = document.getElementById("worker-title").value;
    const workerUid = document.getElementById("worker-uid").value;
    const permitNo = document.getElementById("worker-permit-no").value;
    const permitExpiry = document.getElementById("worker-permit-expiry").value.trim();
    // ยุบช่องว่างซ้อน (ชื่อจาก OCR มักได้ "NUN  WIN  AYE") — ไม่งั้นค้นหาชื่อแบบเว้นช่องเดียวไม่เจอ
    const firstName = document.getElementById("worker-first-name").value.replace(/\s+/g, ' ').trim();
    const lastName = document.getElementById("worker-last-name").value.replace(/\s+/g, ' ').trim();
    const dob = document.getElementById("worker-dob").value.trim();
    const refNo = document.getElementById("worker-ref-no").value.trim();
    const gender = document.getElementById("worker-gender").value;
    const position = document.getElementById("worker-position").value.trim();
    const workplace = getCustomerHQAddress(employerId); // ล็อคตามที่อยู่นายจ้างเสมอ (ช่องในฟอร์มเป็นแบบอ่านอย่างเดียว)
    const email = document.getElementById("worker-email").value.trim();
    
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

    // Pink Card / Insurance Info
    const pinkCardNo = document.getElementById("worker-pink-card-no").value.trim();
    const thaiName = document.getElementById("worker-thai-name").value.trim();
    const insuranceNo = document.getElementById("worker-insurance-no").value.trim();

    // ช่อง "ไม่ต้องแจ้งเข้า" เห็น/แก้ได้เฉพาะ admin — คนอื่นแก้ไม่ได้ ให้คงค่าเดิมของคนงานไว้ (ถ้ามี)
    const existingWorker = editId ? workers.find(item => item.id === editId) : null;
    const skipNotifyEntry = currentUser.role === 'admin'
        ? document.getElementById("worker-skip-notify").checked
        : !!(existingWorker && existingWorker.skipNotifyEntry);

    // Validate date formats (DD/MM/YYYY)
    if (dob && !isValidDate(dob)) {
        uiAlert("วันเดือนปีเกิด ไม่ถูกต้อง (รูปแบบคือ วัน/เดือน/ปี ค.ศ. เช่น 15/08/1994)");
        return;
    }
    if (permitExpiry && !isValidDate(permitExpiry)) {
        uiAlert("วันหมดอายุใบอนุญาตทำงาน ไม่ถูกต้อง (รูปแบบคือ วัน/เดือน/ปี ค.ศ. เช่น 31/12/2026)");
        return;
    }
    if (passportIssue && !isValidDate(passportIssue)) {
        uiAlert("วันออกเล่มพาสปอร์ต ไม่ถูกต้อง (รูปแบบคือ วัน/เดือน/ปี ค.ศ. เช่น 20/05/2022)");
        return;
    }
    if (passportExpiry && !isValidDate(passportExpiry)) {
        uiAlert("วันหมดอายุพาสปอร์ต ไม่ถูกต้อง (รูปแบบคือ วัน/เดือน/ปี ค.ศ. เช่น 20/05/2027)");
        return;
    }

    // Relaxed required validation: only check employer, nationality, title, first name, and birth date
    if (!employerId || !nationality || !title || !firstName || !dob) {
        uiAlert("กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน");
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
        email,
        refNo,
        pinkCardNo, thaiName, insuranceNo,
        skipNotifyEntry
    };

    // โน้ตจากนายจ้างไม่ได้อยู่ในฟอร์ม (อ่านอย่างเดียว) — ติดค่าเดิมไว้ ไม่ให้หายจากหน้าจอหลังบันทึก
    const finalWorkerData = editId ? { ...workerData, clientNote: (existingWorker || {}).clientNote || "", clientNoteUpdatedAt: (existingWorker || {}).clientNoteUpdatedAt || null, createdAt: workers.find(item => item.id === editId).createdAt || new Date().toISOString().split('T')[0] } : { ...workerData, createdAt: new Date().toISOString().split('T')[0] };

    if (!(await confirmBeforeSave(e.target.closest("form") || e.target, "ตรวจสอบข้อมูลคนงาน"))) return;
    showToast("💾 กำลังบันทึกข้อมูลคนงานเข้าคลาวด์...", "warning");
    const workerSaveRes = await callCloudAPI("saveWorker", { workerData: finalWorkerData });
    if (!workerSaveRes || workerSaveRes.status === "error") {
        showToast("❌ บันทึกไม่สำเร็จ: " + (workerSaveRes && workerSaveRes.message ? workerSaveRes.message : "ข้อมูลคนงานยังไม่ถูกบันทึกลงคลาวด์ กรุณาลองใหม่"), "danger");
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

    if (await uiConfirm("คุณแน่ใจหรือไม่ที่จะลบข้อมูลคนงานต่างด้าวรายนี้?", { card: dialogCardForWorker(workers.find(w => w.id === id)) })) {
        showToast("🗑️ กำลังลบข้อมูลออกจากคลาวด์...", "warning");
        let res = await callCloudAPI("deleteRecord", { sheetName: "Workers", id: id });

        // ถ้าลบด้วย id ไม่สำเร็จ (เช่น id เพี้ยน/undefined จากปัญหาหัวตาราง) ให้ลองลบตามตำแหน่งแถวจริงแทน
        if ((!res || res.status === "error") && rowNum) {
            res = await callCloudAPI("deleteRecordByRow", { sheetName: "Workers", rowNum: rowNum });
        }

        if (res && res.status !== "error") {
            workers = workers.filter(w => w.id !== id && w._rowNum !== rowNum);
            saveData();
            renderWorkers();
            showToast("ลบข้อมูลคนงานเรียบร้อยแล้ว", "success");
        } else {
            showToast("❌ ลบไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
        }
    }
}

// ==================== TOAST COMPONENT ====================
// อีโมจินำหน้าข้อความแจ้งเตือน → ชื่อไอคอนใน ICON_GLYPHS (สีใช้ตามประเภทของแจ้งเตือน)
const TOAST_EMOJI_ICONS = {
    '✅': 'ok', '❌': 'bad', '⚠': 'warn', '⛔': 'ban', '🚫': 'ban', '⏳': 'hourglass', '💾': 'save', '🗑': 'trash',
    '📎': 'clip', '☁': 'cloud', '📤': 'outbox', '📥': 'inbox', '🔄': 'refresh', '⚡': 'bolt', '🎉': 'sparkles',
    '✨': 'sparkles', '🤖': 'bot', '📋': 'clipboard', '🔗': 'link', '🔒': 'lock', '🔓': 'unlock', '📁': 'folder',
    '📂': 'folder', '✏': 'edit', '📝': 'edit', '🧾': 'receipt', '💰': 'moneybag', '💵': 'cash', '👤': 'user',
    '🖨': 'print', '🔍': 'search', '📄': 'file', '🧹': 'sparkles', '🗜': 'box', '📦': 'box',
};

function showToast(message, type = 'success') {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    // อีโมจิตัวแรกของข้อความ (เช่น "📎 กำลังแนบไฟล์...") → แปลงเป็นไอคอนสองโทนที่ความหมายตรงกัน แล้วตัดอีโมจิออกจากข้อความ
    // ไม่มีอีโมจินำหน้า → ใช้ไอคอนตามประเภท (สำเร็จ/ผิดพลาด/คำเตือน)
    const text = String(message ?? '');
    const lead = text.match(/^\s*(\p{Extended_Pictographic})️?\s*/u);
    const typeIcon = { success: ['ok', 'green'], danger: ['bad', 'red'], warning: ['warn', 'amber'] }[type] || ['sparkles', 'blue'];
    const leadName = lead ? TOAST_EMOJI_ICONS[lead[1]] : null;
    const [iconName, iconColor] = leadName ? [leadName, typeIcon[1]] : typeIcon;

    toast.innerHTML = `
        <span class="toast-icon toast-icon-${iconColor}">${icon(iconName, iconColor)}</span>
        <span class="toast-text">${lead ? text.slice(lead[0].length) : text}</span>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'toastPop 0.25s reverse forwards';
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
    // ตัดส่วนเวลา/timezone ออกก่อนเสมอ เพราะ Supabase (timestamptz) จะคืนค่า createdAt เป็น
    // ISO เต็มรูปแบบ "2026-08-17T00:00:00+00:00" หลังโหลดข้อมูลจากคลาวด์ ไม่ใช่แค่ "2026-08-17"
    // เหมือนตอนสร้างงานครั้งแรกในเครื่อง — ถ้าไม่ตัด "T00:00:00+00:00" จะติดมาด้วยตรงๆ
    const rawDate = job.createdAt || job.updatedAt || new Date().toISOString();
    const dateStr = String(rawDate).split('T')[0].replace(/-/g, '');
    const numPart = (job.id || '').replace(/\D/g, '').slice(-6) || '000000';
    return `${dateStr}-${numPart}`;
}

// เลขประจำตัวของนายจ้าง/ลูกค้า — มีเลขกรรมการ (directorId) แปลว่าเป็นนิติบุคคล (โชว์เลขบริษัท + เลขกรรมการ)
// ไม่มีเลขกรรมการแปลว่าเป็นบุคคลธรรมดา (taxId คือเลขประจำตัวของตัวเขาเอง โชว์แค่เลขเดียว)
// ใช้ร่วมกันทุกจุดที่แสดงนายจ้าง/ลูกค้าในระบบ ให้ label ตรงกับประเภทลูกค้าเสมอ
// บุคคลธรรมดา = ไม่มีเลขกรรมการ และเลข 13 หลักไม่ได้ขึ้นต้นด้วย 0 (เลขนิติบุคคลขึ้นต้นด้วย 0 เสมอ)
function isIndividualCustomer(cust) {
    return !!cust && !cust.directorId && !!cust.taxId && !String(cust.taxId).startsWith('0');
}

function getCustomerEntityType() {
    const r = document.querySelector('input[name="cust-entity-type"]:checked');
    return r ? r.value : '';
}

// ฟอร์มลูกค้า: บุคคลธรรมดา → ปิดช่องเลขกรรมการ, ช่องเลขผู้เสียภาษีคือเลขบัตรประชาชนของนายจ้างเอง
function applyCustomerEntityType(type) {
    if (type !== undefined) {
        document.querySelectorAll('input[name="cust-entity-type"]').forEach(r => { r.checked = r.value === type; });
    }
    const individual = getCustomerEntityType() === 'individual';
    const dir = document.getElementById("cust-director-id");
    dir.disabled = individual;
    if (individual) dir.value = "";
    document.getElementById("cust-tax-id-label").innerHTML = individual
        ? 'เลขประจำตัวผู้เสียภาษี (เลขบัตรประชาชนนายจ้าง 13 หลัก) <span class="required">*</span>'
        : 'เลขประจำตัวผู้เสียภาษี / เลขทะเบียนบริษัท (13 หลัก) <span class="required">*</span>';
}

function getEmployerIdParts(cust) {
    if (!cust) return [];
    if (cust.directorId) {
        const parts = [];
        if (cust.taxId) parts.push({ label: 'เลขบริษัท', value: cust.taxId });
        parts.push({ label: 'เลขกรรมการ', value: cust.directorId });
        return parts;
    }
    return cust.taxId ? [{ label: 'เลขประจำตัว', value: cust.taxId }] : [];
}

// สร้าง HTML บรรทัดย่อยแสดงเลขประจำตัวของนายจ้าง ต่อจากชื่อบริษัท (ใช้ร่วมกันทุกจุดที่แสดงนายจ้างในระบบแจ้งงาน)
// (หน้าตาเดียวกับเลขประจำตัวคนงานในช่อง "เลขคนงาน / บัตร" — ดู .employer-id-line ใน styles.css)
function buildEmployerIdLinesHtml(cust) {
    return getEmployerIdParts(cust).map(p => `<div class="employer-id-line"><span>${p.label}</span> <b>${p.value}</b></div>`).join('');
}

// เวอร์ชันข้อความล้วน (ไม่มี HTML) สำหรับใช้เป็น title/tooltip
function buildEmployerIdText(cust, separator = ' | ') {
    return getEmployerIdParts(cust).map(p => `${p.label}: ${p.value}`).join(separator);
}

// ==================== ระบบแจ้งงาน: ตัวกรองเดือน/ผู้รับผิดชอบ + หน้าสรุปงาน (Operation Manager) ====================
// เดือนของใบงาน = เดือนที่แจ้งงาน (createdAt) รูปแบบ "YYYY-MM"
function jobMonthKey(j) {
    return String(j.createdAt || j.updatedAt || '').slice(0, 7);
}

function monthLabelTh(key) {
    const [y, m] = String(key).split('-');
    return y && m ? `${MONTH_NAMES_TH[m] || m} ${parseInt(y, 10) + 543}` : key;
}

function fillJobFilterOptions() {
    const monthSel = document.getElementById("filter-job-month");
    if (monthSel) {
        const prev = monthSel.value;
        const months = [...new Set(jobs.map(jobMonthKey).filter(k => /^\d{4}-\d{2}$/.test(k)))];
        const thisMonth = localDateISO(new Date()).slice(0, 7);
        if (!months.includes(thisMonth)) months.push(thisMonth);
        months.sort().reverse();
        monthSel.innerHTML = '<option value="">ทุกเดือน</option>' + months.map(k => `<option value="${k}">${monthLabelTh(k)}</option>`).join('');
        monthSel.value = months.includes(prev) ? prev : '';
    }
    const asgSel = document.getElementById("filter-job-assignee");
    if (asgSel) {
        const prev = asgSel.value;
        const members = team.filter(m => m.role !== 'account_manager');
        asgSel.innerHTML = '<option value="">ผู้รับผิดชอบ: ทุกคน</option>' +
            (currentUser && currentUser.id ? '<option value="me">งานของฉัน</option>' : '') +
            '<option value="none">ยังไม่มอบหมาย</option>' +
            members.map(m => `<option value="${m.id}">${escapeHtml(m.name || '-')}</option>`).join('');
        asgSel.value = [...asgSel.options].some(o => o.value === prev) ? prev : '';
    }
}

const JOB_STALE_DAYS = 14; // งานเปิดค้างนานกว่านี้ = ค้างนาน

function jobDaysOpen(j) {
    const start = safeParseDate(String(j.createdAt || j.updatedAt || '').slice(0, 10));
    const end = j.status === 'ปิดงานแล้ว' && j.closedAt ? new Date(j.closedAt) : new Date();
    return start ? Math.max(0, Math.floor((end - start) / 86400000)) : 0;
}

// สรุปงาน: แจ้งเข้าในเดือน / ปิดในเดือน / ค้างอยู่ตอนนี้ + แยกตามประเภทงาน ผู้รับผิดชอบ นายจ้าง + นัดหมาย 7 วัน + งานค้างนาน
function renderJobsSummary(baseJobs, monthKey) {
    const box = document.getElementById("jobs-summary-container");
    if (!box) return;
    const inMonth = d => !monthKey || String(d || '').slice(0, 7) === monthKey;
    const opened = baseJobs.filter(j => inMonth(j.createdAt || j.updatedAt));
    const closed = baseJobs.filter(j => j.status === 'ปิดงานแล้ว' && j.closedAt && inMonth(j.closedAt));
    const open = baseJobs.filter(j => isJobStatusOpen(j.status));
    const unassigned = open.filter(j => !j.assignedTo);
    const waitingDocs = open.filter(j => j.status === 'รอเอกสารเพิ่มเติม');
    const stale = open.filter(j => jobDaysOpen(j) > JOB_STALE_DAYS).sort((a, b) => jobDaysOpen(b) - jobDaysOpen(a));
    const avgClose = closed.length ? Math.round(closed.reduce((s, j) => s + jobDaysOpen(j), 0) / closed.length) : null;
    const today = localDateISO(new Date());
    const in7 = localDateISO(new Date(Date.now() + 7 * 86400000));
    const appts = open.filter(j => { const d = String(j.appointmentDate || '').slice(0, 10); return d && d >= today && d <= in7; })
        .sort((a, b) => String(a.appointmentDate).localeCompare(String(b.appointmentDate)) || String(a.appointmentTime || '').localeCompare(String(b.appointmentTime || '')));

    const periodLabel = monthKey ? monthLabelTh(monthKey) : 'ทุกเดือน';
    // วิดเจ็ต 1 ใบ (กระดาน "jobs" — ลาก/ปรับขนาดได้ ดู WIDGET_BOARDS.jobs) — html ว่าง = ไม่แสดงใบนั้น
    const widget = (id, kind, html) => html ? `<div class="widget" data-widget-id="${id}" data-kind="${kind}">${html}</div>` : '';
    const pill = (tone, value, label, go) => `<div class="stat-pill tone-${tone}"${go ? ` data-go="${go}" role="button" tabindex="0"` : ''}><h3>${value}</h3><p>${label}</p></div>`;

    // ตารางแยกกลุ่ม: แจ้งเข้า (ในเดือน) / ปิด (ในเดือน) / ค้างอยู่ตอนนี้
    const groupTable = (title, colLabel, keyOf, labelOf, limit = 0) => {
        const rows = {};
        const bump = (j, field) => { const k = keyOf(j) || '-'; (rows[k] = rows[k] || { opened: 0, closed: 0, open: 0, key: k })[field]++; };
        opened.forEach(j => bump(j, 'opened'));
        closed.forEach(j => bump(j, 'closed'));
        open.forEach(j => bump(j, 'open'));
        let list = Object.values(rows).sort((a, b) => (b.open + b.opened) - (a.open + a.opened));
        if (limit) list = list.slice(0, limit);
        if (!list.length) return '';
        return `<div class="js-card"><h4>${title}</h4><div class="table-container js-table"><table class="data-table">
            <thead><tr><th>${colLabel}</th><th class="inv-num">แจ้งเข้า</th><th class="inv-num">ปิดงาน</th><th class="inv-num">ค้างอยู่</th></tr></thead>
            <tbody>${list.map(r => `<tr><td>${escapeHtml(labelOf(r.key))}</td><td class="inv-num">${r.opened || '-'}</td><td class="inv-num">${r.closed || '-'}</td><td class="inv-num"><strong>${r.open || '-'}</strong></td></tr>`).join('')}</tbody>
        </table></div></div>`;
    };
    const jobListCard = (title, list, subOf, emptyText) => `<div class="js-card"><h4>${title} <span class="badge badge-gold">${list.length}</span></h4>
        ${list.length ? `<div class="js-list">${list.slice(0, 12).map(j => {
            const cust = customers.find(c => c.id === j.customerId);
            const w = workers.find(x => x.id === j.workerId);
            return `<button type="button" class="js-list-item" onclick="openJobModal('${j.id}')">
                <span><strong>${getJobDisplayNo(j)}</strong> • ${escapeHtml(getCleanJobTypeName(j.jobType))}</span>
                <small>${escapeHtml(cust ? cust.companyName : '-')} • ${escapeHtml(w ? `${w.firstName} ${w.lastName}` : '-')} • ${subOf(j)}</small>
            </button>`;
        }).join('')}${list.length > 12 ? `<div class="bell-more">และอีก ${list.length - 12} งาน</div>` : ''}</div>` : `<p class="text-muted pay-empty">${emptyText}</p>`}
    </div>`;

    // บัตรหลักแบบ Wallet (เหมือนสรุปการเงิน): งานค้างตอนนี้ + แถบปิดงานได้กี่ % ของงานที่แจ้งเข้า (ปิดในช่วงนี้อาจเป็นงานเก่า จึงตัดที่ 100%)
    const closePct = opened.length ? Math.min(100, (closed.length / opened.length) * 100) : 0;
    const todayOpened = baseJobs.filter(j => String(j.createdAt || '').slice(0, 10) === today).length;
    const hero = `<div class="wallet-card">
        <div class="wallet-card-top"><span class="wallet-brand">${icon('sparkles')} สรุปงาน</span><span class="wallet-period">${escapeHtml(periodLabel)}</span></div>
        <div><p class="wallet-label">งานค้างอยู่ตอนนี้ (ยังไม่ปิด)</p><p class="wallet-amount">${open.length} <span class="wallet-unit">งาน</span></p></div>
        <div class="wallet-progress" title="งานที่ปิดในช่วงนี้ เทียบกับงานที่แจ้งเข้าในช่วงนี้">
            <div class="wallet-progress-bar"><div class="wallet-progress-fill" style="width: ${closePct.toFixed(1)}%"></div></div>
            <span>ปิดงานได้ ${Math.round(closePct)}%</span>
        </div>
        <div class="wallet-sub">
            <div><p>${monthKey ? 'แจ้งงานเข้าเดือนนี้' : 'แจ้งงานเข้าทั้งหมด'}</p><h3>${opened.length}</h3></div>
            <div><p>${monthKey ? 'ปิดงานเดือนนี้' : 'ปิดงานแล้วทั้งหมด'}</p><h3>${closed.length}</h3></div>
            <div><p>เวลาปิดงานเฉลี่ย</p><h3>${avgClose !== null ? `${avgClose} วัน` : '-'}</h3></div>
        </div>
    </div>`;
    const statusCard = `<div class="fin-list-card">
        <div class="fin-row"><span>รอดำเนินการ</span><strong>${open.filter(j => j.status === 'รอดำเนินการ').length}</strong></div>
        <div class="fin-row"><span>กำลังดำเนินการ</span><strong>${open.filter(j => j.status === 'กำลังดำเนินการ').length}</strong></div>
        <div class="fin-row"><span>รอเอกสารเพิ่มเติม (ตามจากลูกค้า)</span><strong>${waitingDocs.length}</strong></div>
        <div class="fin-row"><span>แจ้งงานเข้าวันนี้</span><strong>${todayOpened}</strong></div>
    </div>`;

    const wasEditing = !!box.querySelector('.widget-board.is-editing');
    box.innerHTML = `
        <p class="js-hint text-muted">เลือกเดือน/ประเภทงาน/ผู้รับผิดชอบได้จากตัวกรองด้านบน • "ค้างอยู่" นับงานที่ยังไม่ปิด ณ วันนี้</p>
        ${widgetBarHtml('jobs')}
        <div class="widget-board" data-board="jobs">
            ${widget('hero', 'block', hero)}
            ${widget('status', 'block', statusCard)}
            ${widget('pill-unassigned', 'pill', pill('orange', unassigned.length, 'งานที่ยังไม่มอบหมายผู้รับผิดชอบ', 'unassigned-jobs'))}
            ${widget('pill-stale', 'pill', pill('red', stale.length, `งานค้างนานเกิน ${JOB_STALE_DAYS} วัน`, 'stale-jobs'))}
            ${widget('pill-appts', 'pill', pill('teal', appts.length, 'นัดหมาย 7 วันข้างหน้า', 'appointments'))}
            ${widget('by-assignee', 'block', groupTable('แยกตามผู้รับผิดชอบ', 'ผู้รับผิดชอบ', j => j.assignedTo || '', k => k === '-' ? 'ยังไม่มอบหมาย' : getUserNameById(k)))}
            ${widget('by-type', 'block', groupTable('แยกตามประเภทงาน', 'ประเภทงาน', j => getCleanJobTypeName(j.jobType), k => k))}
            ${widget('by-customer', 'block', groupTable('นายจ้างที่มีงานมากที่สุด (10 อันดับ)', 'นายจ้าง', j => j.customerId || '', k => (customers.find(c => c.id === k) || {}).companyName || 'ไม่ระบุนายจ้าง', 10))}
            ${widget('list-appts', 'block', jobListCard('นัดหมาย 7 วันข้างหน้า', appts, j => `${formatThaiDate(j.appointmentDate)}${j.appointmentTime ? ` ${escapeHtml(j.appointmentTime)}` : ''}${j.appointmentLocation ? ` • ${escapeHtml(j.appointmentLocation)}` : ''}`, 'ไม่มีนัดหมายใน 7 วันข้างหน้า'))}
            ${widget('list-stale', 'block', jobListCard(`งานค้างนานเกิน ${JOB_STALE_DAYS} วัน`, stale, j => `${j.status} • ${jobDaysOpen(j)} วัน${j.assignedTo ? ` • ${escapeHtml(getUserNameById(j.assignedTo))}` : ' • ยังไม่มอบหมาย'}`, 'ไม่มีงานค้างนาน'))}
            ${widget('list-unassigned', 'block', jobListCard('ยังไม่มอบหมายผู้รับผิดชอบ', unassigned, j => `${j.status} • แจ้งเมื่อ ${formatThaiDate(String(j.createdAt || '').slice(0, 10))}`, 'มอบหมายครบทุกงานแล้ว'))}
        </div>`;
    mountWidgetBoard('jobs', wasEditing);
}

// งาน "จบครบแล้ว" = ปิดงาน + ปิดบิล (ชำระครบ หรือไม่เรียกเก็บเงิน) และจบไปตั้งแต่เดือนก่อน ๆ
// (เดือนที่จบ = เดือนล่าสุดระหว่างวันปิดงานกับวันรับเงิน) — งานที่จบในเดือนนี้ยังแสดงอยู่จนหมดเดือน
function isJobArchived(j) {
    if (!j || j.status !== 'ปิดงานแล้ว' || !(isJobPaid(j) || isJobNoCharge(j))) return false;
    const doneMonth = [j.closedAt, isJobPaid(j) ? j.paidAt : null].map(d => String(d || '').slice(0, 7)).sort().pop();
    return !!doneMonth && doneMonth < localDateISO(new Date()).slice(0, 7);
}

// ---------- เรียงตารางระบบจัดการแจ้งงานตามหัวคอลัมน์ ----------
// คลิกหัวคอลัมน์ = เรียงน้อยไปมาก, คลิกซ้ำ = มากไปน้อย, คลิกครั้งที่ 3 = กลับเป็นค่าเริ่มต้น (งานใหม่ล่าสุดอยู่บน)
let jobsSort = { key: null, dir: 1 };
const JOB_STATUS_SORT_ORDER = ['รอดำเนินการ', 'กำลังดำเนินการ', 'รอเอกสารเพิ่มเติม', 'ปิดงานแล้ว'];

function sortJobsBy(key) {
    if (jobsSort.key !== key) jobsSort = { key, dir: 1 };
    else if (jobsSort.dir === 1) jobsSort.dir = -1;
    else jobsSort = { key: null, dir: 1 };
    jobsCurrentPage = 1;
    renderJobs();
}

function jobSortValue(j, key) {
    const w = workers.find(x => x.id === j.workerId);
    const c = customers.find(x => x.id === j.customerId);
    switch (key) {
        case 'no': return String(j.createdAt || j.updatedAt || '') + '|' + getJobDisplayNo(j);
        case 'type': return getCleanJobTypeName(j.jobType);
        case 'customer': return c ? c.companyName || '' : '';
        case 'worker': return w ? `${w.firstName || ''} ${w.lastName || ''}`.trim() : '';
        case 'remark': return j.remark || '';
        case 'status': { const i = JOB_STATUS_SORT_ORDER.indexOf(j.status); return i === -1 ? 99 : i; }
        case 'orderNo': return j.orderNo || '';
        case 'openedBy': return j.openedBy ? getUserNameById(j.openedBy) : '';
        default: return '';
    }
}

// ลำดับ "เปิดงาน" ของใบงาน (เทียบแบบข้อความ มาก = ใหม่กว่า): วันที่เปิด → เวลาเปิดจริง (opened_at) → เลขท้าย id
// created_at เก็บแค่วันที่ และเลขท้าย id วนกลับทุก ~17 นาที จึงต้องมี opened_at (ใบงานเก่าไม่มี = เรียงแบบเดิม)
function jobOpenedSortKey(j) {
    return `${String(j.createdAt || j.updatedAt || '').slice(0, 10)}|${j.openedAt || ''}|${String(j.id || '').replace(/\D/g, '').padStart(8, '0')}`;
}

function sortJobsList(list) {
    // ค่าเริ่มต้น (ยังไม่ได้คลิกเรียง): งานที่เปิดใหม่ล่าสุดอยู่บนสุดเสมอ (เจ้าของระบบกำหนด 2026-10-06)
    if (!jobsSort.key) {
        return list.sort((a, b) => jobOpenedSortKey(b).localeCompare(jobOpenedSortKey(a)));
    }
    const { key, dir } = jobsSort;
    return list.sort((a, b) => {
        const va = jobSortValue(a, key), vb = jobSortValue(b, key);
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        // ค่าว่างอยู่ท้ายเสมอ ไม่ว่าเรียงทางไหน
        if (!va && vb) return 1;
        if (va && !vb) return -1;
        return String(va).localeCompare(String(vb), 'th', { numeric: true }) * dir;
    });
}

function markJobSortHeaders() {
    document.querySelectorAll('#jobs-table th.sortable-th').forEach(th => {
        const active = th.dataset.sort === jobsSort.key;
        th.classList.toggle('is-sorted', active);
        th.dataset.dir = active ? (jobsSort.dir === 1 ? 'asc' : 'desc') : '';
    });
}

function renderJobs() {
    // ช่องว่างหลายช่อง/หัวท้าย ไม่มีผลกับการค้นหา (ชื่อพม่าหลายคำ วางมาจากที่อื่นมักมีช่องว่างเกิน)
    const normSearch = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const query = normSearch(document.getElementById("search-job").value);
    const typeFilter = document.getElementById("filter-job-type").value;
    const statusFilter = document.getElementById("filter-job-status").value;
    const tbody = document.getElementById("jobs-list-tbody");
    fillJobFilterOptions();
    const monthFilter = (document.getElementById("filter-job-month") || {}).value || '';
    const assigneeFilter = (document.getElementById("filter-job-assignee") || {}).value || '';

    // ตัวกรองทุกอย่างยกเว้นเดือน (หน้าสรุปใช้แยก "แจ้งในเดือนนี้" กับ "ปิดในเดือนนี้")
    const baseFiltered = jobs.filter(j => {
        const cust = customers.find(c => c.id === j.customerId);
        const work = workers.find(w => w.id === j.workerId);

        // ค้นได้ทั้งเลขใบงาน, นายจ้าง, ชื่อคนงาน (มี/ไม่มีคำนำหน้า), ชื่อภาษาไทย, เลขประจำตัว 13 หลัก, เลขพาสปอร์ต
        const hay = !query ? '' : normSearch([
            j.id, getJobDisplayNo(j), cust && cust.companyName,
            work && workerFullName(work), work && `${work.firstName || ''} ${work.lastName || ''}`,
            work && work.thaiName, work && work.workerUid, work && work.passportNo
        ].filter(Boolean).join(' | '));
        const matchSearch = !query || hay.includes(query);

        const matchType = typeFilter === "" || (j.jobType && j.jobType.includes(typeFilter));
        const matchStatus = statusFilter === "" || (statusFilter === "__open" ? JOB_OPEN_STATUSES.includes(j.status) : statusFilter === "__archived" ? j.status === "ปิดงานแล้ว" : j.status === statusFilter);
        const matchAssignee = !assigneeFilter
            || (assigneeFilter === 'me' && j.assignedTo === currentUser.id)
            || (assigneeFilter === 'none' && !j.assignedTo)
            || j.assignedTo === assigneeFilter;

        return matchSearch && matchType && matchStatus && matchAssignee;
    });
    let filtered = monthFilter ? baseFiltered.filter(j => jobMonthKey(j) === monthFilter) : baseFiltered;
    // งานที่จบครบแล้ว (ปิดงาน + ปิดบิล) ตั้งแต่เดือนก่อน ๆ ไม่แสดง — ยกเว้นเลือกดูเอง:
    // ตัวกรองสถานะ "ปิดงานแล้ว" / "งานที่จบครบแล้ว" หรือเลือกเดือน (หน้าสรุปยังนับทุกงานตามเดิม)
    // พิมพ์ค้นหาอยู่ → ค้นในงานที่จบครบแล้วด้วย (เดิมค้นชื่อคนงานที่งานจบไปแล้วไม่เจอ)
    const showArchived = statusFilter === 'ปิดงานแล้ว' || statusFilter === '__archived' || !!monthFilter || !!query;
    if (statusFilter === '__archived') filtered = filtered.filter(isJobArchived);
    else if (!showArchived) filtered = filtered.filter(j => !isJobArchived(j));

    if (currentJobView === 'summary') {
        renderJobsSummary(baseFiltered, monthFilter);
        return;
    }

    if (currentJobView === 'kanban') {
        renderJobsKanban(sortJobsList(filtered)); // งานใหม่ล่าสุดอยู่บนของแต่ละคอลัมน์ด้วย
        return;
    }

    // คลิกหัวคอลัมน์เพื่อเรียง (sortJobsBy) — เรียงก่อนแบ่งหน้า ทุกหน้าจึงเรียงต่อเนื่องกัน
    sortJobsList(filtered);
    markJobSortHeaders();

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
                <td colspan="9" class="text-muted" style="text-align: center; padding: 40px;">
                    ${icon("bad")} ไม่พบข้อมูลการสั่งงานตามตัวกรอง
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
        const custIdLines = buildEmployerIdLinesHtml(cust);
        const workName = work ? `${work.firstName} ${work.lastName} (${work.nationality})` : "ไม่พบข้อมูลคนงาน";
        const jobAgent = j.agentId ? agents.find(a => a.id === j.agentId) : null;
        const agentLine = jobAgent ? `<br><span style="font-size:11.5px; color:var(--text-muted);">${icon("user")} Agent: ${jobAgent.name}</span>` : '';

        // Status styling and display (สถานะขั้นตอนงาน — แยกจากสถานะการเงินโดยสิ้นเชิงแล้ว)
        let displayStatus = j.status;
        let statusClass = 'badge-gold';

        if (j.status === 'รอดำเนินการ') {
            statusClass = 'badge-warning';
        } else if (j.status === 'กำลังดำเนินการ') {
            statusClass = 'badge-gold';
        } else if (j.status === 'รอเอกสารเพิ่มเติม') {
            statusClass = 'badge-danger';
        } else if (j.status === 'ปิดงานแล้ว') {
            statusClass = 'badge-success';
        }

        // Payment badge (ออกบิล/ชำระเงิน) — เป็นอิสระจากสถานะขั้นตอนงาน ออกบิลได้ตั้งแต่เปิดงาน
        const paymentStatus = j.paymentStatus || 'ยังไม่ออกบิล';
        let paymentBadge = `<span class="badge badge-warning" style="font-size: 11.5px; padding: 2px 6px;">${icon("hourglass")} ยังไม่ออกบิล</span>`;
        if (paymentStatus === 'ออกบิลแล้ว') {
            paymentBadge = `<span class="badge" style="font-size: 11.5px; padding: 2px 6px; background-color: #3b82f6; color: white;">${icon("receipt")} ออกบิลแล้ว</span>`;
        } else if (paymentStatus === 'ชำระเงินแล้ว') {
            paymentBadge = `<span class="badge badge-success" style="font-size: 11.5px; padding: 2px 6px;">${icon("ok")} ชำระเงินแล้ว${j.paymentMethod ? ` (${j.paymentMethod})` : ''}</span>`;
        } else if (paymentStatus === JOB_NO_CHARGE) {
            paymentBadge = noChargeBadgeHtml(j);
        }

        // นายจ้างบางรายตั้งไว้ว่าต้องออกบิล+รับชำระก่อนถึงจะเริ่ม "กำลังดำเนินการ" ได้ (customers.requirePrepayment)
        // โชว์เตือนไว้ในตารางใบงานเลยเพื่อให้เจ้าหน้าที่เห็นล่วงหน้า ไม่ต้องเปิดไปเช็กที่หน้านายจ้างก่อน
        const prepaymentBadge = (cust && cust.requirePrepayment && paymentStatus !== 'ชำระเงินแล้ว' && paymentStatus !== JOB_NO_CHARGE)
            ? `<br><span class="badge" style="background-color: #fffbeb; color: #92400e; border: 1px solid #fde68a; font-size: 11.5px; padding: 2px 6px;" title="นายจ้าง &quot;${custName}&quot; ตั้งไว้ว่าต้องออกบิลและรับชำระเงินก่อนย้ายเข้ากำลังดำเนินการ">${icon("moneybag")} ต้องออกบิลและรับชำระเงินก่อน</span>`
            : '';

        // Action buttons
        let editBtn = '';
        let deleteBtn = '';
        let closeBtn = '';
        if (j.status === 'ปิดงานแล้ว') {
            closeBtn = `<button class="btn btn-sm btn-outline" onclick="reopenJob('${j.id}')" title="เปิดงานอีกครั้ง" style="white-space: nowrap;">${icon("unlock")} เปิดงาน</button>`;
        } else if (canEditJob(j)) {
            closeBtn = `<button class="btn btn-sm btn-outline" onclick="openJobCloseModal('${j.id}')" title="แนบเอกสารและปิดงาน" style="white-space: nowrap;">${icon("clip")} ปิดงาน</button>`;
        }

        if (canEditJob(j)) {
            editBtn = `
                <button class="action-icon-btn" onclick="openJobModal('${j.id}')" title="แก้ไขใบงาน">
                    ${icon("edit")}
                </button>
            `;
        }

        if (currentUser.role === 'admin') {
            deleteBtn = `
                <button class="action-icon-btn delete-btn" onclick="deleteJob('${j.id}')" title="ลบงาน">
                    ${icon("trash")}
                </button>
            `;
        }

        const cleanJobType = (j.jobType || "").replace(/\s*\(\d+\)/g, "");
        const siblings = getJobBatchSiblings(j, true); // เฉพาะงานของคนงานคนนี้
        const batchBadge = siblings.length > 0
            ? `<br><span class="badge" style="font-size:11.5px; margin-top:3px; background:#eef2ff; color:#4338ca; display:inline-block;">${icon("clip")} ชุดงานเดียวกัน • ${siblings.length + 1} รายการ</span>`
            : '';
        const siblingPills = siblings.length > 0
            ? `<div style="margin-top:5px; display:flex; flex-wrap:wrap; gap:4px;">${siblings.map(s => {
                const sClean = (s.jobType || "").replace(/\s*\(\d+\)/g, "");
                const dotColor = isJobStatusOpen(s.status) ? '#f59e0b' : '#22c55e';
                // แท็บงานอื่นในชุดเดียวกัน — กดเพื่อเปิดใบงานนั้น
                return `<button type="button" class="job-batch-tab" onclick="event.stopPropagation(); openJobModal('${s.id}')" title="${escapeHtml(sClean)}: ${escapeHtml(s.status || '')} — กดเพื่อเปิดใบงาน ${escapeHtml(getJobDisplayNo(s))}"><span class="job-batch-dot" style="background:${dotColor};"></span>${escapeHtml(sClean)}</button>`;
            }).join('')}</div>`
            : '';

        const rowClickAttrs = work
            ? `class="clickable-row" ondblclick="handleRowDblClick(event) && openWorkerFolderModal('${work.id}')" title="ดับเบิลคลิกเพื่อดูข้อมูลคนงาน / แนบเอกสารเพิ่มเติม"`
            : '';

        return `
            <tr ${rowClickAttrs}>
                <td><strong>${getJobDisplayNo(j)}</strong>${j.status !== 'ปิดงานแล้ว' && Array.isArray(j.attachments) && j.attachments.length
                    ? ` <span class="job-predocs-flag" title="แนบเอกสารปิดงานไว้แล้ว ${j.attachments.length} ไฟล์ — กดปิดงานได้เลย">${icon('clip')}${j.attachments.length}</span>` : ''}${batchBadge}</td>
                <td><span class="badge badge-gold">${cleanJobType}</span>${siblingPills}</td>
                <td><div class="employer-name">${custName}</div>${custIdLines}${agentLine}</td>
                <td>${workName}${work && work.email ? `<div class="job-worker-email">${escapeHtml(work.email)}</div>` : ''}</td>
                <td onclick="event.stopPropagation()">${canEditJob(j)
                    ? `<input type="text" class="job-remark-input" id="job-remark-${j.id}" maxlength="20" value="${escapeHtml(j.remark || '')}" placeholder="หมายเหตุ" title="หมายเหตุสั้น ไม่เกิน 20 ตัวอักษร — พิมพ์แล้วกด Enter หรือคลิกที่อื่นเพื่อบันทึก" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" onchange="saveJobRemark('${j.id}', this)">`
                    : (j.remark ? escapeHtml(j.remark) : '<span class="text-muted">-</span>')}${jobTagSelectHtml(j)}</td>
                <td><span class="badge ${statusClass}">${displayStatus}</span><br>${paymentBadge}${prepaymentBadge}</td>
                <td onclick="event.stopPropagation()">
                    <div class="order-no-field${j.orderNo ? ' is-locked' : ''}">
                        <span class="order-no-prefix">#</span>
                        <input type="text" id="job-order-no-${j.id}" value="${j.orderNo || ''}" placeholder="กรอก Order No." ${j.orderNo ? 'disabled' : ''} onkeydown="if(event.key==='Enter'){event.preventDefault();handleJobOrderNoButton('${j.id}');}">
                        <button type="button" class="order-no-btn" onclick="handleJobOrderNoButton('${j.id}')" title="${j.orderNo ? 'แก้ไข Order No.' : 'บันทึก Order No.'}">${j.orderNo ? ORDER_NO_ICON_EDIT : ORDER_NO_ICON_SAVE}</button>
                    </div>
                </td>
                <td>
                    <span style="font-size:13px;">${getUserNameById(j.openedBy)}</span>
                    ${j.closedBy ? `<br><span style="font-size:11.5px; color:var(--text-muted);">${icon("lock")} ปิดโดย: ${getUserNameById(j.closedBy)}</span>` : ''}
                </td>
                <td class="actions-col" onclick="event.stopPropagation()">
                    <div class="actions-cell">
                        ${closeBtn}
                        ${editBtn}
                        ${deleteBtn}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ไอคอนปุ่มช่อง Order No. (SVG แทน emoji ให้เข้ากับสีธีม)
const ORDER_NO_ICON_SAVE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
const ORDER_NO_ICON_EDIT = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';

// สลับหน้าตาช่อง Order No. ระหว่างโหมดล็อก (บันทึกแล้ว) กับโหมดแก้ไข
function setOrderNoFieldLocked(input, locked) {
    input.disabled = locked;
    const field = input.closest('.order-no-field');
    if (field) field.classList.toggle('is-locked', locked);
    const btn = input.nextElementSibling;
    if (btn) {
        btn.title = locked ? "แก้ไข Order No." : "บันทึก Order No.";
        btn.innerHTML = locked ? ORDER_NO_ICON_EDIT : ORDER_NO_ICON_SAVE;
    }
}

// ปุ่มเดียวสลับ 2 โหมด: ถ้าช่องถูกล็อกอยู่ (บันทึกแล้ว) กดเพื่อปลดล็อกแก้ไข / ถ้าช่องแก้ไขได้อยู่ กดเพื่อบันทึกแล้วล็อก
function handleJobOrderNoButton(jobId) {
    const input = document.getElementById(`job-order-no-${jobId}`);
    if (!input) return;

    if (input.disabled) {
        setOrderNoFieldLocked(input, false);
        input.focus();
        input.select();
    } else {
        saveJobOrderNo(jobId);
    }
}

// หมายเหตุสั้นต่อใบงาน (≤ 20 ตัวอักษร, jobs.remark) — พิมพ์ในตารางระบบจัดการแจ้งงานแล้วบันทึกทันที
async function saveJobRemark(jobId, input) {
    const j = jobs.find(item => item.id === jobId);
    if (!j || !canEditJob(j)) return;
    const remark = String(input.value || '').trim().slice(0, 20);
    input.value = remark;
    if ((j.remark || '') === remark) return;
    const jobData = Object.assign({}, j, { remark: remark || null });
    const res = await callCloudAPI("saveJob", { jobData });
    if (!res || res.status === "error") {
        input.value = j.remark || '';
        showToast("❌ บันทึกหมายเหตุไม่สำเร็จ: " + (res && res.message ? res.message : "กรุณาลองใหม่"), "danger");
        return;
    }
    const idx = jobs.findIndex(item => item.id === jobId);
    if (idx !== -1) jobs[idx] = jobData;
    saveData();
    showToast(`💾 บันทึกหมายเหตุของ ${getJobDisplayNo(jobData)} แล้ว`, "success");
}

// ---------- ป้ายใบงาน (dropdown ใต้ช่องหมายเหตุ) ----------
// 1 ใบงาน = 1 ป้าย (jobs.tag เก็บ id), รายการป้าย { id, name, color } ใช้ร่วมกันทุกคนใน app_settings.job_tags
// ฝ่ายปฏิบัติการเพิ่ม/เปลี่ยนชื่อ/เปลี่ยนสี/ลบป้ายได้ (เลือก "จัดการป้าย…" ท้าย dropdown) — migration 20261008100000_job_tag.sql
// สีโทนเดียวกับระบบ (เหมือน badge): พื้นสีจาง + ตัวอักษร/ขอบสีเดียวกัน — ใช้ได้ทั้งธีมสว่าง/ชมพู/มืด (พื้นเป็นสีโปร่ง)
const JOB_TAG_COLORS = ['#2d4fa3', '#0ea5e9', '#14b8a6', '#10b981', '#d97706', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'];
// สีชุดแรก (สด) ที่เคยบันทึกไว้ → สีโทนระบบที่ใกล้เคียง
const JOB_TAG_LEGACY_COLORS = {
    '#ff3b30': '#ef4444', '#ff9500': '#f97316', '#ffcc00': '#d97706', '#34c759': '#10b981', '#30b0c7': '#14b8a6',
    '#007aff': '#0ea5e9', '#5856d6': '#2d4fa3', '#af52de': '#8b5cf6', '#ff2d55': '#ec4899', '#8e8e93': '#64748b'
};
let jobTagDraft = []; // รายการป้ายระหว่างแก้ในหน้าต่าง "จัดการป้ายใบงาน"

function jobTags() {
    const list = Array.isArray(appSettings.job_tags) ? appSettings.job_tags : [];
    return list.map(t => ({ ...t, color: JOB_TAG_LEGACY_COLORS[String(t.color).toLowerCase()] || t.color || '#64748b' }));
}

// สไตล์ป้าย: พื้นจาง 12% / ขอบ 25% / ตัวอักษรเต็มสี
function jobTagStyle(hex) {
    const c = hex || '#64748b';
    return `background-color:${c}1f; color:${c}; border-color:${c}40;`;
}

function jobTagSelectHtml(j) {
    const tags = jobTags();
    const cur = tags.find(t => t.id === j.tag);
    if (!canEditJob(j)) {
        return cur ? `<span class="job-tag-pill" style="${jobTagStyle(cur.color)}">${escapeHtml(cur.name)}</span>` : '';
    }
    const style = cur ? ` style="${jobTagStyle(cur.color)}"` : '';
    return `<select class="job-tag-select${cur ? ' has-tag' : ''}" id="job-tag-${j.id}"${style} onchange="onJobTagChange('${j.id}', this)" title="ป้ายใบงาน">
        <option value="">— ป้าย —</option>
        ${tags.map(t => `<option value="${escapeHtml(t.id)}"${t.id === j.tag ? ' selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}
        ${can('ops') ? '<option value="__manage">＋ เพิ่ม / แก้ไขป้าย…</option>' : ''}
    </select>`;
}

async function onJobTagChange(jobId, sel) {
    const j = jobs.find(item => item.id === jobId);
    if (!j) return;
    if (sel.value === '__manage') {
        sel.value = j.tag || '';
        openJobTagManager();
        return;
    }
    if (!canEditJob(j)) { sel.value = j.tag || ''; return; }
    const tag = sel.value || null;
    if ((j.tag || null) === tag) return;
    const jobData = Object.assign({}, j, { tag });
    const res = await callCloudAPI("saveJob", { jobData });
    if (!res || res.status === "error") {
        sel.value = j.tag || '';
        showToast("❌ บันทึกป้ายไม่สำเร็จ: " + (res && res.message ? res.message : "กรุณาลองใหม่"), "danger");
        return;
    }
    const idx = jobs.findIndex(item => item.id === jobId);
    if (idx !== -1) jobs[idx] = jobData;
    saveData();
    renderJobs();
}

function openJobTagManager() {
    if (!can('ops')) return;
    jobTagDraft = JSON.parse(JSON.stringify(jobTags()));
    if (!jobTagDraft.length) addJobTagDraft(false);
    renderJobTagManager();
    document.getElementById("job-tag-modal").classList.remove("hidden");
}

function closeJobTagManager() {
    document.getElementById("job-tag-modal").classList.add("hidden");
}

function addJobTagDraft(render = true) {
    const used = new Set(jobTagDraft.map(t => t.color));
    jobTagDraft.push({ id: 'tag-' + Date.now().toString(36), name: '', color: JOB_TAG_COLORS.find(c => !used.has(c)) || JOB_TAG_COLORS[0] });
    if (render) renderJobTagManager(true);
}

function renderJobTagManager(focusLast = false) {
    const list = document.getElementById("job-tag-list");
    if (!list) return;
    list.innerHTML = jobTagDraft.map((t, i) => {
        const inUse = jobs.filter(j => j.tag === t.id).length;
        return `
        <div class="job-tag-row">
            <span class="job-tag-preview" id="job-tag-preview-${i}" style="${jobTagStyle(t.color)}">${escapeHtml(t.name || 'ตัวอย่าง')}</span>
            <div class="form-group job-tag-name">
                <input type="text" maxlength="20" value="${escapeHtml(t.name)}" placeholder="ชื่อป้าย เช่น ด่วน, รอลูกค้า" oninput="jobTagDraft[${i}].name = this.value; document.getElementById('job-tag-preview-${i}').textContent = this.value || 'ตัวอย่าง'">
            </div>
            <div class="job-tag-swatches">
                ${JOB_TAG_COLORS.map(c => `<button type="button" class="job-tag-swatch${c === t.color ? ' is-active' : ''}" style="background:${c};" onclick="jobTagDraft[${i}].color = '${c}'; renderJobTagManager()" title="เลือกสีนี้"></button>`).join('')}
            </div>
            <button type="button" class="action-icon-btn delete-btn" onclick="removeJobTagDraft(${i})" title="ลบป้าย${inUse ? ` (ใช้อยู่ ${inUse} ใบงาน)` : ''}">${icon("trash")}</button>
        </div>`;
    }).join('') || `<p class="text-muted">ยังไม่มีป้าย — กด "เพิ่มป้าย"</p>`;
    if (focusLast) { const inputs = list.querySelectorAll('input[type="text"]'); if (inputs.length) inputs[inputs.length - 1].focus(); }
}

async function removeJobTagDraft(i) {
    const t = jobTagDraft[i];
    const inUse = t ? jobs.filter(j => j.tag === t.id).length : 0;
    if (inUse && !(await uiConfirm(`ป้าย "${t.name || '-'}" ใช้อยู่ ${inUse} ใบงาน — ลบแล้วใบงานเหล่านั้นจะไม่มีป้าย`, { okText: 'ลบป้าย' }))) return;
    jobTagDraft.splice(i, 1);
    renderJobTagManager();
}

async function saveJobTags() {
    if (!can('ops')) return;
    const tags = jobTagDraft.map(t => ({ ...t, name: String(t.name || '').trim().slice(0, 20) })).filter(t => t.name);
    const names = tags.map(t => t.name.toLowerCase());
    if (new Set(names).size !== names.length) { uiAlert("ชื่อป้ายซ้ำกัน กรุณาตั้งชื่อไม่ให้ซ้ำ"); return; }
    const res = await callCloudAPI("saveSetting", { key: 'job_tags', value: tags });
    if (!res || res.status === "error") {
        showToast("❌ บันทึกป้ายไม่สำเร็จ: " + (res && res.message ? res.message : "กรุณาลองใหม่"), "danger");
        return;
    }
    appSettings.job_tags = tags;
    closeJobTagManager();
    renderJobs();
    showToast(`💾 บันทึกป้ายใบงานแล้ว (${tags.length} ป้าย)`, "success");
}

// บันทึกเลข Order No. แบบแก้ไขในตารางใบงานโดยตรง (แทนการกรอกในฟอร์มแจ้งงาน) แล้วล็อกช่องไว้ไม่ให้พิมพ์ซ้ำ
async function saveJobOrderNo(jobId) {
    const input = document.getElementById(`job-order-no-${jobId}`);
    if (!input) return;

    const j = jobs.find(item => item.id === jobId);
    if (!j) return;

    const orderNo = input.value.trim();
    const jobData = Object.assign({}, j, { orderNo: orderNo || null });

    // บันทึก Order No. แล้ว = ถือว่าเริ่มดำเนินการแล้ว ย้ายไปคอลัมน์ "กำลังดำเนินการ" ให้อัตโนมัติ
    // (ยกเว้นงานที่ปิดไปแล้ว ไม่ไปแตะสถานะปิดงานให้เปิดขึ้นมาเอง)
    const movesToProgress = !!orderNo && j.status !== 'กำลังดำเนินการ' && j.status !== 'ปิดงานแล้ว';
    // ลบ Order No. ออก = ยังไม่ได้เริ่มจริง ย้ายกลับไป "รอดำเนินการ" (เฉพาะงานที่อยู่ "กำลังดำเนินการ" — ไม่แตะงานรอเอกสาร/ปิดแล้ว)
    const movesBackToPending = !orderNo && !!j.orderNo && j.status === 'กำลังดำเนินการ';
    if (movesToProgress || movesBackToPending) {
        jobData.status = movesToProgress ? 'กำลังดำเนินการ' : 'รอดำเนินการ';
        jobData.updatedAt = new Date().toISOString().split('T')[0];
    }

    if (!(await confirmBeforeSave(null, `ตรวจสอบ Order No. ของ ${getJobDisplayNo(j)}`, [
        { label: "Order No.", value: orderNo || "(ลบออก)" },
        ...(movesToProgress ? [{ label: "สถานะใบงาน", value: "จะย้ายเป็น \"กำลังดำเนินการ\"" }] : []),
        ...(movesBackToPending ? [{ label: "สถานะใบงาน", value: "จะย้ายกลับเป็น \"รอดำเนินการ\"" }] : [])
    ]))) return;
    const res = await callCloudAPI("saveJob", { jobData });
    if (!res || res.status === "error") {
        showToast("❌ บันทึก Order No. ไม่สำเร็จ: " + (res && res.message ? res.message : "กรุณาลองใหม่"), "danger");
        return;
    }

    const idx = jobs.findIndex(item => item.id === jobId);
    if (idx !== -1) jobs[idx] = jobData;
    saveData();

    if (movesToProgress) {
        renderJobs();
        showToast(`💾 บันทึก Order No. และย้ายใบงาน ${getJobDisplayNo(jobData)} ไปสถานะ "กำลังดำเนินการ" สำเร็จ`, "success");
        return;
    }
    if (movesBackToPending) {
        renderJobs();
        showToast(`💾 ลบ Order No. และย้ายใบงาน ${getJobDisplayNo(jobData)} กลับไปสถานะ "รอดำเนินการ" แล้ว`, "success");
        return;
    }

    if (orderNo) setOrderNoFieldLocked(input, true);
    showToast(`💾 บันทึก Order No. ของ ${getJobDisplayNo(jobData)} สำเร็จ`, "success");
}

function parseJobTypeItems(jobTypeStr, defaultFee) {
    if (!jobTypeStr) return [];
    
    // Split by comma
    const items = jobTypeStr.split(/,\s*/);
    const parsed = [];
    
    items.forEach(item => {
        // Matches e.g. "แจ้งเข้า (2000)" or "แจ้งเข้า (2000 บาท)" — ราคาต้องอยู่ในวงเล็บท้ายชื่อเท่านั้น
        // (เดิมวงเล็บไม่บังคับ → ตัวเลขท้ายชื่องาน เช่น "แจ้งที่พัก TM.30" ถูกอ่านเป็นราคา 30 บาท)
        const match = item.match(/^(.*?)\s*(?:\((\d[\d,]*)\s*(?:บาท|บ\.)?\))?$/);
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

// ช่อง "ผู้รับผิดชอบ" ในฟอร์มใบงาน — ตัวเลือกจากทีมงานภายใน (team); แก้ได้เฉพาะ Admin/Operation Manager
// Staff เปิดงานใหม่ → ตัวเองเป็นผู้รับผิดชอบอัตโนมัติ
function fillJobAssigneeSelect(job) {
    const sel = document.getElementById("job-assigned-to");
    const hint = document.getElementById("job-assigned-hint");
    if (!sel) return;
    const members = team.filter(m => m.role !== 'account_manager');
    sel.innerHTML = '<option value="">--- ยังไม่มอบหมาย ---</option>' +
        members.map(m => `<option value="${m.id}">${escapeHtml(m.name || '-')} — ${escapeHtml((ROLE_LABELS[m.role] || '').split(' (')[0])}</option>`).join('');
    const canAssign = can('assignJobs');
    let value = job ? (job.assignedTo || '') : (currentUser && ['staff', 'operation_manager'].includes(currentUser.role) ? (currentUser.id || '') : '');
    // ผู้รับผิดชอบเดิมไม่อยู่ในรายชื่อแล้ว (ถูกลบ/เปลี่ยนตำแหน่ง) — ยังแสดงชื่อไว้ไม่ให้ค่าหาย
    if (value && !members.some(m => m.id === value)) sel.insertAdjacentHTML('beforeend', `<option value="${value}">${escapeHtml(getUserNameById(value))}</option>`);
    sel.value = value;
    sel.disabled = !canAssign;
    if (hint) hint.innerText = canAssign ? 'มอบหมายให้ Staff / Operation Manager — ผู้รับผิดชอบจะเห็นงานนี้ในกระดิ่งแจ้งเตือน'
        : 'มอบหมายงานได้เฉพาะ Admin / Operation Manager';
}

function readJobAssignee() {
    const sel = document.getElementById("job-assigned-to");
    return sel && sel.value ? sel.value : null;
}

// เอกสารที่แนบตอนปิดงาน (jobs.attachments จาก submitCloseJob) — แสดงในแบนเนอร์ "ปิดงานแล้ว" ของหน้าต่างใบงาน
// + ปุ่ม "แนบเอกสารปิดงานเพิ่ม" แนบย้อนหลังได้หลายไฟล์ (addJobCloseDocs) สำหรับคนที่แก้ใบงานนี้ได้
// ใบงานที่ยังไม่ปิด (pre = true) แนบเอกสารปิดงานไว้ก่อนได้ — ตอนกดปิดงานไม่ต้องแนบซ้ำ (ดู openJobCloseModal)
function jobCloseDocsHtml(j, pre = j.status !== 'ปิดงานแล้ว') {
    const docs = Array.isArray(j.attachments) ? j.attachments : [];
    const addBtn = canEditJob(j)
        ? `<label class="btn btn-sm btn-outline job-close-add-btn">${icon('plus')} ${pre ? 'แนบเอกสารปิดงานไว้ก่อน' : 'แนบเอกสารปิดงานเพิ่ม'}
               <input type="file" multiple hidden onchange="addJobCloseDocs('${j.id}', this)"></label>`
        : '';
    if (!docs.length) return `<div class="job-close-docs text-muted">${pre ? 'ยังไม่ได้แนบเอกสารปิดงาน' : 'ไม่มีเอกสารแนบตอนปิดงาน'} ${addBtn}</div>`;
    return `<div class="job-close-docs"><strong>เอกสารปิดงาน:</strong>${docs.map((f, k) =>
        `<a href="${escapeHtml(f.url)}" target="_blank" rel="noopener">${icon('clip')} ${escapeHtml(f.name || `ไฟล์ ${k + 1}`)}</a>`).join('')}${addBtn}` +
        `${docs.find(f => f.note) ? `<small class="text-muted">หมายเหตุ: ${escapeHtml(docs.find(f => f.note).note)}</small>` : ''}</div>`;
}

// แนบเอกสารปิดงานย้อนหลัง (งานที่ปิดไปแล้ว) — เพิ่มต่อท้าย jobs.attachments ไม่ทับของเดิม
// ---------- AI อ่านเอกสารที่ยังไม่รู้ประเภท (เอกสารปิดงาน / หมวด "เอกสารอื่นๆ") ----------
// ใช้โหมด worker-auto ของ ocr-document: AI บอกว่าเป็นเอกสารอะไร + อ่านข้อมูลคนงานในคราวเดียว
// คืน { docType, parsed } — docType เป็น key หมวดในแฟ้มคนงาน (ไม่รู้จัก = worker-other) หรือ null ถ้า AI อ่านไม่ได้
async function aiReadWorkerDoc(dataUrl) {
    if (!window.supabaseAdapter || !/^data:(image\/|application\/pdf)/.test(String(dataUrl))) return null;
    try {
        showToast("🤖 AI กำลังอ่านเอกสาร...", "warning");
        const ocr = await window.supabaseAdapter.ocrDocument(dataUrl, 'worker-auto');
        if (!ocr || !ocr.parsedData) return null;
        const t = ocr.parsedData.documentType;
        const known = t && t !== 'worker-other' && WORKER_FOLDER_DOC_TYPES.some(x => x.key === t);
        return { docType: known ? t : 'worker-other', parsed: ocr.parsedData };
    } catch (e) {
        console.warn("aiReadWorkerDoc failed:", e);
        return null;
    }
}

// เอกสารปิดงานที่ AI อ่านได้ → เติมข้อมูลคนงาน + เก็บไฟล์เดียวกัน (ไม่อัปโหลดซ้ำ) เข้าหมวดที่ถูกต้องในแฟ้มคนงาน
// เลข 13 หลักในเอกสารไม่ตรงกับคนงาน → ถามก่อน (ตอบไม่ = ไม่แตะข้อมูลคนงาน แต่ไฟล์ยังอยู่ในใบงาน)
async function fileJobDocIntoWorker(j, read, fileUrl, fileName) {
    const w = j && workers.find(x => x.id === j.workerId);
    if (!w || !read || !fileUrl) return null;
    if (!(await confirmWorkerUidChange({ uid: w.workerUid, firstName: w.firstName, lastName: w.lastName }, read.parsed, fileName))) return null;
    const list = getAttachments(w, read.docType);
    if (list.some(f => f.data === fileUrl)) return null;
    w.attachments = w.attachments || {};
    w.attachments[read.docType] = list.concat([{
        name: fileName, data: fileUrl,
        expiryDate: extractDocExpiryDate(read.docType, read.parsed),
        note: `จากเอกสารปิดงาน ${getJobDisplayNo(j)}`
    }]);
    applyOcrDataToWorker(w, read.docType, read.parsed);
    if (w.status === 'pending_register' && getAttachments(w, 'worker-wp-doc').length > 0 && getAttachments(w, 'worker-receipt').length > 0) {
        w.status = 'active';
        w.skipNotifyEntry = true;
    }
    w.workplace = getCustomerHQAddress(w.employerId);
    const res = await callCloudAPI("saveWorker", { workerData: w });
    if (!res || res.status === "error") { showToast("⚠️ แนบเอกสารแล้ว แต่อัปเดตข้อมูลคนงานไม่สำเร็จ", "danger"); return null; }
    return (WORKER_FOLDER_DOC_TYPES.find(x => x.key === read.docType) || {}).label || read.docType;
}

async function addJobCloseDocs(jobId, input, note = null) {
    const j = jobs.find(item => item.id === jobId);
    const files = Array.from((input && input.files) || []);
    if (input) input.value = '';
    if (!j || !files.length || !canEditJob(j)) return;
    const uploadedAt = new Date().toISOString();
    const added = [];
    const reads = [];
    for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);
        const read = j.workerId ? await aiReadWorkerDoc(dataUrl) : null;
        const up = await uploadDocumentFile(dataUrl, file.name, j.customerId, j.workerId, "job-close-doc");
        if (!up || !up.fileUrl) { showToast(`❌ อัปโหลด "${file.name}" ไม่สำเร็จ`, "danger"); continue; }
        added.push({ name: file.name, url: up.fileUrl, note: note || null, uploadedAt, uploadedBy: currentUser.id || null });
        reads.push({ read, url: up.fileUrl, name: file.name });
    }
    if (!added.length) return;
    const jobData = Object.assign({}, j, { attachments: (Array.isArray(j.attachments) ? j.attachments : []).concat(added) });
    const res = await callCloudAPI("saveJob", { jobData });
    if (!res || res.status === "error") {
        showToast("❌ บันทึกเอกสารปิดงานไม่สำเร็จ: " + (res && res.message ? res.message : "กรุณาลองใหม่"), "danger");
        return;
    }
    const idx = jobs.findIndex(item => item.id === jobId);
    if (idx !== -1) jobs[idx] = jobData;
    const filedLabels = [];
    for (const r of reads) { const label = await fileJobDocIntoWorker(jobData, r.read, r.url, r.name); if (label) filedLabels.push(label); }
    if (filedLabels.length) { showToast(`✨ AI อ่านเอกสารแล้ว — อัปเดตข้อมูลคนงานและเก็บเข้าแฟ้ม: ${filedLabels.join(', ')}`, "success"); renderWorkers(); }
    saveData();
    // หน้าต่างใบงานที่เปิดอยู่: แบนเนอร์ "ปิดงานแล้ว" หรือส่วน "แนบไว้ก่อนปิดงาน" ของใบงานที่ยังไม่ปิด
    const docsEl = document.querySelector('#job-modal .job-close-docs');
    if (docsEl) docsEl.outerHTML = jobCloseDocsHtml(jobData);
    renderJobs();
    showToast(`📎 แนบเอกสารปิดงานเพิ่ม ${added.length} ไฟล์ให้ ${getJobDisplayNo(jobData)} แล้ว`, "success");
    return added.length;
}

// ---------- เพิ่มงานเข้าชุดงานเดิม (ปุ่ม "เพิ่มงานเข้าชุดเดิม" ข้างปุ่ม "แจ้งงาน") ----------
// เลือกประเภทงานใน pop-up ได้เลย — สร้างใบงานใหม่ 1 ใบต่อประเภท ใช้ batchId เดียวกับใบงานต้นทาง
// (ถ้าใบงานต้นทางยังไม่มี batchId จะตั้งให้) ประเภทที่มีในชุดแล้ว/ยังค้างอยู่ที่อื่น ไม่แสดงให้เลือก
// pop-up "เพิ่มงานเข้าชุดเดิม" (ปุ่มข้าง "แจ้งงาน"): ค้นหาเลือกใบงานต้นทาง → ดูรายละเอียด → ยืนยัน
let addBatchSourceId = null;

// 1 รายการต่อ 1 ชุดงาน (ต่อคนงาน) — ใบงานตัวแทนคือใบที่เปิดก่อนสุดของชุด, ป้ายแสดงประเภทงานทั้งชุด
function addBatchPool() {
    const groups = new Map();
    jobs.forEach(j => {
        const key = `${j.batchId || j.id}|${j.workerId}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(j);
    });
    const byOpen = (a, b) => jobOpenedSortKey(a).localeCompare(jobOpenedSortKey(b));
    // ชุดที่ทุกใบงานจบครบแล้ว (ปิดงาน + ชำระเงินแล้ว หรือไม่เรียกเก็บเงิน) ไม่ต้องแสดง
    const settled = j => j.status === 'ปิดงานแล้ว' && (isJobPaid(j) || isJobNoCharge(j));
    return [...groups.values()]
        .filter(list => !list.every(settled))
        .map(list => list.sort(byOpen)[0])
        .sort((a, b) => byOpen(b, a));
}

function addBatchJobLabel(j) {
    const w = workers.find(x => x.id === j.workerId);
    const types = [j, ...getJobBatchSiblings(j, true)].map(s => getCleanJobTypeName(s.jobType));
    return `${w ? `${w.firstName || ''} ${w.lastName || ''}`.replace(/\s+/g, ' ').trim() : 'ไม่พบข้อมูลคนงาน'} • ${types.join(', ')}`;
}

function addBatchJobSub(j) {
    const w = workers.find(x => x.id === j.workerId);
    const c = customers.find(x => x.id === j.customerId);
    const count = getJobBatchSiblings(j, true).length + 1;
    return [getJobDisplayNo(j), count > 1 ? `ชุดงาน ${count} รายการ` : '', w && w.workerUid, c && c.companyName].filter(Boolean).join(' • ');
}

function openAddToBatchModal() {
    if (!can('ops')) return;
    presetSearchSelect('add-batch-job', null);
    addBatchSourceId = null;
    renderAddBatchDetail();
    document.getElementById("add-to-batch-modal").classList.remove("hidden");
    const input = document.getElementById("add-batch-job-search");
    if (input) input.focus();
}

function closeAddToBatchModal() {
    document.getElementById("add-to-batch-modal").classList.add("hidden");
}

function renderAddBatchDetail() {
    const box = document.getElementById("add-batch-detail");
    const btn = document.getElementById("btn-add-batch-confirm");
    const src = addBatchSourceId ? jobs.find(j => j.id === addBatchSourceId) : null;
    if (btn) btn.disabled = !src;
    if (!box) return;
    if (!src) {
        box.innerHTML = `<p class="text-muted">${icon("idea")} เลือกใบงานต้นทาง แล้วงานที่เพิ่มจะอยู่ในชุดเดียวกับใบงานนั้น (1 ประเภทงาน = 1 ใบงาน)</p>`;
        return;
    }
    const w = workers.find(x => x.id === src.workerId);
    const c = customers.find(x => x.id === src.customerId);
    const inBatch = [src, ...getJobBatchSiblings(src, true)];
    const { available, blocked } = addBatchAvailableTypes(src);
    box.innerHTML = `
        <div class="add-batch-card">
            <div><span>ใบงานต้นทาง</span><b>${escapeHtml(getJobDisplayNo(src))} • ${escapeHtml(getCleanJobTypeName(src.jobType))}</b></div>
            <div><span>คนงาน</span><b>${escapeHtml(w ? workerFullName(w) : '-')}${w && w.workerUid ? ` <small>(${escapeHtml(w.workerUid)})</small>` : ''}</b></div>
            <div><span>นายจ้าง</span><b>${escapeHtml(c ? c.companyName : '-')}</b></div>
            <div><span>งานในชุดนี้ (${inBatch.length})</span><b>${inBatch.map(s => `<span class="job-batch-tab"><span class="job-batch-dot" style="background:${isJobStatusOpen(s.status) ? '#f59e0b' : '#22c55e'};"></span>${escapeHtml(getCleanJobTypeName(s.jobType))}</span>`).join(' ')}</b></div>
        </div>
        <label class="add-batch-types-label">เลือกประเภทงานที่จะเพิ่ม (1 ประเภท = 1 ใบงานใหม่ ในชุดเดียวกัน) <span class="required">*</span></label>
        ${available.length ? `<div class="add-batch-types">${available.map(t => `
            <label class="add-batch-type"><input type="checkbox" name="add-batch-type" value="${escapeHtml(t)}" onchange="updateAddBatchConfirm()"> ${escapeHtml(t)}</label>`).join('')}</div>`
            : `<p class="text-muted">${icon("ok")} คนงานคนนี้มีงานครบทุกประเภทในชุดนี้แล้ว ไม่มีประเภทงานที่เพิ่มได้</p>`}
        ${blocked.length ? `<small class="text-muted add-batch-blocked">ไม่แสดง (มีในชุดนี้แล้ว หรือยังค้างอยู่ในใบงานอื่น): ${escapeHtml(blocked.join(', '))}</small>` : ''}`;
    updateAddBatchConfirm();
}

// ประเภทงานที่เพิ่มเข้าชุดได้: ไม่ซ้ำกับงานในชุดนี้ของคนงานคนนี้ (ทุกสถานะ) และไม่ชนงานประเภทเดียวกันที่ยังค้างอยู่ที่อื่น
function addBatchAvailableTypes(src) {
    const allTypes = [...document.querySelectorAll("input[name='job-type-checkbox']")].map(cb => cb.value);
    const inBatchTypes = new Set([src, ...getJobBatchSiblings(src, true)].map(s => getCleanJobTypeName(s.jobType)));
    const available = [], blocked = [];
    allTypes.forEach(t => (inBatchTypes.has(t) || findOpenJobConflict(src.workerId, t, null) ? blocked : available).push(t));
    return { available, blocked };
}

function updateAddBatchConfirm() {
    const btn = document.getElementById("btn-add-batch-confirm");
    if (btn) btn.disabled = !addBatchSourceId || document.querySelectorAll("input[name='add-batch-type']:checked").length === 0;
}

// สร้างใบงานใหม่ 1 ใบต่อประเภทงานที่เลือก ผูก batchId เดียวกับใบงานต้นทาง (ไม่แก้ประเภทงานในใบงานเดิม)
async function confirmAddToBatch() {
    const src = addBatchSourceId ? jobs.find(j => j.id === addBatchSourceId) : null;
    const types = [...document.querySelectorAll("input[name='add-batch-type']:checked")].map(cb => cb.value);
    if (!src || types.length === 0 || !can('ops')) return;
    // ตรวจซ้ำตอนบันทึกจริง เผื่อข้อมูลเปลี่ยนระหว่างเปิด pop-up ค้างไว้
    const { available } = addBatchAvailableTypes(src);
    const bad = types.filter(t => !available.includes(t));
    if (bad.length) { uiAlert(`เพิ่มไม่ได้ — ประเภทงานนี้มีอยู่แล้วหรือยังค้างอยู่: ${bad.join(', ')}`); renderAddBatchDetail(); return; }

    // pop-up ยืนยันก่อนสร้างใบงานจริง: ใบงานต้นทาง/คนงาน/นายจ้าง + งานในชุดตอนนี้ + งานที่จะเพิ่ม
    const card = dialogCardForJob(src);
    card.title = `เพิ่มงานเข้าชุดเดียวกับ ${getJobDisplayNo(src)}`;
    card.rows = [
        ...(card.rows || []).filter(r => r[0] !== 'ค่าบริการ'),
        ['งานในชุดตอนนี้', [src, ...getJobBatchSiblings(src, true)].map(s => getCleanJobTypeName(s.jobType)).join(', ')],
        ['งานที่จะเพิ่ม', `${types.join(', ')} (${types.length} ใบงานใหม่)`]
    ];
    if (!(await uiConfirm(`ยืนยันเพิ่ม ${types.length} ใบงานเข้าชุดเดิม?`, { card, okText: 'ยืนยัน เพิ่มงาน' }))) return;

    const btn = document.getElementById("btn-add-batch-confirm");
    if (btn) btn.disabled = true;
    const batchId = src.batchId || 'batch-' + Date.now().toString().slice(-8);
    const today = new Date().toISOString().split('T')[0];
    let ok = 0, seq = 0;
    for (const t of types) {
        const jobData = {
            id: 'job-' + (Date.now() + seq++).toString().slice(-6),
            batchId, createdAt: today, customerId: src.customerId, workerId: src.workerId,
            jobType: t, fee: 0, status: 'รอดำเนินการ', notes: '', orderNo: null, updatedAt: today,
            agentId: src.agentId || null, openedBy: currentUser.id || null, openedAt: new Date().toISOString(),
            assignedTo: can('assignJobs') ? (src.assignedTo || null) : (currentUser.id || null),
            paymentStatus: 'ยังไม่ออกบิล', attachments: []
        };
        const res = await callCloudAPI("saveJob", { jobData });
        if (res && res.status !== "error") { jobs.push(jobData); ok++; }
    }
    // ใบงานต้นทางยังไม่เคยอยู่ในชุดใด → ผูกเข้าชุดเดียวกับงานที่เพิ่ง
    if (ok > 0 && !src.batchId) {
        src.batchId = batchId;
        const linkRes = await callCloudAPI("saveJob", { jobData: src });
        if (!linkRes || linkRes.status === "error") src.batchId = null;
    }
    saveData();
    renderJobs();
    renderDashboard();
    showToast(ok === types.length ? `เพิ่มงานเข้าชุดเดิม ${ok} ใบงานแล้ว` : `⚠️ เพิ่มได้ ${ok} จาก ${types.length} ใบงาน`, ok === types.length ? "success" : "danger");
    renderAddBatchDetail(); // pop-up ยังเปิดอยู่ → เห็นแท็บงานใหม่ในชุดทันที
}

// กฎ "1 ประเภทงาน = 1 ใบงาน": ตอนแก้ไขใบงานเดิม เลือกประเภทงานได้ทีละ 1 (ติ๊กอันใหม่ = เปลี่ยนประเภท ไม่ใช่เพิ่ม)
// จะเพิ่มงานประเภทอื่นให้คนงานคนเดิม ใช้ปุ่ม "เพิ่มงานเข้าชุดเดิม" แทน (สร้างใบงาน/แท็บใหม่)
document.addEventListener('change', e => {
    const cb = e.target;
    if (!cb || cb.name !== 'job-type-checkbox' || !cb.checked) return;
    const editId = document.getElementById("job-edit-id");
    if (!editId || !editId.value) return;
    const others = [...document.querySelectorAll("input[name='job-type-checkbox']:checked")].filter(x => x !== cb);
    if (!others.length) return;
    others.forEach(x => { x.checked = false; });
    showToast('ใบงาน 1 ใบมีได้ 1 ประเภทงาน — ถ้าจะเพิ่มงานให้คนงานคนนี้ ใช้ปุ่ม "เพิ่มงานเข้าชุดเดิม"', "warning");
});

function openJobModal(id = null) {
    if (customers.length === 0) {
        uiAlert("กรุณาเพิ่มข้อมูลนายจ้างอย่างน้อย 1 รายก่อนสั่งงาน");
        switchView('customers');
        return;
    }

    document.getElementById("job-form").reset();

    // Fill customer dropdown selection
    const custSelect = document.getElementById("job-customer-id");
    custSelect.innerHTML = '<option value="" disabled selected>--- เลือกนายจ้าง ---</option>' +
        customers.map(c => `<option value="${c.id}">${c.companyName}</option>`).join('');

    // Fill agent (ผู้ส่งงาน) dropdown selection
    refreshJobAgentDropdown();

    const modalTitle = document.getElementById("job-modal-title");
    const editIdInput = document.getElementById("job-edit-id");
    const statusGroup = document.getElementById("job-status-group");
    const closedBanner = document.getElementById("job-closed-banner");
    const openedByInfo = document.getElementById("job-opened-by-info");
    const checkBoxes = document.querySelectorAll("input[name='job-type-checkbox']");
    checkBoxes.forEach(cb => {
        cb.checked = false;
    });

    const statusSelect = document.getElementById("job-status");

    // ใบนัดหมาย: แนบได้เฉพาะตอนแก้ไขใบงานที่มีอยู่แล้ว (ตอนแจ้งงานใหม่อาจแตกเป็นหลายใบงาน
    // ต่อคนงาน/ประเภทงาน ยังไม่มีใบงานเดี่ยวให้ผูกไฟล์ใบนัดหมายด้วย)
    tempJobAppointmentDocUrl = null;
    document.getElementById("file-job-appointment").value = "";
    document.getElementById("status-job-appointment").innerHTML = "";
    document.getElementById("job-appointment-section").style.display = id ? "" : "none";

    if (id) {
        modalTitle.innerText = "แก้ไขข้อมูลขั้นตอนและรายละเอียดงาน";
        editIdInput.value = id;

        const j = jobs.find(item => item.id === id);
        custSelect.value = j.customerId;
        // Sync ข้อความที่แสดงในช่องค้นหา (search-select) ให้ตรงกับนายจ้างที่บันทึกไว้เดิม
        const custForSearch = customers.find(c => c.id === j.customerId);
        const custSearchInput = document.getElementById("job-customer-search");
        if (custSearchInput) custSearchInput.value = custForSearch ? custForSearch.companyName : '';

        // Trigger worker dropdown generation (จะเซ็ต Agent ให้ตามนายจ้างที่เลือกไปในตัวด้วย)
        onJobCustomerChange(j.workerId);
        // เปิดกว้างแก้ Agent เองต่อใบงานได้แล้ว (ไม่ล็อกตามนายจ้างอีกต่อไป) — คืนค่า Agent ที่บันทึกไว้ของใบงานนี้
        // กลับมาทับค่า default จากนายจ้างที่ onJobCustomerChange() เพิ่งตั้งไปก่อนหน้านี้ ป้องกันข้อมูลเดิมหาย
        document.getElementById("job-agent-id").value = j.agentId || "";

        // Populate checkboxes (ราคาไม่ได้กรอกที่ฟอร์มนี้แล้ว — ไปกำหนด/แก้ที่หน้าบัญชีและการเงินแทน)
        if (j.jobType) {
            const parsedItems = parseJobTypeItems(j.jobType, j.fee);
            checkBoxes.forEach(cb => {
                const matchedItem = parsedItems.find(item => item.name === cb.value);
                if (matchedItem) {
                    cb.checked = true;
                }
            });
        }
        
        // ปิดงานแล้ว: ล็อกช่องสถานะไว้ (แก้ผ่านปุ่ม "เปิดงานอีกครั้ง" เท่านั้น) และแสดงแบนเนอร์
        if (j.status === 'ปิดงานแล้ว') {
            statusSelect.value = 'กำลังดำเนินการ'; // ค่าใน select เดิมไม่มี option นี้แล้ว ใช้แค่ disable แสดงผล
            statusGroup.style.display = 'none';
            closedBanner.style.display = 'block';
            document.getElementById("job-closed-banner-text").innerHTML =
                `${icon("lock")} ปิดงานแล้วเมื่อ ${j.closedAt ? formatThaiDate(j.closedAt, true) : '-'}` +
                (j.closedBy ? ` โดย ${getUserNameById(j.closedBy)}` : '') +
                jobCloseDocsHtml(j);
        } else {
            statusGroup.style.display = '';
            closedBanner.style.display = 'none';
            statusSelect.value = j.status;
        }

        document.getElementById("job-notes").value = j.notes || '';

        // ใบนัดหมาย: เติมค่าที่เคยแนบ/AI อ่านไว้แล้ว (ถ้ามี)
        document.getElementById("job-appointment-date").value = j.appointmentDate || '';
        document.getElementById("job-appointment-time").value = j.appointmentTime || '';
        document.getElementById("job-appointment-no").value = j.appointmentNo || '';
        document.getElementById("job-appointment-location").value = j.appointmentLocation || '';
        if (j.appointmentDocUrl) {
            document.getElementById("status-job-appointment").innerHTML = `<span class="ai-success">${icon("ok")} แนบไฟล์ใบนัดหมายไว้แล้ว — <a href="${j.appointmentDocUrl}" target="_blank" rel="noopener">เปิดดูไฟล์</a></span>`;
        }

        // ผู้เปิดงาน: แสดงอย่างเดียว แก้ไม่ได้ (ล็อกจาก user ที่เปิดงานครั้งแรก)
        if (j.openedBy) {
            openedByInfo.style.display = 'block';
            openedByInfo.innerText = `เปิดงานโดย: ${getUserNameById(j.openedBy)}`;
        } else {
            openedByInfo.style.display = 'none';
        }

        fillJobAssigneeSelect(j);
        // Show batch siblings (other job types opened together in the same batch)
        renderJobBatchHint(j);
    } else {
        modalTitle.innerText = "แจ้งสั่งงานใหม่ / ขั้นตอนดำเนินการ";
        fillJobAssigneeSelect(null);
        editIdInput.value = "";

        // Reset worker picker (ค้นหา + เลือกหลายคน)
        jobModalWorkers = [];
        jobWorkerSelectedIds = new Set();
        document.getElementById("job-worker-search").value = "";
        syncJobWorkerHiddenSelect();
        renderJobWorkerChecklist();
        renderJobWorkerChips();
        statusGroup.style.display = '';
        closedBanner.style.display = 'none';
        statusSelect.value = "รอดำเนินการ";
        document.getElementById("job-notes").value = "";
        openedByInfo.style.display = 'block';
        openedByInfo.innerText = `เปิดงานโดย: ${currentUser.name} (ผู้ใช้ปัจจุบัน)`;
        renderJobBatchHint(null);
    }

    refreshJobTypeLocks();
    // ดูได้ทุกคน แต่บันทึกได้เฉพาะคนที่มีสิทธิ์ (Staff = งานที่ตัวเองเปิด/ได้รับมอบหมาย, Account Manager = ดูอย่างเดียว)
    const canSaveJob = id ? canEditJob(jobs.find(item => item.id === id)) : (can('ops') || currentUser.role === 'client');
    document.getElementById("btn-save-job-submit").classList.toggle("hidden", !canSaveJob);
    document.getElementById("job-modal").classList.remove("hidden");
}

function getUserNameById(id) {
    if (!id) return '-';
    const u = team.find(x => x.id === id) || users.find(x => x.id === id);
    return u ? u.name : id;
}

function closeJobModal() {
    document.getElementById("job-modal").classList.add("hidden");
}

// ==================== JOB WORKER PICKER (ค้นหา + เลือกคนงานหลายคน) ====================
// ช่อง <select id="job-worker-id"> ยังมีอยู่แต่ถูกซ่อนไว้ (class="hidden") — ใช้เป็นแหล่งเก็บค่าที่เลือกจริง
// เท่านั้น เพื่อให้ getSelectedJobWorkerIds()/saveJob()/refreshJobTypeLocks() ที่มีอยู่แล้วทำงานได้เหมือนเดิม
// โดยไม่ต้องแก้ตรรกะพวกนั้น ส่วน UI ที่ผู้ใช้เห็นจริงคือ checklist + ช่องค้นหาด้านล่างนี้
// (required validation ของ browser ใช้กับ select ที่ซ่อนไม่ได้ — saveJob() เช็คเองแล้วที่ workerIds.length === 0)
let jobModalWorkers = [];
let jobWorkerSelectedIds = new Set();

function onJobCustomerChange(preselectedWorkerIds = null) {
    const custId = document.getElementById("job-customer-id").value;

    // Agent ผู้ส่งงาน: ล็อกตาม Agent ผู้แนะนำของนายจ้างที่เลือกเสมอ (ตั้งค่าได้ที่หน้าข้อมูลนายจ้างเท่านั้น)
    const cust = customers.find(c => c.id === custId);
    document.getElementById("job-agent-id").value = (cust && cust.referredByAgentId) || "";

    // Filter workers under this customer
    jobModalWorkers = workers.filter(w => w.employerId === custId);

    const pre = Array.isArray(preselectedWorkerIds) ? preselectedWorkerIds : (preselectedWorkerIds ? [preselectedWorkerIds] : []);
    jobWorkerSelectedIds = new Set(pre.filter(id => jobModalWorkers.some(w => w.id === id)));

    const searchInput = document.getElementById("job-worker-search");
    if (searchInput) searchInput.value = "";

    syncJobWorkerHiddenSelect();
    renderJobWorkerChecklist();
    renderJobWorkerChips();
    refreshJobTypeLocks();
}

// อัปเดต <select id="job-worker-id"> (ซ่อนอยู่) ให้ตรงกับ jobWorkerSelectedIds เสมอ
function syncJobWorkerHiddenSelect() {
    const workerSelect = document.getElementById("job-worker-id");
    workerSelect.innerHTML = jobModalWorkers.map(w =>
        `<option value="${w.id}" ${jobWorkerSelectedIds.has(w.id) ? 'selected' : ''}>${w.firstName} ${w.lastName} (${w.nationality})</option>`
    ).join('');
}

// วาดรายชื่อคนงานที่ติ๊กเลือกไว้แล้วเป็น chip ลบออกได้ทีละคน (เห็นตลอดแม้เลื่อน/ค้นหาจนคนที่เลือกไว้หลุดจอ)
function renderJobWorkerChips() {
    const chipsEl = document.getElementById("job-worker-chips");
    if (!chipsEl) return;
    if (jobWorkerSelectedIds.size === 0) {
        chipsEl.style.display = 'none';
        chipsEl.innerHTML = '';
        return;
    }
    chipsEl.style.display = 'flex';
    chipsEl.innerHTML = Array.from(jobWorkerSelectedIds).map(id => {
        const w = jobModalWorkers.find(x => x.id === id);
        const label = w ? `${w.firstName} ${w.lastName}` : id;
        return `<span class="job-worker-chip">${label}<button type="button" onclick="toggleJobWorkerSelection('${id}', false)">&times;</button></span>`;
    }).join('');
}

// วาด checklist คนงานของนายจ้างที่เลือก กรองด้วยชื่อ หรือเลขประจำตัวคนงาน 13 หลัก (ช่วยกรณีนายจ้างมีลูกจ้างจำนวนมาก/ชื่อซ้ำ)
function renderJobWorkerChecklist() {
    const listEl = document.getElementById("job-worker-checklist");
    if (!listEl) return;

    if (jobModalWorkers.length === 0) {
        listEl.innerHTML = '<div class="job-worker-empty">--- กรุณาเลือกนายจ้างก่อน หรือไม่พบข้อมูลคนงานต่างด้าวของลูกค้านี้ ---</div>';
        return;
    }

    const q = (document.getElementById("job-worker-search").value || '').trim().toLowerCase();
    const filtered = jobModalWorkers.filter(w => {
        if (!q) return true;
        const name = `${w.firstName} ${w.lastName}`.toLowerCase();
        const uid = (w.workerUid || '').toLowerCase();
        return name.includes(q) || uid.includes(q);
    });

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="job-worker-empty">--- ไม่พบคนงานที่ตรงกับคำค้นหา ---</div>';
        return;
    }

    listEl.innerHTML = filtered.map(w => `
        <label class="job-worker-row">
            <input type="checkbox" ${jobWorkerSelectedIds.has(w.id) ? 'checked' : ''} onchange="toggleJobWorkerSelection('${w.id}', this.checked)">
            <span class="job-worker-row-name">${w.firstName} ${w.lastName}</span>
            <span class="job-worker-row-uid">${w.workerUid ? `เลขประจำตัว ${w.workerUid}` : 'ไม่มีเลขประจำตัว'}</span>
            <span class="job-worker-row-nat">${w.nationality || ''}</span>
        </label>
    `).join('');
}

// เรียกจากช่องค้นหา (oninput) — กรอง checklist โดยไม่แตะสถานะที่เลือกไว้
function filterJobWorkerChecklist() {
    renderJobWorkerChecklist();
}

// ติ๊ก/ยกเลิกคนงาน 1 คน — sync กลับไปที่ select ที่ซ่อนไว้แล้วรันตรรกะเดิม (ล็อกประเภทงาน/แจ้งเตือนงานซ้ำ)
function toggleJobWorkerSelection(workerId, isChecked) {
    if (isChecked) jobWorkerSelectedIds.add(workerId);
    else jobWorkerSelectedIds.delete(workerId);
    syncJobWorkerHiddenSelect();
    renderJobWorkerChips();
    renderJobWorkerChecklist();
    onJobWorkerChange();
}

// คืนรายชื่อ workerId ที่ถูกเลือกไว้ในฟอร์มสั่งงาน (multi-select — เลือกได้หลายคนพร้อมกัน)
function getSelectedJobWorkerIds() {
    const workerSelect = document.getElementById("job-worker-id");
    return Array.from(workerSelect.selectedOptions).map(o => o.value);
}

function onJobWorkerChange() {
    refreshJobTypeLocks();
    const editId = document.getElementById("job-edit-id").value;
    if (!editId) {
        // Only relevant for brand-new job notifications: show whether this
        // worker already has other jobs sitting open right now.
        renderJobBatchHint(null, getSelectedJobWorkerIds());
    }
}

// ==================== JOB TYPE LOCKING (ป้องกันเปิดงานประเภทเดียวกันซ้อนกัน) ====================
// ล็อกช่องติ๊กประเภทงานที่ "คนใดคนหนึ่งในรายชื่อที่เลือก" มีใบงานเดิมค้างอยู่แล้ว (สถานะยังเปิดอยู่)
// ผู้ใช้ต้องไปแก้ไข/ปิดใบงานเดิมก่อน จึงจะเปิดใบงานประเภทเดิมซ้ำให้คนงานคนนั้นได้อีก
function refreshJobTypeLocks() {
    const workerIds = getSelectedJobWorkerIds();
    const editId = document.getElementById("job-edit-id").value || null;
    const checkBoxes = document.querySelectorAll("input[name='job-type-checkbox']");

    checkBoxes.forEach(cb => {
        const wrapper = cb.closest('div');
        if (!wrapper) return;

        const existingNote = wrapper.querySelector('.job-type-lock-note');
        if (existingNote) existingNote.remove();

        if (workerIds.length === 0) {
            cb.disabled = false;
            wrapper.style.opacity = '';
            wrapper.style.background = '';
            wrapper.style.flexWrap = '';
            return;
        }

        // หาว่ามีคนงานคนไหนในรายชื่อที่เลือกไว้ ติดขัดประเภทงานนี้อยู่บ้าง
        const conflicts = workerIds
            .map(wid => ({ wid, conflict: findOpenJobConflict(wid, cb.value, editId) }))
            .filter(x => x.conflict);

        if (conflicts.length > 0) {
            cb.checked = false;
            cb.disabled = true;
            wrapper.style.opacity = '0.55';
            wrapper.style.background = '#fef2f2';
            wrapper.style.flexWrap = 'wrap';

            const note = document.createElement('div');
            note.className = 'job-type-lock-note';
            note.style.cssText = 'width:100%; font-size:11.5px; color:#b91c1c; margin-top:2px; line-height:1.4;';
            const detail = conflicts.map(x => {
                const w = workers.find(item => item.id === x.wid);
                const wName = w ? `${w.firstName} ${w.lastName}` : x.wid;
                return `${wName} (เลขที่ ${getJobDisplayNo(x.conflict)} • ${x.conflict.status})`;
            }).join(', ');
            note.innerHTML = `${icon("lock")} มีงานนี้ค้างอยู่แล้วสำหรับ: ${detail} — กรุณาแก้ไขหรือปิดงานเดิมก่อน`;
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
        hintBox.style.cssText = "font-size:12.5px; border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: 14px; display:none;";
        const container = document.getElementById("job-type-checkboxes-container");
        if (container && container.parentNode) {
            container.parentNode.insertBefore(hintBox, container);
        }
    }

    if (job && job.batchId) {
        // แจ้งงานครั้งเดียวให้หลายคน → batch เดียวกันมีใบงานของคนงานคนอื่นปนอยู่ด้วย
        // แสดงเฉพาะงานอื่นของ "คนงานคนนี้" เป็นรายการ ส่วนคนงานคนอื่นในชุดเดียวกันแค่บอกชื่อ (ไม่ปนเป็นงานของคนนี้)
        const siblings = getJobBatchSiblings(job);
        const mine = siblings.filter(s => s.workerId === job.workerId);
        const otherWorkerIds = [...new Set(siblings.filter(s => s.workerId !== job.workerId).map(s => s.workerId))];
        if (mine.length > 0 || otherWorkerIds.length > 0) {
            const chip = (s) => `<span style="display:inline-block; margin:2px 4px; padding:2px 8px; border-radius:10px; background:white; border:1px solid #c7d2fe;">${getCleanJobTypeName(s.jobType)} <em style="font-style:normal; color:#64748b;">(${s.status})</em></span>`;
            const otherNames = otherWorkerIds.map(id => { const w = workers.find(x => x.id === id); return w ? `${w.firstName} ${w.lastName || ''}`.trim() : '-'; });
            hintBox.style.display = 'block';
            hintBox.style.background = '#eef2ff';
            hintBox.style.color = '#3730a3';
            hintBox.style.border = '1px solid #c7d2fe';
            hintBox.innerHTML =
                (mine.length ? `${icon("clip")} คนงานคนนี้มีงานอื่นที่แจ้งมาพร้อมกันอีก <strong>${mine.length}</strong> รายการ: ${mine.map(chip).join('')}` : '') +
                (otherWorkerIds.length ? `<div style="margin-top:${mine.length ? '6px' : '0'};">${icon("users")} แจ้งพร้อมกันให้คนงานอื่นอีก <strong>${otherWorkerIds.length}</strong> คน (ใบงานแยกของแต่ละคน): ${escapeHtml(otherNames.join(', '))}</div>` : '');
            return;
        }
    }

    const workerIdsForNew = Array.isArray(workerIdForNew) ? workerIdForNew : (workerIdForNew ? [workerIdForNew] : []);
    if (workerIdsForNew.length > 0) {
        const openJobs = jobs.filter(j => workerIdsForNew.includes(j.workerId) && isJobStatusOpen(j.status));
        if (openJobs.length > 0) {
            hintBox.style.display = 'block';
            hintBox.style.background = '#fffbeb';
            hintBox.style.color = '#92400e';
            hintBox.style.border = '1px solid #fde68a';
            hintBox.innerHTML = `${icon("warn")} คนงานที่เลือกมีงานที่ยังเปิดอยู่ <strong>${openJobs.length}</strong> รายการ: ` +
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
    const workerIds = getSelectedJobWorkerIds();
    const agentId = document.getElementById("job-agent-id").value || null;
    const assignedTo = readJobAssignee();

    if (workerIds.length === 0) {
        uiAlert("กรุณาเลือกคนงานอย่างน้อย 1 คน");
        return;
    }

    // Read checkboxes and their prices
    const checkBoxes = document.querySelectorAll("input[name='job-type-checkbox']:checked");
    if (checkBoxes.length === 0) {
        uiAlert("กรุณาเลือกประเภทงานที่แจ้งอย่างน้อย 1 รายการ");
        return;
    }

    // ป้องกันเปิดงานประเภทเดียวกันซ้อนกัน: ตรวจซ้ำอีกครั้งฝั่ง JS ตอนบันทึกจริง (ทุกคนงานที่เลือก)
    // (การล็อกช่องติ๊กใน UI ป้องกันไว้ชั้นหนึ่งแล้ว แต่ตรวจซ้ำเผื่อข้อมูลเปลี่ยนระหว่างเปิดฟอร์มค้างไว้)
    const conflicts = [];
    workerIds.forEach(wid => {
        checkBoxes.forEach(cb => {
            const conflict = findOpenJobConflict(wid, cb.value, editId || null);
            if (conflict) {
                const w = workers.find(item => item.id === wid);
                const wName = w ? `${w.firstName} ${w.lastName}` : wid;
                conflicts.push(`• ${wName} — "${cb.value}" ค้างอยู่ที่ใบงานเลขที่ ${getJobDisplayNo(conflict)} (สถานะ: ${conflict.status})`);
            }
        });
    });
    if (conflicts.length > 0) {
        uiAlert(`ไม่สามารถเปิดงานซ้ำได้\n\nรายการต่อไปนี้ค้างอยู่แล้ว กรุณาแก้ไขหรือปิดงานเดิมก่อน:\n\n${conflicts.join('\n')}`);
        return;
    }

    // ไม่กรอกราคาที่ฟอร์มนี้แล้ว — ราคาค่าบริการไปกำหนด/แก้ไขได้ที่หน้า "บัญชีและการเงิน" แทน
    const selectedItems = [];
    checkBoxes.forEach(cb => {
        selectedItems.push({ name: cb.value });
    });

    const jobTypeLabel = selectedItems.map(it => it.name).join(", ");
    const status = document.getElementById("job-status").value;
    const notes = document.getElementById("job-notes").value;
    const updatedAt = new Date().toISOString().split('T')[0];

    if (!customerId || !jobTypeLabel) {
        uiAlert("กรุณากรอกข้อมูลสั่งงานและเลือกประเภทงานที่แจ้งอย่างน้อย 1 รายการ");
        return;
    }

    // ลูกค้าที่ตั้ง "ต้องชำระก่อนดำเนินการ" ไว้ — ใบงานเดิม (edit) เช็คสถานะการเงินจริง,
    // ใบงานใหม่ (add) ยังไม่เคยออกบิล/รับชำระแน่นอนจึงบล็อกเสมอถ้าเลือกสถานะนี้ตั้งแต่แรก
    const existingJobForGate = editId ? jobs.find(item => item.id === editId) : null;
    const gateBlockReason = jobPrepaymentBlockReason(customerId, status, existingJobForGate ? existingJobForGate.paymentStatus : null);
    if (gateBlockReason) {
        uiAlert(gateBlockReason + "\n\nกรุณาเปิดงานด้วยสถานะ \"รอดำเนินการ\" ไปก่อน แล้วไปออกบิล/รับชำระที่หน้าบัญชีและการเงิน ก่อนย้ายเข้ากำลังดำเนินการ");
        return;
    }

    if (editId) {
        // Edit mode: save as a single job (คงค่า batchId, createdAt, สถานะการเงิน/ปิดงาน/ผู้เปิดงานเดิมไว้เสมอ
        // เพื่อไม่ให้ "เลขที่แจ้งงาน" ซึ่งอิงวันที่เปิดงานครั้งแรกเปลี่ยนไปตอนแก้ไข)
        // ราคา (fee) คงค่าเดิมไว้เสมอ — แก้ราคาได้ที่หน้าบัญชีและการเงินเท่านั้น ไม่ใช่จากฟอร์มนี้
        const originalJob = jobs.find(item => item.id === editId);
        const workerId = workerIds[0];
        const jobData = {
            id: editId,
            batchId: originalJob ? (originalJob.batchId || null) : null,
            createdAt: originalJob ? (originalJob.createdAt || originalJob.updatedAt) : updatedAt,
            orderNo: originalJob ? (originalJob.orderNo || null) : null,
            customerId, workerId, jobType: jobTypeLabel, fee: originalJob ? originalJob.fee : 0, status, notes, updatedAt, agentId,
            assignedTo: can('assignJobs') ? assignedTo : (originalJob ? (originalJob.assignedTo || null) : null),
            appointmentDate: parseDateInput(document.getElementById("job-appointment-date").value.trim()),
            appointmentTime: document.getElementById("job-appointment-time").value.trim() || null,
            appointmentNo: document.getElementById("job-appointment-no").value.trim() || null,
            appointmentLocation: document.getElementById("job-appointment-location").value.trim() || null,
            appointmentDocUrl: tempJobAppointmentDocUrl || (originalJob ? (originalJob.appointmentDocUrl || null) : null)
        };
        if (!(await confirmBeforeSave(e.target.closest("form") || e.target, "ตรวจสอบการแก้ไขใบสั่งงาน"))) return;
        showToast("💾 กำลังบันทึกการแก้ไขใบสั่งงานเข้าคลาวด์...", "warning");
        const jobSaveRes = await callCloudAPI("saveJob", { jobData: jobData });
        if (!jobSaveRes || jobSaveRes.status === "error") {
            showToast("❌ บันทึกไม่สำเร็จ: " + (jobSaveRes && jobSaveRes.message ? jobSaveRes.message : "การแก้ไขยังไม่ถูกบันทึกลงคลาวด์ กรุณาลองใหม่"), "danger");
            return;
        }

        const idx = jobs.findIndex(item => item.id === editId);
        if (idx !== -1) {
            // merge ทับเฉพาะฟิลด์ที่แก้ไขได้จากฟอร์มนี้ — คงค่า paymentStatus/attachments/closedAt/closedBy/openedBy เดิมไว้ใน state ฝั่ง client ด้วย
            jobs[idx] = Object.assign({}, originalJob, jobData);
            showToast("อัปเดตงานและขั้นตอนสำเร็จ", "success");
        }
    } else {
        // Add mode: แตกเป็นคนละใบงานต่อคู่ "คนงาน × ประเภทงาน" ที่เลือกทั้งหมด ผูกกันด้วย batchId เดียวกัน
        // (ตัวอย่างต้นแบบของ "1 ใบงาน หลายคนงาน" — เลือกได้หลายคนพร้อมกัน ระบบแตกเป็นใบงานอิสระให้แต่ละคน
        // แต่รู้ว่ามาจากการแจ้งงานครั้งเดียวกัน — ควรตรวจผลลัพธ์ก่อนใช้กับจำนวนคนงานมากๆ)
        const batchId = 'batch-' + Date.now().toString().slice(-8);
        const totalSubJobs = workerIds.length * selectedItems.length;
        if (!(await confirmBeforeSave(e.target.closest("form") || e.target, "ตรวจสอบก่อนแจ้งงานใหม่", [{ label: "จำนวนใบงานที่จะสร้าง", value: `${totalSubJobs} ใบ (${workerIds.length} คน × ${selectedItems.length} ประเภทงาน)` }]))) return;
        showToast(`💾 กำลังสร้างใบสั่งงานย่อย ${totalSubJobs} รายการเข้าคลาวด์...`, "warning");

        let failedCount = 0;
        let seq = 0;
        for (const wid of workerIds) {
            for (const item of selectedItems) {
                const subJobData = {
                    id: 'job-' + (Date.now() + seq).toString().slice(-6),
                    batchId: batchId,
                    createdAt: updatedAt,
                    customerId,
                    workerId: wid,
                    jobType: item.name,
                    fee: 0,
                    status: status,
                    notes: notes,
                    orderNo: null,
                    updatedAt: updatedAt,
                    agentId,
                    openedBy: currentUser.id || null,
                    openedAt: new Date().toISOString(), // เวลาเปิดงานจริง ใช้เรียงงานใหม่ล่าสุดไว้บนสุด
                    assignedTo,
                    paymentStatus: 'ยังไม่ออกบิล',
                    attachments: []
                };
                seq++;

                const subJobRes = await callCloudAPI("saveJob", { jobData: subJobData });
                if (subJobRes && subJobRes.status !== "error") {
                    jobs.push(subJobData);
                } else {
                    failedCount++;
                }
            }
        }
        if (failedCount > 0) {
            showToast(`⚠️ บันทึกไม่สำเร็จ ${failedCount} จาก ${totalSubJobs} รายการ (ยังไม่ถูกบันทึกลงชีต)`, "danger");
        } else {
            showToast(`เปิดใบสั่งงานย่อย ${totalSubJobs} รายการสำเร็จ`, "success");
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
    // ใบงานที่อยู่ในบิลที่ยังใช้งาน ลบไม่ได้ — ยอดบิล/ใบเสร็จจะไม่ตรงกับใบงาน (ยกเลิกบิลก่อน)
    const billedInv = getJobInvoice(jobs.find(j => j.id === id));
    if (billedInv) {
        uiAlert(`ใบงานนี้อยู่ในบิล ${billedInv.invoiceNo} แล้ว ลบไม่ได้\nถ้าต้องการลบ ให้ยกเลิกบิลนั้นก่อน (หน้าการเงิน > ออกบิล/รับเงิน)`);
        return;
    }

    if (await uiConfirm("คุณแน่ใจหรือไม่ที่จะลบใบแจ้งงานนี้?", { card: dialogCardForJob(jobs.find(j => j.id === id)) })) {
        showToast("🗑️ กำลังลบข้อมูลออกจากคลาวด์...", "warning");
        const res = await callCloudAPI("deleteRecord", { sheetName: "Jobs", id: id });
        if (res && res.status !== "error") {
            jobs = jobs.filter(j => j.id !== id);
            saveData();
            renderJobs();
            showToast("ลบข้อมูลสั่งงานเรียบร้อยแล้ว", "success");
        } else {
            showToast("❌ ลบไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
        }
    }
}

// ==================== AGENTS (ผู้ส่งงาน) — master list เพิ่มทีหลังได้ ====================
function renderAgentsList() {
    const tbody = document.getElementById("agents-tbody");
    if (!tbody) return;

    const searchInput = document.getElementById("search-agent");
    const query = searchInput ? searchInput.value.toLowerCase() : "";
    const filtered = query ? agents.filter(a => (a.name || "").toLowerCase().includes(query)) : agents;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align:center; padding:20px;">${icon("bad")} ${query ? 'ไม่พบ Agent ตามคำค้นหา' : 'ยังไม่มี Agent ในระบบ (กดเพิ่ม Agent ใหม่ด้านบน)'}</td></tr>`;
        return;
    }

    const canPay = can('commission');
    tbody.innerHTML = filtered.map(a => {
        const referredCount = customers.filter(c => c.referredByAgentId === a.id).length;
        const jobCount = jobs.filter(j => j.agentId === a.id).length;
        const com = agentCommissionSummary(a.id);
        return `
        <tr>
            <td><strong>${a.name}</strong></td>
            <td>${a.phone || '-'}</td>
            <td style="text-align:center;">${referredCount} ราย</td>
            <td style="text-align:center;">${jobCount} งาน</td>
            <td class="inv-num needs-commission">${Number(a.defaultCommission) > 0 ? fmtMoney(a.defaultCommission) : '<span class="text-muted">-</span>'}</td>
            <td class="inv-num needs-commission">
                ${com.due > 0 ? `<strong class="text-danger">${fmtMoney(com.due)}</strong> <small class="text-muted">(${com.dueCount} งาน)</small>` : '<span class="text-muted">-</span>'}
                ${com.waiting > 0 ? `<div><small class="text-muted">รอลูกค้าชำระ ${fmtMoney(com.waiting)}</small></div>` : ''}
                ${com.paidOut > 0 ? `<div><small class="text-success">จ่ายแล้ว ${fmtMoney(com.paidOut)}</small></div>` : ''}
            </td>
            <td class="actions-col">
                <div class="actions-cell">
                    ${canPay && com.due > 0 ? `<button class="btn btn-sm btn-gold" onclick="openCommissionPayoutModal('${a.id}')" style="white-space:nowrap;">${icon("cash")} จ่ายค่าคอม</button>` : ''}
                    <button class="action-icon-btn" onclick="openAgentModal('${a.id}')" title="แก้ไข Agent">${icon("edit")}</button>
                    ${currentUser.role === 'admin' ? `<button class="action-icon-btn delete-btn" onclick="deleteAgent('${a.id}', '${(a.name || '').replace(/'/g, "\\'")}')" title="ลบ Agent">${icon("trash")}</button>` : ''}
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

function refreshJobAgentDropdown(selectedId) {
    const agentSelect = document.getElementById("job-agent-id");
    if (!agentSelect) return;
    agentSelect.innerHTML = '<option value="">--- ไม่ระบุ ---</option>' +
        agents.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    if (selectedId) agentSelect.value = selectedId;
}

function refreshCustomerAgentDropdown(selectedId) {
    const agentSelect = document.getElementById("cust-referred-by-agent");
    if (!agentSelect) return;
    agentSelect.innerHTML = '<option value="">--- ไม่ระบุ ---</option>' +
        agents.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    agentSelect.value = selectedId || "";
}

function openAgentModal(id = null) {
    if (!can('manageAgents')) {
        showToast("❌ ตำแหน่งนี้ไม่มีสิทธิ์จัดการ Agent", "danger");
        return;
    }
    document.getElementById("agent-form").reset();
    document.getElementById("agent-edit-id").value = id || "";
    document.getElementById("agent-modal-title").innerHTML = id ? "" + icon("edit") + " แก้ไข Agent" : "" + icon("plus") + " เพิ่ม Agent ใหม่";

    if (id) {
        const a = agents.find(item => item.id === id);
        if (a) {
            document.getElementById("agent-name").value = a.name;
            document.getElementById("agent-phone").value = a.phone || "";
            document.getElementById("agent-default-commission").value = Number(a.defaultCommission) > 0 ? a.defaultCommission : "";
        }
    }

    document.getElementById("agent-modal").classList.remove("hidden");
}

function closeAgentModal() {
    document.getElementById("agent-modal").classList.add("hidden");
}

async function saveAgentForm(e) {
    e.preventDefault();
    const editId = document.getElementById("agent-edit-id").value;
    const name = document.getElementById("agent-name").value.trim();
    const phone = document.getElementById("agent-phone").value.trim();
    // Operation Manager ไม่เห็นช่องค่าคอม → คงค่าเดิมไว้ ไม่ให้ถูกล้างเป็น 0
    const prevAgent = editId ? agents.find(a => a.id === editId) : null;
    const defaultCommission = can('commission') ? round2(document.getElementById("agent-default-commission").value) : (prevAgent ? Number(prevAgent.defaultCommission) || 0 : 0);
    if (!name) {
        uiAlert("กรุณากรอกชื่อ Agent");
        return;
    }

    const agentData = { id: editId || ('agent-' + Date.now().toString().slice(-8)), name, phone, defaultCommission };
    if (!(await confirmBeforeSave(e.target.closest("form") || e.target, "ตรวจสอบข้อมูล Agent"))) return;
    showToast("💾 กำลังบันทึก Agent...", "warning");
    const res = await callCloudAPI("saveAgent", { agentData });
    if (!res || res.status === "error") {
        showToast("❌ บันทึกไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
        return;
    }

    if (editId) {
        const idx = agents.findIndex(a => a.id === editId);
        if (idx !== -1) agents[idx] = agentData;
    } else {
        agents.push(agentData);
    }
    saveData();

    refreshJobAgentDropdown(agentData.id);
    renderAgentsList();
    closeAgentModal();
    showToast(`บันทึก Agent "${agentData.name}" สำเร็จ`, "success");
}

async function deleteAgent(id, name) {
    if (currentUser.role !== 'admin') {
        showToast("❌ เฉพาะแอดมิน (Admin) เท่านั้นที่สามารถลบ Agent ได้", "danger");
        return;
    }
    const ag = agents.find(a => a.id === id) || { name };
    const agJobs = jobs.filter(j => j.agentId === id).length;
    if (!(await uiConfirm(`ลบ Agent "${name}" หรือไม่?`, { card: { imageIcon: "users", imageIconColor: "teal", title: ag.name || name, rows: [["เบอร์โทร", ag.phone], ["งานที่แนะนำมา", `${agJobs} งาน`]] } }))) return;

    showToast("🗑️ กำลังลบ Agent...", "warning");
    const res = await callCloudAPI("deleteRecord", { sheetName: "Agents", id });
    if (!res || res.status === "error") {
        showToast("❌ ลบไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
        return;
    }

    agents = agents.filter(a => a.id !== id);
    saveData();
    refreshJobAgentDropdown();
    renderAgentsList();
    showToast(`ลบ Agent "${name}" สำเร็จ`, "success");
}

// ==================== รายจ่ายของกิจการ (Expenses) ====================
function renderExpenses() {
    const query = (document.getElementById("search-expense").value || "").toLowerCase();
    const categoryFilter = document.getElementById("filter-expense-category").value;
    const tbody = document.getElementById("expenses-tbody");
    if (!tbody) return;

    // เติมตัวเลือกหมวดหมู่ในฟิลเตอร์จากหมวดที่มีข้อมูลอยู่จริง (คงค่าที่เลือกไว้เดิม)
    const categorySelect = document.getElementById("filter-expense-category");
    if (categorySelect) {
        const currentFilter = categorySelect.value;
        const categories = Array.from(new Set(expenses.map(e => e.category).filter(Boolean))).sort();
        categorySelect.innerHTML = '<option value="">ทุกหมวดหมู่</option>' +
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
        categorySelect.value = currentFilter;
    }

    const filtered = expenses.filter(e => {
        const matchSearch = !query || (e.description || "").toLowerCase().includes(query) || (e.category || "").toLowerCase().includes(query);
        const matchCategory = !categoryFilter || e.category === categoryFilter;
        return matchSearch && matchCategory;
    }).sort((a, b) => (b.expenseDate || "").localeCompare(a.expenseDate || ""));

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align:center; padding:30px;">${icon("bad")} ยังไม่มีรายการรายจ่าย${query || categoryFilter ? "ตามตัวกรอง" : "ในระบบ"}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(e => {
        const payMethodHtml = e.paymentMethod === 'เงินสด'
            ? '' + icon("cash") + ' เงินสด'
            : (e.paymentMethod ? `${renderBankLogoBadge(e.paymentMethod, 20)} <span style="margin-left:4px;">${e.paymentMethod}</span>` : '<span class="text-muted">-</span>');
        const dateLabel = e.expenseDate ? formatThaiDate(e.expenseDate) : '-';
        const slipLink = (e.attachment && e.attachment.data)
            ? ` <a href="${e.attachment.data}" target="_blank" rel="noopener" title="ดูสลิป/ใบเสร็จที่แนบไว้">${icon("receipt")}</a>`
            : '';
        return `
            <tr>
                <td>${dateLabel}</td>
                <td><span class="badge badge-gold">${e.category || '-'}</span></td>
                <td>${e.description || '<span class="text-muted">-</span>'}${slipLink}</td>
                <td style="text-align: right; font-weight: 600; color: var(--danger);">${(e.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.</td>
                <td style="display: flex; align-items: center;">${payMethodHtml}</td>
                <td class="actions-col">
                    <div class="actions-cell">
                        <button class="action-icon-btn" onclick="openExpenseModal('${e.id}')" title="แก้ไขรายจ่าย">${icon("edit")}</button>
                        ${currentUser.role === 'admin' ? `<button class="action-icon-btn delete-btn" onclick="deleteExpense('${e.id}')" title="ลบรายจ่าย">${icon("trash")}</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function populateExpensePaymentMethodOptions(selectedValue) {
    const select = document.getElementById("expense-payment-method");
    if (!select) return;
    select.innerHTML = BANK_SELECT_HEAD + '<option value=""><span class="opt-bank-text">-- ไม่ระบุ --</span></option>' + cashOptionHtml('เงินสด', 'เงินสด (Cash)') +
        banks.map(b => bankOptionHtml(b, `bank:${b.id}`)).join('');
    select.value = selectedValue || "";
    if (select.value !== (selectedValue || "")) select.value = ""; // ค่าเก่าที่ไม่ตรงบัญชีไหน (เช่นชื่อธนาคารที่มีหลายบัญชี) ให้เลือกใหม่
}

// แนบสลิป/ใบเสร็จรายจ่าย + ใช้ Gemini OCR อ่านจำนวนเงิน/วันที่/รายละเอียด/หมวดหมู่ แล้วกรอกฟอร์มให้อัตโนมัติ
function dropExpenseSlipHandler(e) {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processExpenseSlipFile(e.dataTransfer.files[0]);
    }
}

function expenseSlipFileSelectHandler(e) {
    if (e.target.files && e.target.files.length > 0) {
        processExpenseSlipFile(e.target.files[0]);
    }
}

function processExpenseSlipFile(file) {
    const statusEl = document.getElementById("status-expense-slip");
    const uploadBox = document.getElementById("drop-expense-slip");
    statusEl.innerHTML = `<span class="ai-processing">${icon("bot")} กำลังอัปโหลดและให้ AI อ่านสลิป...</span>`;

    const reader = new FileReader();
    reader.onload = async function (ev) {
        const fileContent = ev.target.result;
        const fileName = file.name;

        const uploadResult = await uploadDocumentFile(fileContent, fileName, "expenses", "", "expense-slip");
        if (uploadResult && uploadResult.aiRejected) {
            statusEl.innerHTML = `<span class="ai-error">${icon("warn", "amber")} ${getAiRejectedMessage(uploadResult.ocrError)}</span>`;
            return;
        }
        const storedUrl = uploadResult ? uploadResult.fileUrl : null;

        if (!storedUrl) {
            statusEl.innerHTML = `<span class="ai-error">${icon("bad")} อัปโหลดไม่สำเร็จ</span>`;
            return;
        }

        tempExpenseAttachment = { name: fileName, data: storedUrl };
        showExpenseSlipAttached();
        uploadBox.classList.add("success-upload");
        statusEl.innerHTML = `<span class="ai-success">${icon("ok")} แนบไฟล์สำเร็จ</span>`;

        if (uploadResult.parsedData) {
            applyGeminiDataToExpenseForm(uploadResult.parsedData);
            showToast("✨ AI อ่านข้อมูลจากสลิปและกรอกฟอร์มให้อัตโนมัติแล้ว กรุณาตรวจสอบความถูกต้องอีกครั้ง", "success");
        } else if (uploadResult.manualEntry) {
            focusManualEntryFields("expense-slip");
        }
    };
    reader.readAsDataURL(file);
}

function applyGeminiDataToExpenseForm(parsedData) {
    if (!parsedData) return;
    if (parsedData.amount) {
        const amount = parseFloat(String(parsedData.amount).replace(/,/g, ''));
        if (!isNaN(amount)) document.getElementById("expense-amount").value = amount;
    }
    if (parsedData.date) {
        const isoDate = parseDateInput(parsedData.date);
        if (isoDate) document.getElementById("expense-date").value = isoDate;
    }
    if (parsedData.description) {
        document.getElementById("expense-description").value = parsedData.description;
    }
    if (parsedData.category) {
        const categorySelect = document.getElementById("expense-category");
        const validOption = Array.from(categorySelect.options).some(o => o.value === parsedData.category);
        if (validOption) categorySelect.value = parsedData.category;
    }
}

function showExpenseSlipAttached() {
    const wrap = document.getElementById("expense-slip-attached");
    const link = document.getElementById("expense-slip-link");
    if (!tempExpenseAttachment) {
        wrap.classList.add("hidden");
        return;
    }
    link.href = tempExpenseAttachment.data || "#";
    link.innerHTML = `${icon("clip")} ${escapeHtml(tempExpenseAttachment.name)}`;
    wrap.classList.remove("hidden");
}

function removeExpenseSlip() {
    tempExpenseAttachment = null;
    showExpenseSlipAttached();
    const uploadBox = document.getElementById("drop-expense-slip");
    const statusEl = document.getElementById("status-expense-slip");
    const fileInput = document.getElementById("file-expense-slip");
    uploadBox.classList.remove("success-upload");
    statusEl.innerHTML = "";
    if (fileInput) fileInput.value = "";
}

function openExpenseModal(id = null) {
    document.getElementById("expense-form").reset();
    const modalTitle = document.getElementById("expense-modal-title");
    const editIdInput = document.getElementById("expense-edit-id");

    tempExpenseAttachment = null;
    document.getElementById("drop-expense-slip").classList.remove("success-upload");
    document.getElementById("status-expense-slip").innerHTML = "";

    if (id) {
        modalTitle.innerHTML = "" + icon("edit") + " แก้ไขรายการรายจ่าย";
        editIdInput.value = id;
        const e = expenses.find(item => item.id === id);
        if (e) {
            document.getElementById("expense-date").value = e.expenseDate || "";
            document.getElementById("expense-amount").value = e.amount || 0;
            document.getElementById("expense-category").value = e.category || "";
            document.getElementById("expense-description").value = e.description || "";
            populateExpensePaymentMethodOptions(expenseBankId(e) ? `bank:${expenseBankId(e)}` : e.paymentMethod);
            if (e.attachment && e.attachment.data) {
                tempExpenseAttachment = e.attachment;
                document.getElementById("drop-expense-slip").classList.add("success-upload");
            }
        }
    } else {
        modalTitle.innerHTML = "" + icon("plus") + " เพิ่มรายจ่ายใหม่";
        editIdInput.value = "";
        document.getElementById("expense-date").value = new Date().toISOString().split('T')[0];
        populateExpensePaymentMethodOptions();
    }

    showExpenseSlipAttached();
    document.getElementById("expense-modal").classList.remove("hidden");
}

function closeExpenseModal() {
    document.getElementById("expense-modal").classList.add("hidden");
}

async function saveExpense(e) {
    e.preventDefault();
    const editId = document.getElementById("expense-edit-id").value;
    const expenseDate = document.getElementById("expense-date").value;
    const amount = parseFloat(document.getElementById("expense-amount").value);
    const category = document.getElementById("expense-category").value;
    const description = document.getElementById("expense-description").value.trim();
    // ค่าใน dropdown: "เงินสด" หรือ "bank:<id>" (ผูกบัญชีจริง ใช้คำนวณยอดคงเหลือรายบัญชี) — paymentMethod ยังเก็บชื่อธนาคารไว้แสดงผล
    const methodVal = document.getElementById("expense-payment-method").value || "";
    const payBank = methodVal.startsWith("bank:") ? banks.find(b => b.id === methodVal.slice(5)) : null;
    const paymentMethod = payBank ? payBank.bankName : (methodVal || null);
    const bankId = payBank ? payBank.id : null;

    if (!expenseDate || !category || isNaN(amount) || amount < 0) {
        uiAlert("กรุณากรอกวันที่ หมวดหมู่ และจำนวนเงินให้ถูกต้อง");
        return;
    }

    const expenseData = {
        id: editId || 'expense-' + Date.now(),
        expenseDate, amount, category, description, paymentMethod, bankId,
        attachment: tempExpenseAttachment || {}
    };

    if (!(await confirmBeforeSave(e.target.closest("form") || e.target, "ตรวจสอบรายจ่าย"))) return;
    showToast("💾 กำลังบันทึกรายจ่ายเข้าคลาวด์...", "warning");
    const res = await callCloudAPI("saveExpense", { expenseData });
    if (!res || res.status === "error") {
        showToast("❌ บันทึกไม่สำเร็จ: " + (res && res.message ? res.message : "ข้อมูลยังไม่ถูกบันทึกลงคลาวด์ กรุณาลองใหม่"), "danger");
        return;
    }

    if (editId) {
        const idx = expenses.findIndex(item => item.id === editId);
        if (idx !== -1) {
            expenses[idx] = { ...expenses[idx], ...expenseData }; // คง agentId/jobIds ของรายจ่ายค่าคอมไว้
            showToast("แก้ไขรายการรายจ่ายสำเร็จ", "success");
        }
    } else {
        expenses.push(expenseData);
        showToast("เพิ่มรายการรายจ่ายสำเร็จ", "success");
    }

    saveData();
    renderExpenses();
    closeExpenseModal();
}

async function deleteExpense(id) {
    if (currentUser.role !== 'admin') {
        showToast("❌ เฉพาะแอดมิน (Admin) เท่านั้นที่สามารถลบรายจ่ายได้", "danger");
        return;
    }
    const ex = expenses.find(e => e.id === id);
    if (!(await uiConfirm("ลบรายการรายจ่ายนี้หรือไม่?", { card: ex ? { imageIcon: "cash", imageIconColor: "green", title: `${Number(ex.amount || 0).toLocaleString()} บาท`, subtitle: ex.category || "", rows: [["วันที่", ex.expenseDate ? formatThaiDate(ex.expenseDate) : ""], ["รายละเอียด", ex.description], ["จ่ายโดย", ex.paymentMethod]] } : null }))) return;

    showToast("🗑️ กำลังลบรายจ่าย...", "warning");
    const res = await callCloudAPI("deleteRecord", { sheetName: "Expenses", id });
    if (!res || res.status === "error") {
        showToast("❌ ลบไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
        return;
    }

    expenses = expenses.filter(item => item.id !== id);
    saveData();
    renderExpenses();
    showToast("ลบรายการรายจ่ายสำเร็จ", "success");
}

// ==================== ปิดงาน (แนบเอกสารแล้วปิด) / เปิดงานอีกครั้ง ====================

// ถ้าใบงานนี้เป็นประเภท "แจ้งออกคนงานต่างด้าว" ให้ sync สถานะคนงานที่ผูกกับงานตาม targetStatus
// (ปิดงาน -> archived, เปิดงานอีกครั้ง -> active) คืนค่า { applied: true } เมื่อมีการเปลี่ยนสถานะจริง
async function syncWorkerStatusForExitJob(job, targetStatus) {
    if (getCleanJobTypeName(job.jobType) !== EXIT_JOB_TYPE) return { applied: false };

    const worker = workers.find(w => w.id === job.workerId);
    if (!worker || worker.status === targetStatus) return { applied: false };

    const updatedWorker = Object.assign({}, worker, { status: targetStatus });
    const res = await callCloudAPI("saveWorker", { workerData: updatedWorker });
    if (!res || res.status === "error") {
        showToast("⚠️ บันทึกใบงานสำเร็จ แต่ตั้งสถานะคนงานอัตโนมัติไม่สำเร็จ กรุณาแก้ไขสถานะคนงานด้วยตนเอง", "warning");
        return { applied: false };
    }

    const idx = workers.findIndex(w => w.id === worker.id);
    if (idx !== -1) workers[idx] = updatedWorker;
    saveData();
    renderWorkers();
    return { applied: true };
}

// ประเภทงานที่ปิดงานได้โดยไม่ต้องแนบเอกสาร/รูปยืนยัน
const JOB_CLOSE_NO_FILE_TYPES = ["ออกใบรับรองแพทย์"];
function jobCloseNeedsFile(j) {
    return !JOB_CLOSE_NO_FILE_TYPES.includes(getCleanJobTypeName(j.jobType));
}

function openJobCloseModal(jobId) {
    const j = jobs.find(item => item.id === jobId);
    if (!j) return;
    if (!canEditJob(j)) { showToast("❌ ปิดงานได้เฉพาะงานที่ตัวเองเปิดหรือได้รับมอบหมาย", "danger"); return; }

    document.getElementById("job-close-id").value = jobId;
    // แนบเอกสารปิดงานไว้ก่อนแล้ว → แสดงรายการ และไม่บังคับแนบซ้ำ (แนบเพิ่มได้)
    const preDocs = Array.isArray(j.attachments) ? j.attachments : [];
    const existingEl = document.getElementById("job-close-existing");
    if (existingEl) {
        existingEl.classList.toggle("hidden", !preDocs.length);
        existingEl.innerHTML = preDocs.length
            ? `<strong>${icon('ok')} แนบเอกสารไว้แล้ว ${preDocs.length} ไฟล์</strong> — กดยืนยันปิดงานได้เลย หรือแนบเพิ่มด้านล่าง` +
              preDocs.map((f, k) => `<a href="${escapeHtml(f.url)}" target="_blank" rel="noopener">${icon('clip')} ${escapeHtml(f.name || `ไฟล์ ${k + 1}`)}</a>`).join('')
            : '';
    }
    const needsFile = jobCloseNeedsFile(j) && !preDocs.length;
    document.getElementById("job-close-file").required = needsFile;
    document.getElementById("job-close-file-required").classList.toggle("hidden", !needsFile);
    document.getElementById("job-close-file").value = "";
    document.getElementById("job-close-note").value = "";
    const cust = customers.find(c => c.id === j.customerId);
    const work = workers.find(w => w.id === j.workerId);
    document.getElementById("job-close-target-label").innerText =
        `ใบงาน ${getJobDisplayNo(j)} • ${getCleanJobTypeName(j.jobType)} • ` +
        `${work ? `${work.firstName} ${work.lastName}` : 'ไม่พบคนงาน'} (${cust ? cust.companyName : 'ไม่พบนายจ้าง'})`;

    document.getElementById("job-close-modal").classList.remove("hidden");
}

function closeJobCloseModal() {
    document.getElementById("job-close-modal").classList.add("hidden");
}

// ปุ่ม "แนบไว้ก่อน (ยังไม่ปิดงาน)" ในหน้าต่างปิดงาน: อัปโหลดไฟล์ที่เลือก + AI อ่านเติมข้อมูลคนงาน (addJobCloseDocs)
// งานยังเปิดอยู่ — หน้าต่างแสดงรายการไฟล์ที่แนบแล้ว กลับมากด "ยืนยันปิดงาน" ทีหลังได้โดยไม่ต้องแนบซ้ำ
async function saveJobCloseDocsOnly() {
    const jobId = document.getElementById("job-close-id").value;
    const fileInput = document.getElementById("job-close-file");
    if (!fileInput.files || fileInput.files.length === 0) { uiAlert("กรุณาเลือกไฟล์ที่จะแนบไว้ก่อน"); return; }
    const note = document.getElementById("job-close-note").value.trim();
    const btn = document.getElementById("btn-save-close-docs");
    if (btn) { btn.disabled = true; btn.innerHTML = `${icon("hourglass")} กำลังอัปโหลด...`; }
    try {
        const added = await addJobCloseDocs(jobId, fileInput, note || null);
        if (added) openJobCloseModal(jobId); // วาดรายการ "แนบไว้แล้ว" ใหม่ + ล้างช่องเลือกไฟล์
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = `${icon("clip")} แนบไว้ก่อน (ยังไม่ปิดงาน)`; }
    }
}

async function submitCloseJob(e) {
    e.preventDefault();
    const jobId = document.getElementById("job-close-id").value;
    const j = jobs.find(item => item.id === jobId);
    if (!j) return;

    const fileInput = document.getElementById("job-close-file");
    const note = document.getElementById("job-close-note").value.trim();
    const hasPreDocs = Array.isArray(j.attachments) && j.attachments.length > 0; // แนบไว้ก่อนแล้ว
    if (jobCloseNeedsFile(j) && !hasPreDocs && (!fileInput.files || fileInput.files.length === 0)) {
        uiAlert("กรุณาแนบเอกสารยืนยันการปิดงานก่อน");
        return;
    }
    if (!(await confirmBeforeSave(e.target.closest("form") || e.target, `ตรวจสอบก่อนปิดงาน ${getJobDisplayNo(j)}`))) return;

    const btn = document.getElementById("btn-confirm-close-job");
    btn.disabled = true;
    btn.innerHTML = "" + icon("hourglass") + " กำลังอัปโหลด...";

    try {
        const files = Array.from(fileInput.files);
        const closedAt = new Date().toISOString();
        const newAttachments = [];
        const reads = []; // ผล AI ของแต่ละไฟล์ — ใช้เติมข้อมูลคนงาน/เก็บเข้าแฟ้มหลังปิดงานสำเร็จ
        for (const file of files) {
            const fileDataUrl = await readFileAsDataUrl(file);
            const read = j.workerId ? await aiReadWorkerDoc(fileDataUrl) : null;
            const uploadResult = await uploadDocumentFile(fileDataUrl, file.name, j.customerId, j.workerId, "job-close-doc");
            if (!uploadResult) {
                showToast(`❌ อัปโหลดเอกสาร "${file.name}" ไม่สำเร็จ ยังไม่ปิดงาน`, "danger");
                return;
            }
            reads.push({ read, url: uploadResult.fileUrl, name: file.name });
            newAttachments.push({
                name: file.name,
                url: uploadResult.fileUrl,
                note: note || null,
                uploadedAt: closedAt,
                uploadedBy: currentUser.id || null
            });
        }

        let existingAttachments = Array.isArray(j.attachments) ? j.attachments : [];
        // ปิดงานโดยใช้เอกสารที่แนบไว้ก่อน (ไม่ได้แนบไฟล์ใหม่) — หมายเหตุปิดงานไปติดกับไฟล์เดิมที่ยังไม่มีหมายเหตุ ไม่ให้หาย
        if (note && newAttachments.length === 0) existingAttachments = existingAttachments.map(f => f.note ? f : { ...f, note });
        const jobData = Object.assign({}, j, {
            status: 'ปิดงานแล้ว',
            attachments: existingAttachments.concat(newAttachments),
            closedAt,
            closedBy: currentUser.id || null,
            updatedAt: closedAt.split('T')[0]
        });

        const res = await callCloudAPI("saveJob", { jobData });
        if (!res || res.status === "error") {
            showToast("❌ บันทึกการปิดงานไม่สำเร็จ: " + (res && res.message ? res.message : "กรุณาลองใหม่"), "danger");
            return;
        }

        const idx = jobs.findIndex(item => item.id === jobId);
        if (idx !== -1) jobs[idx] = jobData;
        // เอกสารที่ AI อ่านได้ → เติมข้อมูลคนงาน + เก็บเข้าหมวดที่ถูกต้องในแฟ้มคนงาน (ก่อนตั้งสถานะพ้นสภาพของงานแจ้งออก)
        const filedLabels = [];
        for (const r of reads) { const label = await fileJobDocIntoWorker(jobData, r.read, r.url, r.name); if (label) filedLabels.push(label); }
        if (filedLabels.length) showToast(`✨ AI อ่านเอกสารแล้ว — อัปเดตข้อมูลคนงานและเก็บเข้าแฟ้ม: ${filedLabels.join(', ')}`, "success");
        saveData();
        closeJobCloseModal();
        renderJobs();
        renderBillingTab();
        renderDashboard();
        if (filedLabels.length) renderWorkers();

        const archiveResult = await syncWorkerStatusForExitJob(jobData, 'archived');
        const archiveMsg = archiveResult.applied ? " และตั้งสถานะคนงานเป็น 'พ้นสภาพ/แจ้งออก' อัตโนมัติ" : "";
        showToast(`📎 ปิดงาน ${getJobDisplayNo(jobData)} สำเร็จ${archiveMsg}`, "success");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "" + icon("ok") + " ยืนยันปิดงาน";
    }
}

async function reopenJob(jobId) {
    const j = jobs.find(item => item.id === jobId);
    if (!j) return;
    if (!canEditJob(j)) {
        showToast("❌ คุณไม่มีสิทธิ์เปลี่ยนสถานะงานนี้ (Staff แก้ได้เฉพาะงานที่ตัวเองเปิดหรือได้รับมอบหมาย)", "danger");
        return;
    }
    if (!(await uiConfirm(`เปิดงาน ${getJobDisplayNo(j)} อีกครั้งหรือไม่? (สถานะจะกลับเป็น "กำลังดำเนินการ")`, { okText: "เปิดงานอีกครั้ง", card: dialogCardForJob(j) }))) return;

    const jobData = Object.assign({}, j, {
        status: 'กำลังดำเนินการ',
        closedAt: null,
        closedBy: null,
        updatedAt: new Date().toISOString().split('T')[0]
    });

    showToast("🔓 กำลังเปิดงานอีกครั้ง...", "warning");
    const res = await callCloudAPI("saveJob", { jobData });
    if (!res || res.status === "error") {
        showToast("❌ เปิดงานไม่สำเร็จ: " + (res && res.message ? res.message : "กรุณาลองใหม่"), "danger");
        return;
    }

    const idx = jobs.findIndex(item => item.id === jobId);
    if (idx !== -1) jobs[idx] = jobData;
    saveData();
    renderJobs();
    renderBillingTab();
    renderDashboard();

    const restoreResult = await syncWorkerStatusForExitJob(jobData, 'active');
    const restoreMsg = restoreResult.applied ? " และคืนสถานะคนงานเป็น 'ปกติ' อัตโนมัติ" : "";
    showToast(`🔓 เปิดงาน ${getJobDisplayNo(jobData)} อีกครั้งสำเร็จ${restoreMsg}`, "success");
}

function reopenJobFromModal() {
    const editId = document.getElementById("job-edit-id").value;
    if (!editId) return;
    reopenJob(editId).then(() => closeJobModal());
}

// ==================== BANK ACCOUNTS MODULE LOGIC ====================
// ลำดับบัญชีธนาคาร (banks.sortOrder) — ลำดับเดียวกันทุกผู้ใช้ ลากสลับได้ในแท็บ "บัญชีธนาคาร"
// เรียง array banks ทั้งก้อนไว้ตั้งแต่ตอนโหลด รายการเลือกบัญชีทุกจุด (banks.map) จึงเรียงตามนี้ไปด้วย
function sortBanks(list) {
    return list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.bankName || '').localeCompare(String(b.bankName || '')));
}

let _bankSortable = null;
function setupBankSortable(grid, enabled) {
    if (_bankSortable) { _bankSortable.destroy(); _bankSortable = null; }
    if (!enabled || typeof Sortable === 'undefined') return;
    _bankSortable = Sortable.create(grid, {
        animation: 180,
        draggable: '.bank-card[data-bank-id], .bank-card[data-cash-card]',
        handle: '.bank-drag-handle',              // ลากจากที่จับ (มือถือ/ไอแพดเลื่อนหน้าจอผ่านการ์ดได้ตามปกติ)
        ghostClass: 'bank-card-ghost',
        chosenClass: 'bank-card-chosen',
        onEnd: () => saveBankOrder(Array.from(grid.querySelectorAll('.bank-card[data-bank-id], .bank-card[data-cash-card]'))
            .map(el => el.dataset.bankId || 'cash'))
    });
}

// ids = ลำดับการ์ดบนจอ ('cash' = การ์ดเงินสด) → ลำดับ 1..n ให้บัญชี (banks.sort_order) และการ์ดเงินสด (app_settings)
async function saveBankOrder(ids) {
    const changed = [];
    let cashOrder = null;
    ids.forEach((id, i) => {
        if (id === 'cash') { cashOrder = i + 1; return; }
        const b = banks.find(x => x.id === id);
        if (b && b.sortOrder !== i + 1) changed.push({ bank: b, prev: b.sortOrder, sortOrder: i + 1 });
    });
    const cashChanged = cashOrder !== null && Number(appSettings.cash_card_order) !== cashOrder;
    if (changed.length === 0 && !cashChanged) return;
    changed.forEach(c => { c.bank.sortOrder = c.sortOrder; });
    sortBanks(banks);
    const res = changed.length ? await callCloudAPI("reorderBanks", { order: changed.map(c => ({ id: c.bank.id, sortOrder: c.sortOrder })) }) : { status: 'success' };
    const resCash = cashChanged ? await callCloudAPI("saveSetting", { key: 'cash_card_order', value: cashOrder }) : { status: 'success' };
    if (!res) changed.forEach(c => { c.bank.sortOrder = c.prev; });
    if (resCash && cashChanged) appSettings.cash_card_order = cashOrder;
    if (!res || !resCash) { sortBanks(banks); renderBanks(); return; }
    saveData();
    showToast("↕️ บันทึกลำดับบัญชีแล้ว — ทุกคนเห็นลำดับนี้", "success");
}

function renderBanks() {
    const query = document.getElementById("search-bank").value.toLowerCase();
    const grid = document.getElementById("banks-list-grid");
    // ลากสลับได้เฉพาะ admin/manager และตอนไม่ได้ค้นหา (รายการที่กรองแล้วจัดลำดับไม่ได้ชัดเจน)
    const canReorder = can('finance') && !query && banks.length > 0;

    const filtered = banks.filter(b => 
        b.bankName.toLowerCase().includes(query) ||
        b.accountName.toLowerCase().includes(query) ||
        b.accountNumber.includes(query)
    );

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <p>${icon("bad")} ไม่พบบัญชีธนาคารรับโอน</p>
            </div>
        `;
        setupBankSortable(grid, false);
        return;
    }

    grid.innerHTML = filtered.map(b => {
        let deleteBtn = '';
        let editBtn = '';

        if (can('finance')) {
            editBtn = `
                <button class="action-icon-btn btn-sm" onclick="openBankModal('${b.id}')" title="แก้ไขบัญชีธนาคาร">
                    ${icon("edit")}
                </button>
            `;
        }

        if (currentUser.role === 'admin') {
            deleteBtn = `
                <button class="action-icon-btn btn-sm delete-btn" onclick="deleteBank('${b.id}')" title="ลบบัญชีธนาคาร">
                    ${icon("trash")}
                </button>
            `;
        }

        return `
            <div class="bank-card" data-bank-id="${b.id}">
                ${canReorder ? `<button type="button" class="bank-drag-handle" title="ลากเพื่อสลับลำดับบัญชี" aria-label="ลากเพื่อสลับลำดับ">${icon('grip')}</button>` : ''}
                <div class="bank-card-actions">
                    ${editBtn}
                    ${deleteBtn}
                </div>
                <div class="bank-card-info">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        ${renderBankLogoBadge(b.bankName, 32)}
                        <span class="badge badge-gold">${b.bankName}</span>
                    </div>
                    <h4>${b.accountName}</h4>
                    <div class="bank-card-acc-no">${b.accountNumber}</div>
                </div>
                ${(() => {
                    // ยอดคงเหลือ = ยอดยกมา + เงินรับเข้า − รายจ่ายที่จ่ายจากบัญชีนี้ (ดู bankAccountBalance)
                    const bal = bankAccountBalance(b.id);
                    return `
                <div class="bank-balance">
                    <div class="bank-balance-main"><span>ยอดคงเหลือ (คำนวณจากระบบ)</span><strong class="${bal.balance < 0 ? 'text-danger' : ''}">${fmtMoney(bal.balance)}</strong></div>
                    <div class="bank-balance-rows">
                        <div><span>ยอดยกมา${b.openingDate ? ` (${formatThaiDate(b.openingDate)})` : ''}</span><b>${fmtMoney(bal.opening)}</b></div>
                        <div class="is-in"><span>+ รับเข้า</span><b>${fmtMoney(bal.inflow)}</b></div>
                        <div class="is-out"><span>− จ่ายออก</span><b>${fmtMoney(bal.outflow)}</b></div>
                    </div>
                </div>`;
                })()}
                <div class="bank-card-meta">
                    <div>${icon("chat")} พร้อมเพย์ ID: <strong>${b.promptPayId || '-'}</strong></div>
                </div>
            </div>
        `;
    }).join('') + (() => {
        const cash = cashBalance();
        return `
            <div class="bank-card cash-card" data-cash-card="1">
                ${canReorder ? `<button type="button" class="bank-drag-handle" title="ลากเพื่อสลับลำดับ" aria-label="ลากเพื่อสลับลำดับ">${icon('grip')}</button>` : ''}
                <div class="bank-card-info">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span class="cash-badge">${icon("cash")}</span><span class="badge badge-success">เงินสด</span>
                    </div>
                    <h4>เงินสดในมือ</h4>
                </div>
                <div class="bank-balance">
                    <div class="bank-balance-main"><span>ยอดคงเหลือ (คำนวณจากระบบ)</span><strong class="${cash.balance < 0 ? 'text-danger' : ''}">${fmtMoney(cash.balance)}</strong></div>
                    <div class="bank-balance-rows">
                        <div class="is-in"><span>+ รับเงินสด</span><b>${fmtMoney(cash.inflow)}</b></div>
                        <div class="is-out"><span>− จ่ายเงินสด</span><b>${fmtMoney(cash.outflow)}</b></div>
                    </div>
                </div>
            </div>`;
    })();
    // การ์ดเงินสดไม่ใช่แถวใน banks — ตำแหน่งเก็บใน app_settings.cash_card_order (เทียบกับ sortOrder ของบัญชี)
    const cashOrder = appSettings.cash_card_order == null ? NaN : Number(appSettings.cash_card_order);
    const cashEl = grid.querySelector('.cash-card');
    if (cashEl && !query && Number.isFinite(cashOrder)) {
        const before = Array.from(grid.querySelectorAll('.bank-card[data-bank-id]'))
            .find(el => ((banks.find(b => b.id === el.dataset.bankId) || {}).sortOrder || 0) > cashOrder);
        if (before) grid.insertBefore(cashEl, before);
    }
    setupBankSortable(grid, canReorder);
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
        document.getElementById("bank-opening-balance").value = Number(b.openingBalance) ? b.openingBalance : "";
        document.getElementById("bank-opening-date").value = b.openingDate || "";
    } else {
        modalTitle.innerText = "เพิ่มบัญชีธนาคารรับเงินใหม่";
        editIdInput.value = "";
    }

    updateBankNameLogoPreview();
    document.getElementById("bank-modal").classList.remove("hidden");
}

function updateBankNameLogoPreview() {
    const select = document.getElementById("bank-name");
    const preview = document.getElementById("bank-name-logo-preview");
    if (!select || !preview) return;
    preview.innerHTML = select.value ? renderBankLogoBadge(select.value, 34) : "";
}

function closeBankModal() {
    document.getElementById("bank-modal").classList.add("hidden");
}

async function saveBank(e) {
    e.preventDefault();
    const editId = document.getElementById("bank-edit-id").value;
    const bankName = document.getElementById("bank-name").value;
    const accountName = document.getElementById("bank-account-name").value;
    const accountNumber = document.getElementById("bank-account-number").value;
    const promptPayId = document.getElementById("bank-promptpay-id").value.trim();

    if (!bankName || !accountName || !accountNumber || !promptPayId) {
        uiAlert("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
        return;
    }

    const existing = editId ? banks.find(b => b.id === editId) : null;
    const bankData = {
        id: editId || 'bank-' + Date.now(),
        bankName, accountName, accountNumber, promptPayId,
        openingBalance: round2(document.getElementById("bank-opening-balance").value),
        openingDate: document.getElementById("bank-opening-date").value || null,
        // บัญชีใหม่ต่อท้ายสุด, แก้ไขคงลำดับเดิม
        sortOrder: existing ? (existing.sortOrder || 0) : banks.reduce((m, b) => Math.max(m, b.sortOrder || 0), 0) + 1
    };

    if (!(await confirmBeforeSave(e.target.closest("form") || e.target, "ตรวจสอบบัญชีธนาคาร"))) return;
    showToast("💾 กำลังบันทึกบัญชีธนาคารเข้าคลาวด์...", "warning");
    const res = await callCloudAPI("saveBank", { bankData });
    if (!res || res.status === "error") {
        showToast("❌ บันทึกไม่สำเร็จ: " + (res && res.message ? res.message : "ข้อมูลยังไม่ถูกบันทึกลงคลาวด์ กรุณาลองใหม่"), "danger");
        return;
    }

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
// ข้อมูลจาก Supabase Auth (อีเมลจริง / เข้าระบบล่าสุด / ระงับ) — โหลดผ่าน Edge Function manage-user เฉพาะ Admin
let userAuthInfo = null;
let userAuthInfoLoading = false;

async function loadUserAuthInfo(force = false) {
    if (!currentUser || currentUser.role !== 'admin' || userAuthInfoLoading || (userAuthInfo && !force)) return;
    userAuthInfoLoading = true;
    try {
        const res = await callCloudAPI("manageUser", { action: "list" });
        if (res && res.status === "success") {
            userAuthInfo = {};
            (res.data || []).forEach(a => { userAuthInfo[a.id] = a; });
        } else if (!userAuthInfo) {
            userAuthInfo = {};
        }
    } catch (err) {
        if (!userAuthInfo) userAuthInfo = {};
    } finally {
        userAuthInfoLoading = false;
    }
    renderUsers();
}

function renderUsers() {
    const tbody = document.getElementById("users-tbody");
    if (!tbody) return;
    if (!userAuthInfo) loadUserAuthInfo();
    const auth = userAuthInfo || {};

    const searchEl = document.getElementById("search-user");
    const search = searchEl ? searchEl.value.trim().toLowerCase() : "";
    const emailOf = u => (auth[u.id] && auth[u.id].email) || (String(u.email || '').includes('@') ? u.email : '');

    const filtered = users.filter(u => {
        if (!search) return true;
        return (u.name || "").toLowerCase().includes(search) || emailOf(u).toLowerCase().includes(search);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">ไม่พบบัญชีผู้ใช้งาน</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(u => {
        const a = auth[u.id] || {};
        const safeName = (u.name || '').replace(/'/g, "\\'");
        const isSelf = u.id === currentUser.id;
        const status = !userAuthInfo ? '<span class="text-muted">กำลังโหลด...</span>'
            : a.suspended ? '<span class="badge badge-danger">ระงับอยู่</span>'
            : `<span class="badge badge-success">ใช้งานได้</span><div class="text-muted" style="font-size:11.5px;">${a.lastSignInAt ? 'เข้าล่าสุด ' + formatThaiDate(a.lastSignInAt, true) : 'ยังไม่เคยเข้าระบบ'}</div>`;
        return `
        <tr>
            <td>${escapeHtml(u.name || '-')}</td>
            <td>${escapeHtml(emailOf(u) || '-')}</td>
            <td><span class="badge">${getRoleLabel(u.role)}</span></td>
            <td>${u.role === 'client' ? escapeHtml((customers.find(c => c.id === u.customer_id) || {}).companyName || u.customer_id || '-') : '-'}</td>
            <td>${status}</td>
            <td style="text-align:center; white-space:nowrap;">
                <button class="action-icon-btn" onclick="openUserModal('${u.id}')" title="แก้ไขชื่อ/บทบาท">${icon("edit")}</button>
                <button class="action-icon-btn" onclick="adminSetUserPassword('${u.id}', '${safeName}')" title="ตั้งรหัสผ่านใหม่">${icon("lock")}</button>
                <button class="action-icon-btn" onclick="adminChangeUserEmail('${u.id}', '${safeName}')" title="เปลี่ยนอีเมลเข้าระบบ">${icon("outbox")}</button>
                ${isSelf ? '' : a.suspended
                    ? `<button class="action-icon-btn" onclick="adminToggleUserSuspend('${u.id}', '${safeName}', false)" title="เปิดใช้งานบัญชี">${icon("unlock")}</button>`
                    : `<button class="action-icon-btn" onclick="adminToggleUserSuspend('${u.id}', '${safeName}', true)" title="ระงับบัญชีชั่วคราว">${icon("ban")}</button>`}
                ${isSelf ? '' : `<button class="action-icon-btn delete-btn" onclick="deleteUserAccountUi('${u.id}', '${safeName}')" title="ลบบัญชี">${icon("trash")}</button>`}
            </td>
        </tr>`;
    }).join('');
}

async function askAdminPin() {
    return await uiPrompt("กรอกรหัส PIN เพื่อยืนยัน:", { inputType: "password", placeholder: "PIN", okText: "ยืนยัน" });
}

async function runManageUser(payload, okMsg) {
    showToast("กำลังบันทึก...", "warning");
    const res = await callCloudAPI("manageUser", payload);
    if (!res || res.status === "error") {
        showToast("❌ ไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
        return false;
    }
    showToast(okMsg, "success");
    await loadUserAuthInfo(true);
    return true;
}

// ตั้งรหัสผ่านใหม่ทันที ไม่ต้องส่งอีเมล (ไม่ติดโควตาอีเมลของ Supabase)
async function adminSetUserPassword(userId, userName) {
    if (currentUser.role !== 'admin') return;
    const password = await uiPrompt(`ตั้งรหัสผ่านใหม่ให้ "${userName}" (อย่างน้อย 8 ตัวอักษร):`, { inputType: "password", placeholder: "รหัสผ่านใหม่", okText: "ถัดไป" });
    if (!password) return;
    if (password.length < 8) { uiAlert("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"); return; }
    const again = await uiPrompt("พิมพ์รหัสผ่านใหม่อีกครั้ง:", { inputType: "password", placeholder: "ยืนยันรหัสผ่าน", okText: "ถัดไป" });
    if (!again) return;
    if (again !== password) { uiAlert("รหัสผ่านทั้งสองครั้งไม่ตรงกัน"); return; }
    const pin = await askAdminPin();
    if (!pin) return;
    await runManageUser({ action: "set_password", userId, pin, password }, `ตั้งรหัสผ่านใหม่ให้ "${userName}" แล้ว — แจ้งรหัสให้เจ้าของบัญชี`);
}

async function adminChangeUserEmail(userId, userName) {
    if (currentUser.role !== 'admin') return;
    const current = (userAuthInfo && userAuthInfo[userId] && userAuthInfo[userId].email) || '';
    const email = await uiPrompt(`อีเมลเข้าระบบใหม่ของ "${userName}"${current ? ` (ปัจจุบัน: ${current})` : ''}:`, { placeholder: "name@example.com", okText: "ถัดไป" });
    if (!email) return;
    const pin = await askAdminPin();
    if (!pin) return;
    await runManageUser({ action: "change_email", userId, pin, email }, `เปลี่ยนอีเมลของ "${userName}" แล้ว — ใช้อีเมลใหม่เข้าระบบได้ทันที`);
}

// ระงับ = เข้าระบบไม่ได้ แต่บัญชี/ประวัติงานยังอยู่ (ต่างจากลบบัญชี) — เปิดใช้ใหม่ได้ทุกเมื่อ
async function adminToggleUserSuspend(userId, userName, suspend) {
    if (currentUser.role !== 'admin') return;
    const msg = suspend
        ? `ระงับบัญชี "${userName}" หรือไม่? ผู้ใช้จะเข้าระบบไม่ได้จนกว่าจะเปิดใช้ใหม่ (ข้อมูลและประวัติงานยังอยู่ครบ)`
        : `เปิดใช้งานบัญชี "${userName}" อีกครั้งหรือไม่?`;
    if (!(await uiConfirm(msg, { okText: suspend ? "ระงับบัญชี" : "เปิดใช้งาน" }))) return;
    const pin = await askAdminPin();
    if (!pin) return;
    await runManageUser({ action: suspend ? "suspend" : "unsuspend", userId, pin }, suspend ? `ระงับบัญชี "${userName}" แล้ว` : `เปิดใช้งานบัญชี "${userName}" แล้ว`);
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

function openUserModal(id = null) {
    if (currentUser.role !== 'admin') {
        showToast("❌ เฉพาะแอดมิน (Admin) เท่านั้นที่สามารถจัดการบัญชีผู้ใช้งานได้", "danger");
        return;
    }
    document.getElementById("user-form").reset();

    const editIdInput = document.getElementById("user-edit-id");
    const modalTitle = document.getElementById("user-modal-title");
    const submitBtn = document.getElementById("btn-save-user-submit");
    const emailGroup = document.getElementById("user-email-group");
    const passwordGroup = document.getElementById("user-password-group");
    const pinGroup = document.getElementById("user-pin-group");
    const editNote = document.getElementById("user-edit-note");
    const emailInput = document.getElementById("user-email");
    const passwordInput = document.getElementById("user-password");
    const pinInput = document.getElementById("user-pin");

    if (id) {
        const u = users.find(item => item.id === id);
        if (!u) return;

        editIdInput.value = id;
        modalTitle.innerText = "แก้ไขบัญชีผู้ใช้งาน";
        submitBtn.innerText = "บันทึกการแก้ไข";

        // อีเมล/รหัสผ่าน/PIN แก้ไม่ได้ที่นี่ (ต้องใช้ service role — ดูหมายเหตุในฟอร์ม)
        emailGroup.classList.add("hidden");
        passwordGroup.classList.add("hidden");
        pinGroup.classList.add("hidden");
        editNote.classList.remove("hidden");
        emailInput.required = false;
        passwordInput.required = false;
        pinInput.required = false;

        document.getElementById("user-name").value = u.name || "";
        document.getElementById("user-role").value = u.role || "staff";
        toggleUserCustomerField();
        if (u.role === 'client') {
            document.getElementById("user-customer-id").value = u.customer_id || "";
        }
    } else {
        editIdInput.value = "";
        modalTitle.innerText = "เพิ่มบัญชีผู้ใช้งานใหม่";
        submitBtn.innerText = "บันทึกบัญชีผู้ใช้งาน";

        emailGroup.classList.remove("hidden");
        passwordGroup.classList.remove("hidden");
        pinGroup.classList.remove("hidden");
        editNote.classList.add("hidden");
        emailInput.required = true;
        passwordInput.required = true;
        pinInput.required = true;

        toggleUserCustomerField();
    }

    document.getElementById("user-modal").classList.remove("hidden");
}

function closeUserModal() {
    document.getElementById("user-modal").classList.add("hidden");
}

async function saveUser(e) {
    e.preventDefault();

    const editId = document.getElementById("user-edit-id").value;
    const name = document.getElementById("user-name").value.trim();
    const role = document.getElementById("user-role").value;
    const customerId = document.getElementById("user-customer-id") ? document.getElementById("user-customer-id").value : "";

    if (!name || !role) {
        uiAlert("กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน");
        return;
    }
    if (role === 'client' && !customerId) {
        uiAlert("กรุณาเลือกนายจ้างสำหรับบัญชีประเภท Client");
        return;
    }

    if (editId) {
        // แก้ไข: name/role/customer_id เท่านั้น (RLS อนุญาต admin แก้ profiles ได้ตรงๆ)
        if (!(await confirmBeforeSave(e.target.closest("form") || e.target, "ตรวจสอบการแก้ไขบัญชีผู้ใช้"))) return;
        showToast("💾 กำลังบันทึกการแก้ไขเข้าคลาวด์...", "warning");
        const res = await callCloudAPI("updateUserProfile", {
            userId: editId,
            profileData: { name, role, customer_id: role === 'client' ? customerId : null }
        });
        if (!res || res.status === "error") {
            showToast("❌ บันทึกไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
            return;
        }

        const idx = users.findIndex(u => u.id === editId);
        if (idx !== -1) {
            users[idx] = Object.assign({}, users[idx], { name, role, customer_id: role === 'client' ? customerId : null });
        }
        localStorage.setItem("mw_users", JSON.stringify(users));
        showToast("แก้ไขบัญชีผู้ใช้งานสำเร็จ", "success");
        closeUserModal();
        renderUsers();
        return;
    }

    // เพิ่มใหม่
    const email = document.getElementById("user-email").value.trim();
    const password = document.getElementById("user-password").value;
    const pin = document.getElementById("user-pin").value.trim();

    if (!email || !password) {
        uiAlert("กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน");
        return;
    }
    if (!pin) {
        uiAlert("กรุณากรอกรหัส PIN เพื่อยืนยันสิทธิ์การเพิ่มบัญชี");
        return;
    }

    const userData = { name, email, password, role, customer_id: role === 'client' ? customerId : '-' };

    if (!(await confirmBeforeSave(e.target.closest("form") || e.target, "ตรวจสอบบัญชีผู้ใช้ใหม่"))) return;
    showToast("💾 กำลังบันทึกบัญชีผู้ใช้งานเข้าคลาวด์...", "warning");
    const res = await callCloudAPI("saveUser", { userData: userData, pin: pin });
    if (!res || res.status === "error") {
        showToast("❌ บันทึกไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
        return;
    }

    users.push({ id: res.data && res.data.id, email, name, role, customer_id: userData.customer_id });
    localStorage.setItem("mw_users", JSON.stringify(users));
    showToast("เพิ่มบัญชีผู้ใช้งานใหม่สำเร็จ", "success");
    closeUserModal();
    renderUsers();
}

async function deleteUserAccountUi(userId, userName) {
    if (currentUser.role !== 'admin') {
        showToast("❌ เฉพาะแอดมิน (Admin) เท่านั้นที่สามารถลบบัญชีผู้ใช้งานได้", "danger");
        return;
    }
    const acc = users.find(u => u.id === userId) || {};
    if (!(await uiConfirm(`ลบบัญชี "${userName}" ถาวรหรือไม่? ผู้ใช้งานคนนี้จะเข้าระบบไม่ได้อีกต่อไป`, { okText: "ลบบัญชี", card: { imageIcon: "user", title: acc.name || userName, subtitle: { admin: "Administrator", manager: "Manager", staff: "Staff", client: "Client" }[acc.role] || acc.role || "" } }))) return;

    const pin = await uiPrompt("กรอกรหัส PIN เพื่อยืนยันการลบบัญชี:", { inputType: "password", placeholder: "PIN", okText: "ยืนยันลบบัญชี" });
    if (!pin) return;

    showToast("🗑️ กำลังลบบัญชีผู้ใช้งาน...", "warning");
    const res = await callCloudAPI("deleteUser", { userId, pin });
    if (!res || res.status === "error") {
        showToast("❌ ลบไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
        return;
    }

    users = users.filter(u => u.id !== userId);
    localStorage.setItem("mw_users", JSON.stringify(users));
    showToast(`ลบบัญชี "${userName}" สำเร็จ`, "success");
    renderUsers();
}

async function deleteBank(id) {
    if (currentUser.role !== 'admin') {
        showToast("❌ คุณไม่มีสิทธิ์ลบข้อมูลนี้", "danger");
        return;
    }
    if (!(await uiConfirm("คุณแน่ใจหรือไม่ที่จะลบช่องทางการโอนเงินนี้?", { card: dialogCardForBank(banks.find(b => b.id === id)) }))) return;

    showToast("🗑️ กำลังลบข้อมูลออกจากคลาวด์...", "warning");
    const res = await callCloudAPI("deleteRecord", { sheetName: "Banks", id });
    if (!res || res.status === "error") {
        showToast("❌ ลบไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
        return;
    }

    banks = banks.filter(b => b.id !== id);
    saveData();
    renderBanks();
    showToast("ลบบัญชีธนาคารเรียบร้อยแล้ว", "success");
}


// ==================== INVOICE / BILLING NOTE GENERATOR ====================
// บิลมี 2 สถานะในหน้าต่างนี้ (ดู ACCOUNTING MODULE ท้ายไฟล์ด้วย):
//   - ร่าง (draft): สร้างจากใบงาน / บิลรวม / บิลอิสระ ยังไม่มีเลขที่ ยังไม่ถูกบันทึก — กด "ออกบิล" เพื่อรับเลข INV-ปปปป-NNNN
//   - บิลที่ออกแล้ว (stored): อยู่ในตาราง invoices — รับเงินได้หลายงวด พิมพ์ซ้ำ/ยกเลิกได้ (currentInvoiceId)
let currentActiveJobForInvoice = null;
let currentInvoiceItems = [];
let currentInvoiceJobIds = [];
let freeInvoiceCustomerId = null;
let freeInvoiceWorkerId = null;
let currentInvoiceId = null;       // id ของบิลที่ออกแล้วที่กำลังเปิดอยู่ (null = ร่าง)
let currentInvoiceKind = 'job';    // 'job' | 'combined' | 'free' — ใช้ตอนออกบิลจากร่าง

// ตั้งวันที่ออกบิลบนหัวใบวางบิล และเติมวันที่เดียวกันในช่องลายเซ็น "ผู้วางบิล" (ชื่อยังเซ็นมือ)
function setInvoiceDate(date) {
    document.getElementById("inv-date").innerText = formatThaiDate(date);
    const deliveredDateEl = document.getElementById("inv-delivered-date");
    if (deliveredDateEl) deliveredDateEl.innerText = `วันที่ ${formatThaiDate(date)}`;
}

// กำหนดชำระมาตรฐาน: 15 วันนับจากวันออกบิล (แก้ข้อความบนบิลได้ก่อนออกบิล)
const INVOICE_DUE_DAYS = 15;
const DUE_DATE_SUFFIX = `(${INVOICE_DUE_DAYS} วันนับจากวันออกบิล)`;
function defaultDueDateText(issueDate) {
    const due = new Date(issueDate);
    due.setDate(due.getDate() + INVOICE_DUE_DAYS);
    return `${formatThaiDate(due)} ${DUE_DATE_SUFFIX}`;
}

// ที่อยู่สำนักงานใหญ่ + เลขผู้เสียภาษีของนายจ้าง สำหรับหัวบิล (ใช้ร่วมทุกโหมด)
function customerInvoiceSnapshot(cust) {
    if (!cust) return { name: "ไม่ระบุบริษัท/ลูกค้า", addr: "ไม่ระบุที่อยู่", tax: "เลขประจำตัวผู้เสียภาษี: -" };
    const branches = cust.branches || [];
    const hq = branches.find(b => (b.name || '').includes("สำนักงานใหญ่")) || branches[0];
    const addr = hq
        ? `เลขที่ ${hq.houseNo || '-'} ม.${hq.moo || '-'} ต.${hq.subdistrict || '-'} อ.${hq.district || '-'} จ.${hq.province || '-'} ${hq.postalCode || ''}`.trim()
        : "ไม่ระบุที่อยู่";
    return { name: cust.companyName || '-', addr, tax: `เลขผู้เสียภาษี: ${cust.taxId || '-'}` };
}

function fillInvoiceCustomerHeader(snapshot) {
    document.getElementById("inv-cust-name").innerText = snapshot.name;
    document.getElementById("inv-cust-addr").innerText = snapshot.addr;
    document.getElementById("inv-cust-tax").innerText = snapshot.tax;
}

// dropdown "บัญชีที่แสดงบนบิลให้ลูกค้าโอน" (ไม่ใช่ช่องทางรับเงินจริง — อันนั้นเลือกตอนบันทึกรับเงินแต่ละงวด)
function populateInvoiceBankSelect(selectedBankId) {
    const selectBank = document.getElementById("invoice-bank-select");
    selectBank.innerHTML = BANK_SELECT_HEAD + banks.map(b => bankOptionHtml(b)).join('') +
        cashOptionHtml('cash', 'ไม่แสดงบัญชี (รับเงินสด)');
    selectBank.value = selectedBankId && banks.some(b => b.id === selectedBankId) ? selectedBankId : (banks[0] ? banks[0].id : 'cash');
}

// ราคามาตรฐาน (ค่าธรรมเนียมรัฐ + ค่าบริการ) ของประเภทงาน — ตั้งได้ที่แท็บ "ราคามาตรฐาน" ในหน้าการเงิน
function getServicePrice(jobTypeName) {
    return servicePrices.find(p => p.jobType === jobTypeName) || null;
}

// สร้างรายการในบิลจากใบงาน 1 ใบ — ถ้าใบงานยังไม่มีราคา (fee = 0) ใช้ราคามาตรฐานแทน
// govFee ของแต่ละรายการ: ใช้ jobs.govFee ที่เคยบันทึกไว้ (เฉลี่ยตามสัดส่วนราคา) หรือค่าธรรมเนียมรัฐจากราคามาตรฐาน
function buildInvoiceItemsFromJob(j, workDetails) {
    const parsed = parseJobTypeItems(j.jobType, j.fee);
    const useStandard = !(j.fee > 0);
    // ใบงานเก็บค่าธรรมเนียมรัฐเป็นยอดรวมทั้งใบ (jobs.govFee) — กระจายกลับเป็นรายการตามสัดส่วนค่าธรรมเนียมรัฐในราคามาตรฐาน
    // (ไม่ใช่ตามราคา ไม่งั้นรายการที่ไม่มีค่าธรรมเนียมรัฐ เช่น ค่าบริการล้วน จะได้ส่วนแบ่งไปผิด ๆ);
    // ถ้าไม่มีราคามาตรฐานเลยค่อยเฉลี่ยตามราคา
    const stdGovWeights = parsed.map(item => { const std = getServicePrice(item.name); return std ? std.govFee : 0; });
    const weightSum = stdGovWeights.reduce((s, w) => s + w, 0);
    const priceSum = parsed.reduce((s, x) => s + x.price, 0);
    return parsed.map((item, idx) => {
        const std = getServicePrice(item.name);
        const price = useStandard && std ? std.govFee + std.serviceFee : item.price;
        let govFee = 0;
        if (j.govFee > 0 && weightSum > 0) govFee = round2(j.govFee * stdGovWeights[idx] / weightSum);
        else if (j.govFee > 0 && priceSum > 0) govFee = round2(j.govFee * item.price / priceSum);
        else if (std) govFee = std.govFee;
        govFee = Math.min(govFee, price);
        return {
            id: `${j.id}-${idx}`,
            title: `ค่าบริการ: ${item.name}`,
            desc: workDetails,
            qty: 1,
            unitPrice: price,
            fee: price,
            govFee,
            serviceName: item.name,
            jobBreakdown: [{ jobId: j.id, price }]
        };
    });
}

function openInvoiceModal(jobId) {
    if (banks.length === 0) {
        uiAlert("กรุณาเพิ่มข้อมูลบัญชีธนาคารอย่างน้อย 1 บัญชีก่อนออกบิลและเก็บเงิน");
        switchView('expenses');
        switchFinancePageTab('banks');
        return;
    }

    // ใบงานที่ออกบิลไปแล้ว → เปิดบิลใบนั้น (ไม่สร้างร่างซ้ำ)
    if (jobId) {
        const j = jobs.find(item => item.id === jobId);
        if (!j) return;
        const existing = getJobInvoice(j);
        if (existing) { openStoredInvoice(existing.id); return; }
    }

    setPrintPageSize(INVOICE_PAGE_CSS); // A4 เสมอ (เผื่อยังค้าง @page A5 จากใบปะหน้าจัดส่งเอกสารรอบก่อน)
    currentInvoiceId = null;
    document.getElementById("inv-due-date").innerText = defaultDueDateText(new Date());
    document.getElementById("inv-notes").innerText = "-";
    const freePickerWrap = document.getElementById("invoice-free-picker-wrap");

    if (jobId) {
        // --- ร่างบิลจากใบงาน 1 ใบ ---
        const j = jobs.find(item => item.id === jobId);
        const cust = customers.find(c => c.id === j.customerId);
        const work = workers.find(w => w.id === j.workerId);
        currentInvoiceKind = 'job';
        updateInvoiceBillingNote(cust);
        fillInvoiceCustomerHeader(customerInvoiceSnapshot(cust));

        const workDetails = work
            ? `คนงานต่างด้าว: ${invoiceWorkerLine(work)}`
            : "คนงานต่างด้าว: ไม่พบข้อมูล/ยกเลิกสัญญาแล้ว";
        currentInvoiceItems = buildInvoiceItemsFromJob(j, workDetails);
        currentInvoiceJobIds = [j.id];
        if (freePickerWrap) freePickerWrap.classList.add("hidden");
    } else {
        // --- ร่างบิลอิสระ (ไม่ผูกใบงาน) ---
        currentInvoiceKind = 'free';
        if (freePickerWrap) freePickerWrap.classList.remove("hidden");
        presetSearchSelect('free-invoice-customer', null);
        presetSearchSelect('free-invoice-worker', null);
        // ชื่อ/ที่อยู่ว่างไว้ — คำแนะนำ "คลิกเพื่อพิมพ์" มาจาก data-placeholder (แสดงเฉพาะบนจอ ไม่พิมพ์ ไม่บันทึก)
        fillInvoiceCustomerHeader({ name: "", addr: "", tax: "เลขประจำตัวผู้เสียภาษี: -" });
        currentInvoiceItems = [{
            id: 'free-' + Date.now().toString(36),
            title: "ค่าธรรมเนียมประสานงานใบแจ้งจัดหางานและยื่นหนังสือเดินทาง",
            desc: "",
            qty: 1, unitPrice: 0, fee: 0, govFee: 0,
            placeholder: true // รายการตัวอย่าง — ถูกแทนที่อัตโนมัติเมื่อเลือกประเภทงานรายการแรกจาก dropdown
        }];
        populateFreeInvoiceJobTypeSelect();
        currentInvoiceJobIds = [];
        updateInvoiceBillingNote(null); // ชื่อที่เติมมาเป็นแค่ค่าเริ่มต้น ยังไม่ผูกนายจ้างจริง
    }

    document.getElementById("inv-no").innerText = "ร่าง — ยังไม่ออกเลขที่";
    setInvoiceDate(new Date());
    populateInvoiceBankSelect(null);
    loadInvoiceLayoutForCurrent(); // วาดตารางรายการตามรูปแบบที่นายจ้างนี้ใช้ล่าสุด
    renderInvoiceStatusUi();
    document.getElementById("invoice-modal").classList.remove("hidden");
}

// เปิดบิลที่ออกแล้ว (จากตารางออกบิล/รับเงิน หรือจากใบงานที่ผูกบิลไว้)
function openStoredInvoice(invoiceId) {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) { showToast("❌ ไม่พบบิลนี้ในระบบ", "danger"); return; }
    setPrintPageSize(INVOICE_PAGE_CSS);

    if (currentInvoiceId !== inv.id) paymentSlipState.pay = []; // สลิปที่แนบค้างไว้เป็นของบิลเดิม
    currentInvoiceId = inv.id;
    currentInvoiceKind = inv.kind || 'job';
    currentInvoiceJobIds = [...(inv.jobIds || [])];
    currentInvoiceItems = JSON.parse(JSON.stringify(inv.items || []));
    currentInvoiceItems.forEach(item => { delete item.placeholder; });
    freeInvoiceCustomerId = inv.customerId || null;
    freeInvoiceWorkerId = inv.workerId || null;

    const freePickerWrap = document.getElementById("invoice-free-picker-wrap");
    const editableFree = inv.kind === 'free' && inv.status === 'issued' && invoicePaidAmount(inv) === 0;
    if (freePickerWrap) freePickerWrap.classList.toggle("hidden", !editableFree);
    if (editableFree) {
        presetSearchSelect('free-invoice-customer', inv.customerId || null);
        presetSearchSelect('free-invoice-worker', inv.workerId || null);
        populateFreeInvoiceJobTypeSelect();
    }

    fillInvoiceCustomerHeader({ name: inv.customerName || '-', addr: inv.customerAddr || '-', tax: inv.customerTax || '-' });
    updateInvoiceBillingNote(inv.customerId ? customers.find(c => c.id === inv.customerId) : null);
    document.getElementById("inv-no").innerText = inv.invoiceNo;
    setInvoiceDate(safeParseDate(inv.issueDate) || new Date());
    document.getElementById("inv-due-date").innerText = inv.dueDateText || defaultDueDateText(safeParseDate(inv.issueDate) || new Date());
    document.getElementById("inv-notes").innerText = inv.notes || "-";

    populateInvoiceBankSelect(inv.bankId);
    loadInvoiceLayoutForCurrent();
    renderInvoiceStatusUi();
    document.getElementById("invoice-modal").classList.remove("hidden");
}

// เดิมใช้เปิดบิลอิสระที่ "วางบิล" ไว้ — บิลอิสระย้ายเข้า invoices แล้ว (id เดิม) จึงเปิดผ่าน openStoredInvoice
function openFreeInvoiceModal(invoiceId) {
    openStoredInvoice(invoiceId);
}

// ปุ่ม "ออกบิล (รับเลขที่)" — บันทึกร่างที่เปิดอยู่เป็นบิลจริง: ขอเลขที่ INV-ปปปป-NNNN จากฐานข้อมูล
// แล้วผูกใบงานทุกใบในบิลเข้ากับบิลนี้ (paymentStatus = 'ออกบิลแล้ว') พร้อมบันทึกราคาที่แก้ในบิลกลับเข้าใบงาน
async function issueCurrentInvoice() {
    if (currentInvoiceId) return;
    if (!can('finance')) {
        showToast("❌ เฉพาะ Admin / Account Manager เท่านั้นที่ออกบิลได้", "danger");
        return;
    }
    currentInvoiceItems.forEach(item => syncInvoiceItemTextFields(item));
    const realItems = currentInvoiceItems.filter(item => !item.placeholder);
    const total = realItems.reduce((s, item) => s + (item.fee || 0), 0);
    if (realItems.length === 0 || total <= 0) {
        uiAlert("บิลต้องมีอย่างน้อย 1 รายการ และยอดรวมมากกว่า 0 บาท");
        return;
    }
    const alreadyBilled = currentInvoiceJobIds.map(id => jobs.find(j => j.id === id)).filter(j => j && getJobInvoice(j));
    if (alreadyBilled.length > 0) {
        uiAlert(`มีใบงานที่ออกบิลไปแล้ว ${alreadyBilled.length} ใบในรายการนี้ กรุณาปิดหน้าต่างแล้วเปิดใหม่`);
        return;
    }
    if (!(await confirmBeforeSave(null, "ตรวจสอบก่อนออกบิล", [
        ...realItems.map((item, i) => ({ label: `${i + 1}. ${item.title || "รายการ"}`, value: `${fmtMoney(item.fee || 0)} บาท` })),
        { label: "ยอดรวมทั้งบิล", value: `${fmtMoney(total)} บาท` }
    ]))) return;

    const btn = document.getElementById("btn-issue-invoice");
    if (btn) btn.disabled = true;
    try {
        const noRes = await callCloudAPI("nextDocNo", { prefix: "INV" });
        if (!noRes || !noRes.docNo) return;

        const selectBank = document.getElementById("invoice-bank-select");
        const bankId = selectBank && selectBank.value !== 'cash' ? selectBank.value : null;
        const worker = freeInvoiceWorkerId ? workers.find(w => w.id === freeInvoiceWorkerId) : null;
        const firstJob = currentInvoiceJobIds.length ? jobs.find(j => j.id === currentInvoiceJobIds[0]) : null;
        const inv = {
            id: 'inv-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            invoiceNo: noRes.docNo,
            kind: currentInvoiceKind,
            customerId: firstJob ? firstJob.customerId : (freeInvoiceCustomerId || null),
            customerName: readInvoiceText("inv-cust-name"),
            customerAddr: readInvoiceText("inv-cust-addr"),
            customerTax: readInvoiceText("inv-cust-tax"),
            workerId: currentInvoiceKind === 'free' ? (freeInvoiceWorkerId || null) : null,
            workerName: currentInvoiceKind === 'free' && worker ? `${worker.firstName} ${worker.lastName}`.trim() : null,
            jobIds: [...currentInvoiceJobIds],
            items: realItems,
            subtotal: round2(total),
            grandTotal: round2(total),
            govFeeTotal: round2(realItems.reduce((s, item) => s + (item.govFee || 0), 0)),
            issueDate: localDateISO(new Date()),
            // กำหนดชำระแบบมาตรฐาน → คำนวณใหม่จากวันออกบิลจริง (เผื่อเปิดร่างไว้ข้ามวัน); ถ้าแก้ข้อความเองใช้ตามที่แก้
            dueDateText: readInvoiceText("inv-due-date").endsWith(DUE_DATE_SUFFIX) ? defaultDueDateText(new Date()) : readInvoiceText("inv-due-date"),
            notes: readInvoiceText("inv-notes"),
            bankId,
            status: 'issued',
            createdBy: currentUser.id || null
        };
        const res = await callCloudAPI("saveInvoice", { invoiceData: inv });
        if (!res || res.status === "error") return;
        invoices.push(inv);

        // ผูกใบงาน + บันทึกราคา/ค่าธรรมเนียมรัฐที่แก้ในบิลกลับเข้าใบงาน
        const jobUpdates = computeEditedJobUpdates();
        let failCount = 0;
        for (const jobId of currentInvoiceJobIds) {
            const j = jobs.find(x => x.id === jobId);
            if (!j) continue;
            const prev = { ...j };
            if (jobUpdates[jobId]) {
                j.fee = round2(jobUpdates[jobId].feeTotal);
                j.jobType = jobUpdates[jobId].typeSegments.map(s => `${s.serviceName} (${Math.round(s.price)})`).join(', ');
                j.govFee = round2(jobUpdates[jobId].govTotal);
            }
            j.invoiceId = inv.id;
            j.paymentStatus = 'ออกบิลแล้ว';
            if (j.noChargeAt) { j.noChargeReason = null; j.noChargeBy = null; j.noChargeAt = null; }
            j.updatedAt = localDateISO(new Date());
            const r = await callCloudAPI("saveJob", { jobData: j });
            if (!r || r.status === "error") { Object.assign(j, prev); failCount++; }
        }

        saveData();
        renderJobs();
        renderBillingTab();
        renderDashboard();
        if (failCount > 0) showToast(`⚠️ ออกบิล ${inv.invoiceNo} แล้ว แต่ผูกใบงานไม่สำเร็จ ${failCount} ใบ`, "danger");
        else showToast(`🧾 ออกบิลเลขที่ ${inv.invoiceNo} เรียบร้อยแล้ว`, "success");
        openStoredInvoice(inv.id);

        // นายจ้างมีมัดจำค้างอยู่ → ถามหักเข้าบิลใหม่ทันที
        const credit = customerCredit(inv.customerId);
        if (credit > 0) {
            const take = Math.min(credit, invoiceBalance(inv));
            if (await uiConfirm(`"${inv.customerName || '-'}" มีมัดจำคงเหลือ ${fmtMoney(credit)} บาท\nต้องการหักเข้าบิล ${inv.invoiceNo} จำนวน ${fmtMoney(take)} บาท เลยไหม?`, {
                title: 'หักมัดจำเข้าบิลนี้?', okText: 'หักมัดจำ', cancelText: 'ไว้ทีหลัง', danger: false })) {
                const { applied } = await applyCustomerCredit(inv, take);
                renderBillingTab();
                renderJobs();
                renderDashboard();
                if (currentInvoiceId === inv.id) { renderInvoiceItemsTable(); renderInvoiceStatusUi(); }
                showToast(applied > 0 ? `✅ หักมัดจำ ${fmtMoney(applied)} บาท เข้าบิล ${inv.invoiceNo} แล้ว` : "❌ หักมัดจำไม่สำเร็จ", applied > 0 ? "success" : "danger");
            }
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ==================== FREE INVOICE EMPLOYER/WORKER PICKER (ใช้ registerSearchSelect มาตรฐานของโปรเจกต์) ====================
// ลงทะเบียนครั้งเดียวตอน initApp() (ดู setupAllSearchSelects) — เปิดโมดัลแต่ละครั้งแค่ presetSearchSelect(key, null) รีเซ็ต
function registerFreeInvoiceSearchSelects() {
    registerSearchSelect('free-invoice-customer', {
        inputId: 'invoice-free-cust-search',
        getValue: () => freeInvoiceCustomerId,
        setValue: (v) => { freeInvoiceCustomerId = v || null; },
        getPool: () => customers,
        getId: c => c.id,
        getLabel: c => c.companyName,
        getSub: c => c.taxId ? 'ภาษี ' + c.taxId : '',
        emptyText: 'ไม่พบนายจ้างที่ตรงกับคำค้นหา',
        onSelect: (cust) => onSelectFreeInvoiceCustomer(cust)
    });

    registerSearchSelect('free-invoice-worker', {
        inputId: 'invoice-free-worker-search',
        getValue: () => freeInvoiceWorkerId,
        setValue: (v) => { freeInvoiceWorkerId = v || null; },
        getPool: () => freeInvoiceCustomerId ? workers.filter(w => w.employerId === freeInvoiceCustomerId) : workers,
        getId: w => w.id,
        getLabel: w => `${w.firstName} ${w.lastName}`.trim(),
        getSub: w => w.workerUid ? 'เลขประจำตัว ' + w.workerUid : '',
        getBadge: w => w.nationality || '',
        emptyText: freeInvoiceCustomerId ? 'ไม่พบลูกจ้างของนายจ้างรายนี้ที่ตรงกับคำค้นหา' : 'ไม่พบลูกจ้างที่ตรงกับคำค้นหา',
        onSelect: (w) => onSelectFreeInvoiceWorker(w)
    });
}

// เลือกนายจ้างจากระบบ -> เติมชื่อ/ที่อยู่/เลขภาษีลงในใบวางบิลอัตโนมัติ (ยังแก้ไขข้อความเองได้ต่อหลังจากนี้)
function onSelectFreeInvoiceCustomer(cust) {
    const snap = customerDocSnapshot(cust);
    document.getElementById("inv-cust-name").innerText = snap.name;
    document.getElementById("inv-cust-addr").innerText = snap.addr;
    document.getElementById("inv-cust-tax").innerText = `เลขผู้เสียภาษี: ${cust.taxId}`;
    updateInvoiceBillingNote(cust);

    // ถ้าลูกจ้างที่เลือกไว้เดิมไม่ใช่ของนายจ้างรายนี้ ให้ล้างทิ้ง
    if (freeInvoiceWorkerId) {
        const w = workers.find(x => x.id === freeInvoiceWorkerId);
        if (!w || w.employerId !== cust.id) clearSearchSelect('free-invoice-worker');
    }
}

function getFreeInvoiceWorkerDesc(w) {
    return `คนงานต่างด้าว: ${invoiceWorkerLine(w)}`;
}

// เติมตัวเลือก dropdown "ประเภทงานที่แจ้ง" ของบิลอิสระ — ดึงจากเช็กบ็อกซ์ในฟอร์มแจ้งสั่งงาน ให้รายชื่อประเภทงานมีที่เดียว
function populateFreeInvoiceJobTypeSelect() {
    const select = document.getElementById("invoice-free-jobtype-select");
    if (!select) return;
    const types = Array.from(document.querySelectorAll("input[name='job-type-checkbox']")).map(cb => cb.value);
    select.innerHTML = '<option value="">-- เลือกประเภทงานเพื่อเพิ่มเป็นรายการในบิล --</option>' +
        types.map(t => `<option value="${t}">${t}</option>`).join('');
    select.value = '';
}

// เลือกประเภทงานจาก dropdown -> เพิ่มเป็นรายการใหม่ในบิลทันที แล้วรีเซ็ต dropdown ให้เลือกประเภทถัดไปได้เลย
function addFreeInvoiceJobTypeItem(select) {
    const jobType = select.value;
    select.value = '';
    if (!jobType) return;

    currentInvoiceItems.forEach(item => syncInvoiceItemTextFields(item)); // เก็บข้อความที่แก้ไว้ก่อน render ใหม่
    // รายการตัวอย่างตอนเปิดบิลใหม่ที่ยังไม่ได้แก้ไข ให้ถูกแทนที่ ไม่ต้องลบเอง
    currentInvoiceItems = currentInvoiceItems.filter(item => !item.placeholder);

    const worker = freeInvoiceWorkerId ? workers.find(w => w.id === freeInvoiceWorkerId) : null;
    const std = getServicePrice(jobType); // ราคามาตรฐาน (ถ้าตั้งไว้) — ยังแก้ราคาในบิลได้
    const price = std ? std.govFee + std.serviceFee : 0;
    currentInvoiceItems.push({
        id: 'free-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        title: `ค่าบริการ: ${jobType}`,
        desc: worker ? getFreeInvoiceWorkerDesc(worker) : "",
        qty: 1,
        unitPrice: price,
        fee: price,
        govFee: std ? std.govFee : 0,
        serviceName: jobType
    });
    renderInvoiceItemsTable();
}

// ลบรายการออกจากบิลอิสระ (ปุ่มนี้แสดงเฉพาะโหมดบิลอิสระ)
function removeFreeInvoiceItem(itemId) {
    currentInvoiceItems.forEach(item => syncInvoiceItemTextFields(item));
    currentInvoiceItems = currentInvoiceItems.filter(item => item.id !== itemId);
    renderInvoiceItemsTable();
}

// เลือกลูกจ้างจากระบบ -> เติมรายละเอียดคนงานลงในทุกรายการของบิล และเติมนายจ้างของคนงานคนนี้ให้อัตโนมัติถ้ายังไม่ตรงกัน
function onSelectFreeInvoiceWorker(w) {
    // บิลอิสระออกให้คนงาน 1 คน จึงเติมรายละเอียดคนงานลงทุกรายการ — ยังแก้ไขข้อความเองได้ต่อหลังจากนี้
    if (currentInvoiceItems.length > 0) {
        // รายการที่เลือกคนงานไว้เองแล้ว (หลายคน) ไม่ต้องทับ
        currentInvoiceItems.forEach(item => { if (!(item.workerIds && item.workerIds.length)) item.desc = getFreeInvoiceWorkerDesc(w); });
        renderInvoiceItemsTable();
    }

    // ถ้ายังไม่ได้เลือกนายจ้าง หรือเลือกไว้คนละรายกับนายจ้างของคนงานคนนี้ ให้เติมนายจ้างให้อัตโนมัติ
    if (w.employerId && w.employerId !== freeInvoiceCustomerId) {
        selectSearchSelectItem('free-invoice-customer', w.employerId);
    }
}

// ตั้งค่า search-select ให้ครบทุกช่องแบบ "ค้นหาเพื่อเลือกข้อมูล 1 รายการ" ในระบบ — เรียกครั้งเดียวตอน initApp()
// (ดูกฎเต็มใน CLAUDE.md หัวข้อ "Search-to-select fields")
function setupAllSearchSelects() {
    registerFreeInvoiceSearchSelects();
    registerReceiveMoneySearchSelect(); // นายจ้างในหน้าต่าง "รับเงิน / มัดจำ" — เก็บใน receiveCustomerId

    // นายจ้างของคนงานใหม่ที่ Bulk Import สร้างให้ (เลือก 1 รายต่อรอบ) — เก็บใน bulkImportEmployerId
    registerSearchSelect('bulk-import-employer', {
        inputId: 'bulk-import-employer-search',
        getValue: () => bulkImportEmployerId,
        setValue: (v) => { bulkImportEmployerId = v || null; },
        getPool: () => customers,
        getId: c => c.id,
        getLabel: c => c.companyName,
        getSub: c => c.taxId ? 'ภาษี ' + c.taxId : '',
        emptyText: 'ไม่พบนายจ้างที่ตรงกับคำค้นหา'
    });

    // นายจ้างในฟอร์ม "แจ้งสั่งงาน" — <select id="job-customer-id"> ซ่อนไว้เป็นแหล่งเก็บค่าจริงเหมือนเดิม
    registerSearchSelect('job-customer', {
        inputId: 'job-customer-search',
        getValue: () => document.getElementById('job-customer-id').value,
        setValue: (v) => { document.getElementById('job-customer-id').value = v || ''; },
        getPool: () => customers,
        getId: c => c.id,
        getLabel: c => c.companyName,
        getSub: c => c.taxId ? 'ภาษี ' + c.taxId : '',
        emptyText: 'ไม่พบนายจ้างที่ตรงกับคำค้นหา',
        onSelect: () => onJobCustomerChange() // ล็อก Agent + กรองรายชื่อลูกจ้างตามนายจ้างที่เลือก เหมือน onchange เดิม
    });

    // แดชบอร์ด > "สรุปงานที่แจ้งสำเร็จ": กรองตามนายจ้าง / Agent — <select> ซ่อนไว้เก็บค่าจริง, ช่องว่าง = ทั้งหมด
    registerSearchSelect('db-completed-employer', {
        inputId: 'db-completed-employer-search',
        getValue: () => document.getElementById('db-completed-select-employer').value,
        setValue: (v) => { document.getElementById('db-completed-select-employer').value = v || ''; },
        getPool: () => customers,
        getId: c => c.id,
        getLabel: c => c.companyName,
        getSub: c => c.taxId ? 'ภาษี ' + c.taxId : '',
        emptyText: 'ไม่พบนายจ้างที่ตรงกับคำค้นหา',
        onSelect: () => renderCompletedJobsStats(),
        onClear: () => renderCompletedJobsStats()
    });
    registerSearchSelect('db-completed-agent', {
        inputId: 'db-completed-agent-search',
        getValue: () => document.getElementById('db-completed-select-agent').value,
        setValue: (v) => { document.getElementById('db-completed-select-agent').value = v || ''; },
        getPool: () => agents,
        getId: a => a.id,
        getLabel: a => a.name,
        getSub: a => a.phone || '',
        emptyText: 'ไม่พบ Agent ที่ตรงกับคำค้นหา',
        onSelect: () => renderCompletedJobsStats(),
        onClear: () => renderCompletedJobsStats()
    });

    // ใบงานต้นทางในหน้าต่าง "เพิ่มงานเข้าชุดเดิม" — ค่าจริงอยู่ในตัวแปร addBatchSourceId
    registerSearchSelect('add-batch-job', {
        inputId: 'add-batch-job-search',
        getValue: () => addBatchSourceId || '',
        setValue: (v) => { addBatchSourceId = v || null; renderAddBatchDetail(); },
        getPool: () => addBatchPool(),
        getId: j => j.id,
        getLabel: j => addBatchJobLabel(j),
        getSub: j => addBatchJobSub(j),
        emptyText: 'ไม่พบใบงานที่ตรงกับคำค้นหา',
        onSelect: () => renderAddBatchDetail(),
        onClear: () => renderAddBatchDetail()
    });

    // นายจ้างในหน้าต่าง "รวมใบสั่งงานออกบิลชุด" — <select id="combine-cust-select"> ซ่อนไว้เป็นแหล่งเก็บค่าจริง
    registerSearchSelect('combine-cust', {
        inputId: 'combine-cust-search',
        getValue: () => document.getElementById('combine-cust-select').value,
        setValue: (v) => { document.getElementById('combine-cust-select').value = v || ''; },
        getPool: () => customersAwaitingBill(),
        getId: c => c.id,
        getLabel: c => c.companyName,
        getSub: c => [`รอออกบิล ${jobs.filter(j => j.customerId === c.id && jobAwaitingBill(j)).length} ใบ`, c.taxId ? 'ภาษี ' + c.taxId : ''].filter(Boolean).join(' • '),
        emptyText: 'ไม่พบนายจ้างที่มีใบงานรอออกบิลตรงกับคำค้นหา',
        onSelect: () => onCombineCustomerChange()
    });

    // นายจ้างในฟอร์ม "เพิ่ม/แก้ไขคนงานต่างด้าว" — <select id="worker-employer-id"> ซ่อนไว้เป็นแหล่งเก็บค่าจริงเหมือนเดิม
    registerSearchSelect('worker-employer', {
        inputId: 'worker-employer-search',
        getValue: () => document.getElementById('worker-employer-id').value,
        setValue: (v) => { document.getElementById('worker-employer-id').value = v || ''; },
        getPool: () => customers,
        getId: c => c.id,
        getLabel: c => c.companyName,
        getSub: c => c.taxId ? 'ภาษี ' + c.taxId : '',
        emptyText: 'ไม่พบนายจ้างที่ตรงกับคำค้นหา',
        onSelect: (cust) => fillWorkerWorkplaceFromEmployer(cust.id) // เติม "สถานที่ทำงาน" อัตโนมัติ เหมือน onchange เดิม
    });
}

// แสดง note วางบิลของนายจ้างรายนี้ (ถ้ามี) ให้เจ้าหน้าที่เห็นก่อนออกบิล — เป็น no-print จึงไม่ถูกพิมพ์ลงในใบแจ้งหนี้ที่ให้ลูกค้า
function updateInvoiceBillingNote(cust) {
    const noteWrap = document.getElementById("invoice-billing-note-wrap");
    const noteText = document.getElementById("invoice-billing-note-text");
    if (!noteWrap || !noteText) return;
    if (cust && cust.billingNote) {
        noteText.innerText = cust.billingNote;
        noteWrap.classList.remove("hidden");
    } else {
        noteWrap.classList.add("hidden");
    }
}

function closeInvoiceModal() {
    document.getElementById("invoice-modal").classList.add("hidden");
    currentInvoiceItems = [];
    currentInvoiceJobIds = [];
    currentInvoiceId = null;
}

// แก้ไขรายการ/ราคาในบิลได้เฉพาะ ร่าง หรือบิลที่ออกแล้วแต่ยังไม่ได้รับเงินเลย (ป้องกันยอดบิลไม่ตรงกับเงินที่รับไปแล้ว)
function isCurrentInvoiceEditable() {
    if (!can('finance')) return false; // นายจ้าง (Client) / ฝ่ายงาน เปิดดูบิลได้อย่างเดียว
    if (!currentInvoiceId) return true;
    const inv = invoices.find(i => i.id === currentInvoiceId);
    return !!inv && inv.status === 'issued' && invoicePaidAmount(inv) === 0;
}

// ---------- รูปแบบใบวางบิล: "แบบรวม" (ตามประเภทงาน — รายการจริงที่บันทึก) / "แบบรายคน" (1 แถวต่อคนงาน) ----------
// แบบรายคนเป็นแค่มุมมองตอนแสดง/พิมพ์ — ข้อมูลในบิล (items) ไม่เปลี่ยน ยอดรวมเท่าเดิม; แก้ราคาได้เฉพาะแบบรวม
// จำแบบที่เลือกล่าสุดแยกตามนายจ้างไว้ในเครื่อง (ลูกค้าที่ต้องการบิลรายคนจะเปิดมาเป็นแบบรายคนเลย)
let invoiceLayout = 'service';

function invoiceLayoutStorageKey() {
    const custId = currentInvoiceJobIds.length
        ? ((jobs.find(j => j.id === currentInvoiceJobIds[0]) || {}).customerId || '')
        : (freeInvoiceCustomerId || '');
    return custId ? `mw_inv_layout_${custId}` : null;
}

function loadInvoiceLayoutForCurrent() {
    const key = invoiceLayoutStorageKey();
    let saved = null;
    try { saved = key ? localStorage.getItem(key) : null; } catch (e) { saved = null; }
    setInvoiceLayout(saved === 'worker' ? 'worker' : 'service', false);
}

function setInvoiceLayout(layout, remember = true) {
    invoiceLayout = layout === 'worker' ? 'worker' : 'service';
    if (remember) {
        const key = invoiceLayoutStorageKey();
        try { if (key) localStorage.setItem(key, invoiceLayout); } catch (e) { /* จำไม่ได้ก็ไม่เป็นไร */ }
    }
    [['service', 'btn-inv-layout-service'], ['worker', 'btn-inv-layout-worker']].forEach(([key, id]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const on = key === invoiceLayout;
        btn.className = on ? "btn btn-gold btn-sm" : "btn btn-outline btn-sm";
        btn.style.borderColor = on ? "" : "transparent";
        btn.style.color = on ? "" : "var(--text-dark)";
        btn.style.background = on ? "" : "transparent";
    });
    const hint = document.getElementById('inv-layout-hint');
    if (hint) hint.classList.toggle('hidden', invoiceLayout !== 'worker');
    renderInvoiceItemsTable();
}

// แตกรายการในบิลเป็นรายคนงาน: ใบงาน → jobBreakdown (สัดส่วนเดียวกับ computeEditedJobUpdates), บิลอิสระ → workerIds (หารเท่ากัน)
// รายการที่ไม่ผูกคนงานเลยคงเป็นแถวเดิม
function buildInvoicePerWorkerRows(items) {
    const rows = new Map();
    const add = (key, title, desc, service, amount) => {
        if (!rows.has(key)) rows.set(key, { id: key, title, desc, services: [], fee: 0 });
        const r = rows.get(key);
        if (service && !r.services.includes(service)) r.services.push(service);
        r.fee += amount;
    };
    const findWorker = id => allWorkers().find(w => w.id === id);
    items.filter(item => !item.placeholder || item.fee > 0).forEach(item => {
        const service = item.serviceName || String(item.title || '').replace(/^ค่าบริการ:\s*/, '');
        const breakdown = item.jobBreakdown || [];
        if (breakdown.length) {
            const oldTotal = breakdown.reduce((s, b) => s + (b.price || 0), 0);
            breakdown.forEach(b => {
                const share = (oldTotal > 0 ? (b.price || 0) / oldTotal : 1 / breakdown.length) * (item.fee || 0);
                const job = jobs.find(j => j.id === b.jobId);
                const w = job ? findWorker(job.workerId) : null;
                add(w ? `w-${w.id}` : `j-${b.jobId}`, w ? workerFullName(w) : 'ไม่พบข้อมูลคนงาน',
                    w ? `เลขประจำตัว ${w.workerUid || '-'}` : '', service, share);
            });
        } else if ((item.workerIds || []).length) {
            const ids = item.workerIds;
            ids.forEach(id => {
                const w = findWorker(id);
                add(`w-${id}`, w ? workerFullName(w) : 'ไม่พบข้อมูลคนงาน', w ? `เลขประจำตัว ${w.workerUid || '-'}` : '', service, (item.fee || 0) / ids.length);
            });
        } else {
            add(`i-${item.id}`, item.title || '', item.desc || '', null, item.fee || 0);
        }
    });
    return [...rows.values()].map(r => ({ ...r, fee: round2(r.fee) }));
}

function renderInvoiceItemsTable() {
    const tbody = document.getElementById("invoice-items-tbody");
    if (!tbody) return;

    if (invoiceLayout === 'worker' && currentInvoiceItems.length > 0) {
        const fmtW = v => Number(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        tbody.innerHTML = buildInvoicePerWorkerRows(currentInvoiceItems).map((r, index) => `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td class="inv-item-desc-cell">
                    <div class="inv-item-title">${escapeHtml(r.title)}</div>
                    <div class="inv-item-desc">${escapeHtml([r.desc, r.services.length ? `ค่าบริการ: ${r.services.join(', ')}` : ''].filter(Boolean).join('\n'))}</div>
                </td>
                <td style="text-align: center;">1</td>
                <td class="inv-num">${fmtW(r.fee)}</td>
                <td class="inv-num inv-amount">${fmtW(r.fee)}</td>
                <td class="no-print inv-gov-col"></td>
            </tr>`).join('');
        calculateInvoiceTotals();
        return;
    }

    if (currentInvoiceItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">
                    ${icon("bad")} ไม่มีรายการใบแจ้งหนี้
                </td>
                <td class="no-print inv-gov-col"></td>
            </tr>
        `;
        calculateInvoiceTotals();
        return;
    }

    const editable = isCurrentInvoiceEditable();
    const isFreeMode = currentInvoiceJobIds.length === 0;
    const ce = editable ? 'contenteditable="true"' : '';
    const fmt = v => Number(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    tbody.innerHTML = currentInvoiceItems.map((item, index) => {
        const qty = item.qty || 1;
        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : item.fee;
        return `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td class="inv-item-desc-cell">
                    ${isFreeMode && editable ? `<button type="button" class="inv-item-remove-btn no-print" onclick="removeFreeInvoiceItem('${item.id}')" title="ลบรายการนี้">&times;</button>` : ''}
                    <div class="inv-item-title ${editable ? 'inv-editable' : ''}" id="inv-item-title-${item.id}" ${ce}
                         oninput="onInvoiceItemTextInput('${item.id}')" title="คลิกเพื่อแก้ไขคำอธิบาย">${escapeHtml(item.title)}</div>
                    <div class="inv-item-desc ${editable ? 'inv-editable' : ''}" id="inv-item-desc-${item.id}" ${ce}
                         ${editable ? 'data-placeholder="รายละเอียด เช่น ชื่อคนงาน สัญชาติ เลขเอกสาร (คลิกเพื่อพิมพ์)"' : ''}
                         oninput="onInvoiceItemTextInput('${item.id}')" title="คลิกเพื่อแก้ไขคำอธิบายย่อย">${escapeHtml(item.desc || '')}</div>
                    ${isFreeMode && editable ? `<button type="button" class="inv-item-workers-btn no-print" onclick="openItemWorkersPicker('${item.id}')">
                        ${icon('users')} ${(item.workerIds || []).length ? `คนงาน ${item.workerIds.length} คน — แก้รายชื่อ` : 'เลือกคนงาน (หลายคนได้)'}</button>` : ''}
                </td>
                <td style="text-align: center;">${qty}</td>
                <td class="inv-num ${editable ? 'inv-price-cell' : ''}" id="inv-item-unitprice-${item.id}" ${ce}
                    oninput="onInvoiceItemUnitPriceInput('${item.id}')" title="คลิกเพื่อแก้ไขราคาต่อหน่วย">${fmt(unitPrice)}</td>
                <td class="inv-num inv-amount ${editable ? 'inv-price-cell' : ''}" id="inv-item-fee-${item.id}" ${ce}
                    oninput="onInvoiceItemFeeInput('${item.id}')" title="คลิกเพื่อแก้ไขราคารวม">${fmt(item.fee)}</td>
                <td class="no-print inv-gov-col">
                    ${editable
                        ? `<input type="number" min="0" step="0.01" class="inv-gov-input" value="${item.govFee || 0}"
                                  oninput="onInvoiceItemGovFeeInput('${item.id}', this.value)" title="ส่วนที่เป็นค่าธรรมเนียมรัฐในยอดของรายการนี้">`
                        : fmt(item.govFee)}
                </td>
            </tr>
        `;
    }).join('');

    calculateInvoiceTotals();
}

// ตัดคำแนะนำแบบเก่า "(คลิก...แก้ไข...)" ที่อาจค้างอยู่ในข้อความ ไม่ให้หลุดไปอยู่ในบิลที่บันทึก/พิมพ์
function stripEditHint(text) {
    return String(text || '').replace(/\s*\(คลิก[^)]*\)/g, '').trim();
}

// อ่านข้อความบนหัวบิล (ชื่อ/ที่อยู่/เลขภาษี/กำหนดชำระ/หมายเหตุ) สำหรับบันทึก
function readInvoiceText(id) {
    const el = document.getElementById(id);
    return el ? stripEditHint(el.innerText) : '';
}

function syncInvoiceItemTextFields(item) {
    const titleEl = document.getElementById(`inv-item-title-${item.id}`);
    const descEl = document.getElementById(`inv-item-desc-${item.id}`);
    if (titleEl) item.title = stripEditHint(titleEl.innerText);
    if (descEl) item.desc = stripEditHint(descEl.innerText);
}

function onInvoiceItemTextInput(itemId) {
    const item = currentInvoiceItems.find(x => x.id === itemId);
    if (!item) return;
    delete item.placeholder; // แก้ไขเองแล้ว ไม่ใช่รายการตัวอย่างอีกต่อไป
    syncInvoiceItemTextFields(item);
}

// แก้ "ราคารวม" ต่อรายการ -> คำนวณ "ราคาต่อหน่วย" ย้อนกลับ (ราคารวม / จำนวน)
function onInvoiceItemFeeInput(itemId) {
    const item = currentInvoiceItems.find(x => x.id === itemId);
    if (!item) return;
    delete item.placeholder;
    syncInvoiceItemTextFields(item);

    const feeEl = document.getElementById(`inv-item-fee-${itemId}`);
    if (feeEl) {
        const fee = parseFloat(feeEl.innerText.replace(/,/g, '').trim());
        item.fee = isNaN(fee) ? 0 : fee;
        const qty = item.qty || 1;
        item.unitPrice = qty > 0 ? item.fee / qty : 0;
        const unitPriceEl = document.getElementById(`inv-item-unitprice-${itemId}`);
        if (unitPriceEl) unitPriceEl.innerText = item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    calculateInvoiceTotals();
}

// แก้ "ราคาต่อหน่วย" -> คำนวณ "ราคารวม" ใหม่ (ราคาต่อหน่วย x จำนวน)
function onInvoiceItemUnitPriceInput(itemId) {
    const item = currentInvoiceItems.find(x => x.id === itemId);
    if (!item) return;
    delete item.placeholder;
    syncInvoiceItemTextFields(item);

    const unitPriceEl = document.getElementById(`inv-item-unitprice-${itemId}`);
    if (unitPriceEl) {
        const unitPrice = parseFloat(unitPriceEl.innerText.replace(/,/g, '').trim());
        item.unitPrice = isNaN(unitPrice) ? 0 : unitPrice;
        item.fee = item.unitPrice * (item.qty || 1);
        const feeEl = document.getElementById(`inv-item-fee-${itemId}`);
        if (feeEl) feeEl.innerText = item.fee.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    calculateInvoiceTotals();
}

// ค่าธรรมเนียมรัฐ (ภายใน) ของรายการ — ไม่เกินยอดของรายการนั้น
function onInvoiceItemGovFeeInput(itemId, value) {
    const item = currentInvoiceItems.find(x => x.id === itemId);
    if (!item) return;
    const v = parseFloat(value);
    item.govFee = isNaN(v) || v < 0 ? 0 : v;
    calculateInvoiceTotals();
}

function calculateInvoiceTotals() {
    const items = currentInvoiceItems.filter(item => !item.placeholder || item.fee > 0);
    const subtotal = items.reduce((sum, item) => sum + (item.fee || 0), 0);
    const vat = 0; // กิจการไม่ได้จด VAT จริง — ป้าย "ภาษีมูลค่าเพิ่ม" ในใบวางบิลตัดคำว่า "7%" ออกแล้วให้ตรงกับที่นี่
    const grandTotal = subtotal + vat;
    const govTotal = items.reduce((sum, item) => sum + Math.min(item.govFee || 0, item.fee || 0), 0);
    const fmt = v => v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    document.getElementById("inv-subtotal").innerText = fmt(subtotal);
    document.getElementById("inv-vat").innerText = fmt(vat);
    document.getElementById("inv-grand-total").innerText = fmt(grandTotal);
    const govTotalEl = document.getElementById("inv-gov-total");
    if (govTotalEl) govTotalEl.innerText = fmt(govTotal);

    // ชำระแล้ว / คงเหลือ (บิลที่ออกแล้วและรับเงินไปบางส่วน) + จำนวนเงินเป็นตัวอักษร
    const inv = currentInvoiceId ? invoices.find(i => i.id === currentInvoiceId) : null;
    const paid = inv ? invoicePaidAmount(inv) : 0;
    const showPaid = !!inv && paid > 0 && inv.status !== 'void';
    document.getElementById("inv-paid-row").classList.toggle("hidden", !showPaid);
    document.getElementById("inv-balance-row").classList.toggle("hidden", !showPaid);
    if (showPaid) {
        document.getElementById("inv-paid-amount").innerText = fmt(paid);
        document.getElementById("inv-balance-amount").innerText = fmt(Math.max(0, grandTotal - paid));
    }
    document.getElementById("inv-amount-words").innerText = `(${bahtText(grandTotal)})`;

    // สรุปภายใน: ค่าธรรมเนียมรัฐ (เก็บแทน) vs ค่าบริการจริง — ไม่พิมพ์
    const splitEl = document.getElementById("invoice-internal-split");
    if (splitEl) {
        splitEl.innerHTML = `
            <div class="split-item split-gov"><span>ค่าธรรมเนียมรัฐ (เก็บแทน)</span><strong>${fmt(govTotal)}</strong></div>
            <div class="split-item split-service"><span>ค่าบริการ (รายได้จริง)</span><strong>${fmt(Math.max(0, grandTotal - govTotal))}</strong></div>
            <p class="split-note">${icon("lock")} ส่วนนี้เห็นเฉพาะเจ้าหน้าที่ ไม่ถูกพิมพ์ลงบิล — แก้ค่าธรรมเนียมรัฐได้ในคอลัมน์ขวาสุดของตาราง</p>`;
    }

    updateInvoiceBankDetails();
}

function updateInvoiceBankDetails() {
    const selectBank = document.getElementById("invoice-bank-select");
    const activeBankId = selectBank ? selectBank.value : 'cash';
    const section = document.querySelector("#invoice-sheet-container .invoice-payment-section");

    if (activeBankId === 'cash') {
        if (section) section.classList.add("hidden");
        return;
    }
    if (section) section.classList.remove("hidden");
    const b = banks.find(item => item.id === activeBankId);
    if (!b) return;
    document.getElementById("inv-bank-name").innerHTML = `<span style="display:inline-flex; align-items:center; gap:10px;">${renderBankLogoBadge(b.bankName, 26)}${escapeHtml(b.bankName)}</span>`;
    document.getElementById("inv-bank-acc-name").innerText = b.accountName || '-';
    document.getElementById("inv-bank-acc-no").innerText = b.accountNumber || '-';
}

// รวมยอดที่แก้ไขแล้วในใบวางบิล (currentInvoiceItems) กลับเป็นค่า fee + jobType + govFee ใหม่ต่อ "ใบงานจริง" แต่ละใบ
// (รองรับทั้งบิลเดี่ยว และบิลรวมที่ 1 แถวในใบวางบิลอาจครอบคลุมหลายใบงาน โดยเฉลี่ยตามสัดส่วนราคาต้นฉบับ)
// ต้องคืน jobType ใหม่ด้วยเสมอ ไม่ใช่แค่ fee — เพราะราคาต่อประเภทงานถูกฝังอยู่ในสตริง jobType เอง
// (เช่น "ตี VISA (500)") ซึ่งเป็นค่าที่ parseJobTypeItems ใช้สร้างรายการในบิลตอนเปิดใหม่ทุกครั้ง
function computeEditedJobUpdates() {
    const jobUpdates = {}; // jobId -> { feeTotal, govTotal, typeSegments: [{serviceName, price}] }
    currentInvoiceItems.forEach(item => {
        const breakdown = item.jobBreakdown || [];
        if (breakdown.length === 0) return;
        const oldTotal = breakdown.reduce((sum, b) => sum + b.price, 0);
        const serviceName = item.serviceName || item.title;
        breakdown.forEach(b => {
            const ratio = oldTotal > 0 ? (b.price / oldTotal) : 1 / breakdown.length;
            const share = ratio * (item.fee || 0);
            if (!jobUpdates[b.jobId]) jobUpdates[b.jobId] = { feeTotal: 0, govTotal: 0, typeSegments: [] };
            jobUpdates[b.jobId].feeTotal += share;
            jobUpdates[b.jobId].govTotal += ratio * Math.min(item.govFee || 0, item.fee || 0);
            jobUpdates[b.jobId].typeSegments.push({ serviceName, price: share });
        });
    });
    return jobUpdates;
}

// "บันทึกการแก้ไขบิล" — ใช้กับบิลที่ออกแล้วแต่ยังไม่ได้รับเงิน: อัปเดตรายการ/ยอดในบิล + ราคาในใบงานที่ผูกอยู่
async function saveInvoiceFeeEdits() {
    if (!can('finance')) {
        showToast("❌ คุณไม่มีสิทธิ์แก้ไขบิลนี้", "danger");
        return;
    }
    const inv = currentInvoiceId ? invoices.find(i => i.id === currentInvoiceId) : null;
    if (!inv || !isCurrentInvoiceEditable()) {
        showToast("⚠️ บิลนี้รับเงินไปแล้วหรือถูกยกเลิก แก้ไขไม่ได้ — ยกเลิกบิลแล้วออกใหม่แทน", "warning");
        return;
    }
    currentInvoiceItems.forEach(item => syncInvoiceItemTextFields(item));
    const items = currentInvoiceItems.filter(item => !item.placeholder);
    const total = items.reduce((s, item) => s + (item.fee || 0), 0);
    if (items.length === 0 || total <= 0) { uiAlert("บิลต้องมีอย่างน้อย 1 รายการ และยอดรวมมากกว่า 0 บาท"); return; }
    if (!(await confirmBeforeSave(null, `ตรวจสอบการแก้ไขบิล ${inv.invoiceNo}`, [
        ...items.map((item, i) => ({ label: `${i + 1}. ${item.title || "รายการ"}`, value: `${fmtMoney(item.fee || 0)} บาท` })),
        { label: "ยอดรวมใหม่", value: `${fmtMoney(total)} บาท` }
    ]))) return;

    const prev = JSON.parse(JSON.stringify(inv));
    const selectBank = document.getElementById("invoice-bank-select");
    Object.assign(inv, {
        items,
        subtotal: round2(total),
        grandTotal: round2(total),
        govFeeTotal: round2(items.reduce((s, item) => s + Math.min(item.govFee || 0, item.fee || 0), 0)),
        customerName: readInvoiceText("inv-cust-name"),
        customerAddr: readInvoiceText("inv-cust-addr"),
        customerTax: readInvoiceText("inv-cust-tax"),
        dueDateText: readInvoiceText("inv-due-date"),
        notes: readInvoiceText("inv-notes"),
        bankId: selectBank && selectBank.value !== 'cash' ? selectBank.value : null,
        updatedAt: new Date().toISOString()
    });
    if (inv.kind === 'free') {
        inv.customerId = freeInvoiceCustomerId || null;
        const w = freeInvoiceWorkerId ? workers.find(x => x.id === freeInvoiceWorkerId) : null;
        inv.workerId = freeInvoiceWorkerId || null;
        inv.workerName = w ? `${w.firstName} ${w.lastName}`.trim() : null;
    }
    const res = await callCloudAPI("saveInvoice", { invoiceData: inv });
    if (!res || res.status === "error") { Object.assign(inv, prev); return; }

    const jobUpdates = computeEditedJobUpdates();
    let failCount = 0;
    for (const jobId of Object.keys(jobUpdates)) {
        const j = jobs.find(x => x.id === jobId);
        if (!j) continue;
        const before = { ...j };
        j.fee = round2(jobUpdates[jobId].feeTotal);
        j.jobType = jobUpdates[jobId].typeSegments.map(s => `${s.serviceName} (${Math.round(s.price)})`).join(', ');
        j.govFee = round2(jobUpdates[jobId].govTotal);
        j.updatedAt = localDateISO(new Date());
        const r = await callCloudAPI("saveJob", { jobData: j });
        if (!r || r.status === "error") { Object.assign(j, before); failCount++; }
    }

    saveData();
    renderJobs();
    renderBillingTab();
    renderDashboard();
    showToast(failCount > 0 ? `⚠️ บันทึกบิลแล้ว แต่อัปเดตใบงานไม่สำเร็จ ${failCount} ใบ` : `💾 บันทึกการแก้ไขบิล ${inv.invoiceNo} เรียบร้อยแล้ว`, failCount > 0 ? "danger" : "success");
    renderInvoiceStatusUi();
}

// ==================== COMBINE BILLS MODAL LOGIC ====================
// นายจ้างที่มีใบงานรอออกบิลอย่างน้อย 1 ใบ — ตัวเลือกในหน้าต่าง "รวมใบสั่งงานออกบิลชุด"
function customersAwaitingBill() {
    const ids = new Set(jobs.filter(jobAwaitingBill).map(j => j.customerId));
    return customers.filter(c => ids.has(c.id));
}

function openCombineBillsModal() {
    if (customers.length === 0) {
        uiAlert("กรุณากรอกข้อมูล นายจ้าง/ลูกค้า อย่างน้อย 1 รายก่อนเปิดการรวมบิล");
        return;
    }

    document.getElementById("combine-cust-select").innerHTML =
        '<option value="" disabled selected>--- เลือกนายจ้าง/ลูกค้าผู้ว่าจ้าง ---</option>' +
        customersAwaitingBill().map(c => `<option value="${c.id}">${escapeHtml(c.companyName)}</option>`).join('');
    const combineSearch = document.getElementById("combine-cust-search");
    if (combineSearch) combineSearch.value = '';

    document.getElementById("combine-jobs-list").innerHTML = `
        <span class="text-muted" style="font-size: 13.5px; text-align: center; display: block; padding: 20px 0;">
            ${icon("idea")} กรุณาเลือกนายจ้างด้านบนเพื่อดึงข้อมูลใบสั่งงานที่ค้างจ่าย
        </span>
    `;

    document.getElementById("combine-billing-note-wrap").classList.add("hidden");
    const selectAllWrap = document.getElementById("combine-select-all-wrap");
    if (selectAllWrap) selectAllWrap.classList.add("hidden");
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

    // แสดง note วางบิลของนายจ้างรายนี้ (ถ้ามี) ให้เจ้าหน้าที่เห็นก่อนออกบิล — ไม่ถูกพิมพ์ลงในใบแจ้งหนี้
    const noteWrap = document.getElementById("combine-billing-note-wrap");
    const noteText = document.getElementById("combine-billing-note-text");
    const cust = customers.find(c => c.id === custId);
    if (noteWrap && noteText) {
        if (cust && cust.billingNote) {
            noteText.innerText = cust.billingNote;
            noteWrap.classList.remove("hidden");
        } else {
            noteWrap.classList.add("hidden");
        }
    }

    // Filter unpaid jobs under this customer
    // เฉพาะใบงานที่ยังไม่ได้อยู่ในบิลใด (บิลที่ออกแล้วรับเงินผ่านหน้าบิลนั้นแทน)
    const unpaidJobs = jobs.filter(j => j.customerId === custId && jobAwaitingBill(j));
    const selectAllWrap = document.getElementById("combine-select-all-wrap");
    if (selectAllWrap) selectAllWrap.classList.toggle("hidden", unpaidJobs.length === 0);

    if (unpaidJobs.length === 0) {
        listContainer.innerHTML = `
            <span class="text-muted" style="font-size: 13.5px; text-align: center; display: block; padding: 20px 0; color: var(--danger);">
                ${icon("bad")} ไม่พบงานที่ค้างชำระของนายจ้างรายนี้ในระบบ
            </span>
        `;
        document.getElementById("combine-total-amount").innerText = "0.00";
        document.getElementById("btn-generate-combined").disabled = true;
        return;
    }

    listContainer.innerHTML = unpaidJobs.map(j => {
        const work = workers.find(w => w.id === j.workerId);
        const workName = work ? `${work.firstName} ${work.lastName} (${work.nationality})` : "ไม่ระบุคนงานต่างด้าว";
        const workUidTag = work && work.workerUid ? ` [${work.workerUid}]` : '';

        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 14px; gap: 15px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: normal; margin: 0; width: 65%;">
                    <input type="checkbox" name="combine-job-checkbox" value="${j.id}" onchange="updateCombineTotalAmount()" style="width: 16px; height: 16px; cursor: pointer;">
                    <div>
                        <strong>${j.jobType || "ไม่ระบุประเภทงาน"}</strong> - คนงาน: ${workName}${workUidTag}
                    </div>
                </label>
                <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                    <input type="number" id="combine-fee-${j.id}" value="${j.fee > 0 ? j.fee : buildInvoiceItemsFromJob(j, '').reduce((s, it) => s + it.fee, 0)}" oninput="updateCombineTotalAmount()" style="width: 90px; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; text-align: right; font-family: inherit;">
                    <span style="color: var(--text-muted); font-size: 13px;">บาท</span>
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

    // ช่อง "เลือกทั้งหมด": ติ๊กเมื่อเลือกครบทุกใบ, ขีดกลาง (indeterminate) เมื่อเลือกบางใบ
    const selectAll = document.getElementById("combine-select-all");
    if (selectAll) {
        const totalBoxes = document.querySelectorAll('input[name="combine-job-checkbox"]').length;
        selectAll.checked = totalBoxes > 0 && checkboxes.length === totalBoxes;
        selectAll.indeterminate = checkboxes.length > 0 && checkboxes.length < totalBoxes;
    }

    // Toggle generate button
    document.getElementById("btn-generate-combined").disabled = checkboxes.length === 0;
}

function toggleCombineSelectAll(checked) {
    document.querySelectorAll('input[name="combine-job-checkbox"]').forEach(cb => { cb.checked = checked; });
    updateCombineTotalAmount();
}

// สร้าง "ร่างบิลรวม" จากใบงานที่เลือก — ยังไม่เปลี่ยนสถานะใบงานจนกว่าจะกด "ออกบิล" (ดู issueCurrentInvoice)
function generateCombinedInvoice() {
    const checkboxes = document.querySelectorAll('input[name="combine-job-checkbox"]:checked');
    if (checkboxes.length === 0) return;

    const selectedJobIds = Array.from(checkboxes).map(cb => cb.value);
    const firstJob = jobs.find(j => j.id === selectedJobIds[0]);
    const cust = customers.find(c => c.id === firstJob.customerId);

    setPrintPageSize(INVOICE_PAGE_CSS);
    currentInvoiceId = null;
    currentInvoiceKind = 'combined';
    fillInvoiceCustomerHeader(customerInvoiceSnapshot(cust));
    updateInvoiceBillingNote(cust);
    document.getElementById("inv-no").innerText = "ร่าง — ยังไม่ออกเลขที่";
    document.getElementById("inv-due-date").innerText = defaultDueDateText(new Date());
    document.getElementById("inv-notes").innerText = "-";
    setInvoiceDate(new Date());

    // รวมรายการประเภทงานเดียวกันจากหลายใบงานเป็นแถวเดียว (จำนวน = จำนวนใบงาน) — ราคาต่อใบงานใช้ค่าที่แก้ในหน้าต่างรวมบิล
    const aggregated = {}; // serviceName -> { jobs: [{ jobId, workDetails, price, govFee }] }
    selectedJobIds.forEach(jobId => {
        const j = jobs.find(x => x.id === jobId);
        if (!j) return;
        const work = workers.find(w => w.id === j.workerId);
        const workDetails = work ? invoiceWorkerLine(work) : "ไม่พบข้อมูลคนงาน";

        const baseItems = buildInvoiceItemsFromJob(j, workDetails);
        const baseSum = baseItems.reduce((s, x) => s + x.fee, 0);
        const feeInput = document.getElementById(`combine-fee-${jobId}`);
        const customFee = parseFloat(feeInput ? feeInput.value : baseSum);
        const totalFee = isNaN(customFee) ? baseSum : customFee;

        baseItems.forEach((item, idx) => {
            const ratio = baseSum > 0 ? item.fee / baseSum : (idx === 0 ? 1 : 0);
            const price = ratio * totalFee;
            const name = item.serviceName;
            if (!aggregated[name]) aggregated[name] = { jobs: [] };
            aggregated[name].jobs.push({ jobId: j.id, workDetails, price, govFee: Math.min(item.govFee, price) });
        });
    });

    let itemIdx = 0;
    currentInvoiceItems = Object.keys(aggregated).map(serviceName => {
        const group = aggregated[serviceName];
        const qty = group.jobs.length;
        const fee = group.jobs.reduce((s, x) => s + x.price, 0);
        return {
            id: `aggregated-${itemIdx++}`,
            title: `ค่าบริการ: ${serviceName}`,
            desc: group.jobs.map((jb, i) => `${i + 1}. ${jb.workDetails}`).join('\n'),
            qty,
            unitPrice: qty > 0 ? fee / qty : 0,
            fee,
            govFee: round2(group.jobs.reduce((s, x) => s + x.govFee, 0)),
            serviceName,
            jobBreakdown: group.jobs.map(x => ({ jobId: x.jobId, price: x.price }))
        };
    });
    currentInvoiceJobIds = selectedJobIds;

    const freePickerWrap = document.getElementById("invoice-free-picker-wrap");
    if (freePickerWrap) freePickerWrap.classList.add("hidden");
    populateInvoiceBankSelect(null);
    loadInvoiceLayoutForCurrent();
    renderInvoiceStatusUi();

    closeCombineBillsModal();
    document.getElementById("invoice-modal").classList.remove("hidden");
}

// ==================== SYSTEM DATA BACKUP & RESTORE ====================
// ข้อมูลทุกตารางที่สำรอง — เรียงตามลำดับที่ต้องกู้คืน (ตารางที่ถูกอ้างถึงก่อน เช่น Agent/นายจ้าง ก่อนคนงาน ก่อนใบงาน)
// เดิมสำรองแค่ นายจ้าง/คนงาน/งาน/บัญชีธนาคาร — Agent, รายจ่าย, บิลอิสระ, กลุ่ม LINE หายหมดถ้าต้องกู้คืน
const BACKUP_COLLECTIONS = [
    { key: 'agents', label: 'Agent', save: 'saveAgent', payloadKey: 'agentData', get: () => agents, set: v => { agents = v; } },
    { key: 'banks', label: 'บัญชีธนาคาร', save: 'saveBank', payloadKey: 'bankData', get: () => banks, set: v => { banks = v; } },
    { key: 'customers', label: 'นายจ้าง', save: 'saveCustomer', payloadKey: 'customerData', get: () => customers, set: v => { customers = v; } },
    { key: 'workers', label: 'คนงาน', save: 'saveWorker', payloadKey: 'workerData', get: () => allWorkers(), set: v => { workers = v; hiddenWorkers = []; } },
    // บิลต้องกู้คืนก่อนงาน (jobs.invoice_id อ้างถึงบิล) และก่อนการรับเงิน (payments.invoice_id)
    { key: 'invoices', label: 'บิล', save: 'saveInvoice', payloadKey: 'invoiceData', get: () => invoices, set: v => { invoices = v; } },
    { key: 'jobs', label: 'งาน', save: 'saveJob', payloadKey: 'jobData', get: () => jobs, set: v => { jobs = v; } },
    // ใบเสร็จก่อนการรับเงิน (payments.receipt_id อ้างถึงใบเสร็จ)
    { key: 'receipts', label: 'ใบเสร็จ/มัดจำ', save: 'saveReceipt', payloadKey: 'receiptData', get: () => receipts, set: v => { receipts = v; } },
    { key: 'payments', label: 'การรับเงิน', save: 'savePayment', payloadKey: 'paymentData', get: () => payments, set: v => { payments = v; } },
    { key: 'expenses', label: 'รายจ่าย', save: 'saveExpense', payloadKey: 'expenseData', get: () => expenses, set: v => { expenses = v; } },
    { key: 'servicePrices', label: 'ราคามาตรฐาน', save: 'saveServicePrice', payloadKey: 'priceData', get: () => servicePrices, set: v => { servicePrices = v; } },
    { key: 'freeInvoices', label: 'บิลอิสระ (เดิม)', save: 'saveFreeInvoice', payloadKey: 'invoiceData', get: () => freeInvoices, set: v => { freeInvoices = v; } }
];
const BACKUP_BUCKET = 'worker-documents';
const BACKUP_FILES_PREFIX = 'files/'; // โฟลเดอร์ในไฟล์ ZIP ที่เก็บไฟล์เอกสาร/รูป (path ด้านในตรงกับ path จริงบน Storage)
const LAST_BACKUP_KEY = 'mw_last_full_backup';

function setBackupProgress(text) {
    const el = document.getElementById('backup-progress');
    if (!el) return;
    el.classList.toggle('hidden', !text);
    // อีโมจินำหน้า (⏳ ☁️ ✅ ...) → ไอคอนชุดเดียวกับแจ้งเตือน (TOAST_EMOJI_ICONS), อีโมจิอื่นในข้อความตัดทิ้ง
    const t = String(text || '');
    const lead = t.match(/^\s*(\p{Extended_Pictographic})️?\s*/u);
    const iconName = lead ? TOAST_EMOJI_ICONS[lead[1]] : null;
    const rest = (lead ? t.slice(lead[0].length) : t).replace(/\p{Extended_Pictographic}️?\s*/gu, '');
    el.innerHTML = (iconName ? icon(iconName) + ' ' : '') + escapeHtml(rest);
}

// ดึงข้อมูลล่าสุดจากคลาวด์ตรง ๆ (ไม่ใช้ข้อมูลในแท็บนี้ที่อาจค้างเก่า และไม่ถอยไปใช้แคชในเครื่องแบบ loadData —
// ถ้าดึงไม่สำเร็จต้องล้มเหลวให้เห็น ไม่ใช่ได้ไฟล์ backup ที่ข้อมูลไม่ครบโดยไม่รู้ตัว)
async function buildBackupData() {
    const res = await callCloudAPI("getData");
    if (!res || res.status === "error") throw new Error('ดึงข้อมูลจากคลาวด์ไม่สำเร็จ: ' + ((res && res.message) || 'unknown error'));
    const data = { version: "2.0", exportDate: new Date().toISOString() };
    BACKUP_COLLECTIONS.forEach(c => { data[c.key] = res[c.key] || []; });
    // กลุ่ม LINE ไม่ได้โหลดเข้าแอป (line-webhook ใช้) — อ่านตรงจากตาราง เก็บเป็นแถวดิบ
    const lg = await window.supabaseAdapter.client.from('line_groups').select('*');
    data.lineGroups = lg.error ? [] : (lg.data || []);
    return data;
}

// รายชื่อไฟล์ทั้งหมดใน Storage bucket (ไล่ทุกโฟลเดอร์ย่อย)
async function listAllStorageFiles(prefix = '') {
    const bucket = window.supabaseAdapter.client.storage.from(BACKUP_BUCKET);
    let out = [];
    for (let offset = 0; ; offset += 1000) {
        const { data, error } = await bucket.list(prefix, { limit: 1000, offset });
        if (error) throw new Error('อ่านรายชื่อไฟล์ใน Storage ไม่สำเร็จ: ' + error.message);
        for (const item of data) {
            const path = prefix ? `${prefix}/${item.name}` : item.name;
            if (item.id === null) out = out.concat(await listAllStorageFiles(path)); // โฟลเดอร์
            else out.push(path);
        }
        if (data.length < 1000) break;
    }
    return out;
}

function loadJsZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
        s.onload = () => resolve(window.JSZip);
        s.onerror = () => reject(new Error('โหลดตัวสร้างไฟล์ ZIP ไม่สำเร็จ (ตรวจสอบอินเทอร์เน็ต)'));
        document.head.appendChild(s);
    });
}

function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function describeBackupCounts(data) {
    const parts = BACKUP_COLLECTIONS.map(c => `${c.label} ${(data[c.key] || []).length}`);
    parts.push(`กลุ่ม LINE ${(data.lineGroups || []).length}`);
    return parts.join(', ');
}

// สำรองเฉพาะข้อมูล (ไฟล์ .json เล็ก เร็ว) — ไม่รวมไฟล์เอกสาร/รูป
async function exportSystemData() {
    try {
        setBackupProgress('⏳ กำลังดึงข้อมูลล่าสุดจากคลาวด์...');
        const data = await buildBackupData();
        const dateStr = new Date().toISOString().split('T')[0];
        downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `migrant_system_backup_${dateStr}.json`);
        setBackupProgress(`✅ ดาวน์โหลดไฟล์ข้อมูลแล้ว (${describeBackupCounts(data)}) — ไฟล์นี้ไม่รวมเอกสาร/รูป`);
        showToast("📥 ดาวน์โหลดไฟล์สำรองข้อมูลเรียบร้อยแล้ว กรุณาเซฟเก็บไว้ใน Google Drive", "success");
    } catch (err) {
        setBackupProgress('');
        showToast("❌ สำรองข้อมูลไม่สำเร็จ: " + err.message, "danger");
    }
}

// สำรองทั้งระบบ: ข้อมูลทุกตาราง + ไฟล์เอกสาร/รูปทุกไฟล์ใน Storage รวมเป็น ZIP ไฟล์เดียว
// (ไฟล์ .json อย่างเดียวเก็บแค่ลิงก์ ถ้าไฟล์จริงบน Storage หายไป กู้ข้อมูลกลับมาก็เปิดเอกสารไม่ได้)
async function exportFullBackup() {
    const btn = document.getElementById('btn-full-backup');
    if (btn) btn.disabled = true;
    try {
        setBackupProgress('⏳ กำลังดึงข้อมูลล่าสุดจากคลาวด์...');
        const [JSZip, data] = await Promise.all([loadJsZip(), buildBackupData()]);
        const zip = new JSZip();

        setBackupProgress('⏳ กำลังอ่านรายชื่อไฟล์เอกสาร/รูป...');
        const paths = await listAllStorageFiles();
        const bucket = window.supabaseAdapter.client.storage.from(BACKUP_BUCKET);
        const failed = [];
        for (let i = 0; i < paths.length; i++) {
            setBackupProgress(`📦 กำลังดาวน์โหลดไฟล์ ${i + 1}/${paths.length}...`);
            const { data: blob, error } = await bucket.download(paths[i]);
            if (error || !blob) { failed.push(paths[i]); continue; }
            zip.file(BACKUP_FILES_PREFIX + paths[i], blob);
        }
        data.storageFiles = paths.filter(p => !failed.includes(p));
        zip.file('data.json', JSON.stringify(data, null, 2));

        setBackupProgress('🗜️ กำลังสร้างไฟล์ ZIP...');
        // PDF/JPG บีบอัดมาแล้ว — เก็บแบบไม่บีบซ้ำ (STORE) เร็วกว่ามากและขนาดแทบไม่ต่างกัน
        const out = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
        const dateStr = new Date().toISOString().split('T')[0];
        downloadBlob(out, `workeros_full_backup_${dateStr}.zip`);

        try { localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()); } catch (e) { /* ไม่มี localStorage ก็สำรองได้ปกติ */ }
        renderLastBackupInfo();
        const sizeMb = (out.size / 1024 / 1024).toFixed(1);
        setBackupProgress(`✅ สำรองทั้งระบบแล้ว: ${describeBackupCounts(data)}, ไฟล์เอกสาร/รูป ${data.storageFiles.length} ไฟล์ (${sizeMb} MB)` +
            (failed.length ? ` — ⚠️ ดาวน์โหลดไม่ได้ ${failed.length} ไฟล์: ${failed.slice(0, 5).join(', ')}${failed.length > 5 ? ' ...' : ''}` : ''));
        showToast(failed.length ? `⚠️ สำรองเสร็จ แต่มี ${failed.length} ไฟล์ที่ดาวน์โหลดไม่ได้` : "📦 สำรองทั้งระบบเรียบร้อย กรุณาเซฟไฟล์ ZIP เก็บไว้ใน Google Drive", failed.length ? "warning" : "success");
    } catch (err) {
        setBackupProgress('');
        showToast("❌ สำรองทั้งระบบไม่สำเร็จ: " + err.message, "danger");
    } finally {
        if (btn) btn.disabled = false;
    }
}

function renderLastBackupInfo() {
    const el = document.getElementById('backup-last-info');
    if (!el) return;
    let last = null;
    try { last = localStorage.getItem(LAST_BACKUP_KEY); } catch (e) { /* ignore */ }
    if (!last) { el.innerHTML = '' + icon("warn") + ' ยังไม่เคยสำรองทั้งระบบจากเครื่องนี้'; el.classList.add('is-stale'); return; }
    const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
    el.innerText = `สำรองทั้งระบบล่าสุดจากเครื่องนี้: ${formatDateForInput(last.split('T')[0])} (${days === 0 ? 'วันนี้' : days + ' วันที่แล้ว'})`;
    el.classList.toggle('is-stale', days >= 7);
}

// ---------- สำรองอัตโนมัติลง Google Drive (Edge Function drive-backup) ----------
// สถานะรอบล่าสุดจากตาราง drive_backup_runs (Admin อ่านได้คนเดียว) + ปุ่มสั่งสำรองทันที
async function renderDriveBackupStatus() {
    const el = document.getElementById('drive-backup-status');
    if (!el || !window.supabaseAdapter) return;
    const { data, error } = await window.supabaseAdapter.client.from('drive_backup_runs')
        .select('*').order('started_at', { ascending: false }).limit(1);
    if (error) { el.innerText = 'ยังไม่ได้เปิดใช้การสำรองลง Google Drive'; el.classList.add('is-stale'); return; }
    const r = data && data[0];
    if (!r) { el.innerText = 'ยังไม่เคยสำรองลง Google Drive'; el.classList.add('is-stale'); return; }
    const when = new Date(r.finished_at || r.started_at);
    const hours = Math.floor((Date.now() - when.getTime()) / 3600000);
    const whenText = `${formatThaiDate(localDateISO(when))} ${when.toTimeString().slice(0, 5)} น.`;
    if (r.error) {
        el.innerText = `สำรองลง Google Drive รอบล่าสุด (${whenText}) ไม่สำเร็จ: ${r.error}`;
        el.classList.add('is-stale');
        return;
    }
    if (!r.finished_at) { el.innerText = `กำลังสำรองลง Google Drive (เริ่ม ${whenText})...`; el.classList.remove('is-stale'); return; }
    el.innerText = `สำรองลง Google Drive ล่าสุด: ${whenText} — ไฟล์ใหม่ ${r.uploaded}, ปรับชื่อ/ย้าย ${r.updated}, ย้ายไป "ถูกลบ" ${r.moved_to_deleted}` +
        (r.remaining ? ` — ยังเหลือ ${r.remaining} ไฟล์ จะทำต่อในรอบถัดไป` : '');
    el.classList.toggle('is-stale', hours >= 26);
}

async function runDriveBackupNow() {
    if (currentUser.role !== 'admin' || !window.supabaseAdapter) return;
    const btn = document.getElementById('btn-drive-backup-now');
    if (btn) btn.disabled = true;
    showToast("☁️ กำลังสำรองลง Google Drive (อาจใช้เวลาถึง 2 นาที)...", "warning");
    try {
        const { data, error } = await window.supabaseAdapter.client.functions.invoke('drive-backup', { body: { trigger: 'manual' } });
        if (error || !data || data.status !== 'success') {
            showToast("❌ สำรองลง Google Drive ไม่สำเร็จ: " + ((data && data.message) || (error && error.message) || 'unknown error'), "danger");
        } else {
            showToast(`✅ สำรองลง Google Drive แล้ว — ไฟล์ใหม่ ${data.uploaded} ไฟล์${data.remaining ? ` (ยังเหลือ ${data.remaining} ไฟล์ จะทำต่ออัตโนมัติ)` : ''}`, "success");
        }
    } finally {
        if (btn) btn.disabled = false;
        renderDriveBackupStatus();
    }
}

// กู้คืนจากไฟล์ .json (ข้อมูลอย่างเดียว) หรือ .zip (ข้อมูล + ไฟล์เอกสาร/รูป — อัปโหลดกลับไปที่ path เดิมบน Storage
// ลิงก์เอกสารใน data.json จึงกลับมาเปิดได้เหมือนเดิม)
async function importSystemData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const resetInput = () => {
        event.target.value = '';
        document.getElementById("import-file-name").innerText = "ยังไม่ได้เลือกไฟล์";
    };
    document.getElementById("import-file-name").innerText = file.name;

    try {
        let imported, zip = null;
        if (/\.zip$/i.test(file.name)) {
            const JSZip = await loadJsZip();
            zip = await JSZip.loadAsync(file);
            const dataFile = zip.file('data.json');
            if (!dataFile) throw new Error("ไม่พบ data.json ในไฟล์ ZIP");
            imported = JSON.parse(await dataFile.async('string'));
        } else {
            imported = JSON.parse(await file.text());
        }

        // ไฟล์รุ่นเก่า (1.0) มีแค่ 4 ตารางหลัก — ตารางที่ไม่มีในไฟล์จะไม่ถูกแตะ
        if (!imported.customers || !imported.workers || !imported.banks || !imported.jobs) {
            throw new Error("โครงสร้างไฟล์ข้อมูลไม่ถูกต้อง");
        }
        const present = BACKUP_COLLECTIONS.filter(c => Array.isArray(imported[c.key]));
        const fileEntries = zip ? Object.values(zip.files).filter(f => !f.dir && f.name.startsWith(BACKUP_FILES_PREFIX)) : [];
        const summary = present.map(c => `${c.label} ${imported[c.key].length}`).join(', ') +
            (Array.isArray(imported.lineGroups) ? `, กลุ่ม LINE ${imported.lineGroups.length}` : '') +
            (zip ? `, ไฟล์เอกสาร/รูป ${fileEntries.length} ไฟล์` : '');

        if (!(await uiConfirm(`ยืนยันการกู้คืนข้อมูล? ข้อมูลในไฟล์จะเขียนทับรายการที่มี id เดียวกันในคลาวด์ (${summary})\nรายการที่มีอยู่ในระบบแต่ไม่มีในไฟล์จะไม่ถูกลบ`, { okText: "กู้คืนข้อมูล", card: { imageIcon: "inbox", imageIconColor: "blue", title: "ข้อมูลในไฟล์สำรอง", list: summary.split(", ") } }))) {
            resetInput();
            return;
        }

        let failCount = 0;
        // ไฟล์ก่อน — ให้ลิงก์ในข้อมูลที่กู้คืนเปิดได้ทันที
        if (zip) {
            const bucket = window.supabaseAdapter.client.storage.from(BACKUP_BUCKET);
            for (let i = 0; i < fileEntries.length; i++) {
                setBackupProgress(`☁️ กำลังอัปโหลดไฟล์เอกสาร/รูปกลับ ${i + 1}/${fileEntries.length}...`);
                const path = fileEntries[i].name.slice(BACKUP_FILES_PREFIX.length);
                const blob = await fileEntries[i].async('blob');
                const { error } = await bucket.upload(path, blob, { upsert: true, contentType: blob.type || undefined });
                if (error) { failCount++; console.error('Restore file failed:', path, error); }
            }
        }

        for (const c of present) {
            const rows = imported[c.key];
            for (let i = 0; i < rows.length; i++) {
                setBackupProgress(`☁️ กำลังกู้คืน${c.label} ${i + 1}/${rows.length}...`);
                const res = await callCloudAPI(c.save, { [c.payloadKey]: rows[i] });
                if (!res || res.status === "error") failCount++;
            }
        }
        if (Array.isArray(imported.lineGroups) && imported.lineGroups.length) {
            setBackupProgress('☁️ กำลังกู้คืนกลุ่ม LINE...');
            const { error } = await window.supabaseAdapter.client.from('line_groups').upsert(imported.lineGroups);
            if (error) failCount += imported.lineGroups.length;
        }

        // โหลดข้อมูลจากคลาวด์ใหม่ทั้งหมด (ไม่ใช้ข้อมูลจากไฟล์ตรง ๆ — ให้หน้าจอตรงกับที่บันทึกขึ้นคลาวด์ได้จริง)
        await loadData();
        setBackupProgress('');
        if (failCount > 0) {
            showToast(`⚠️ กู้คืนเสร็จ แต่มี ${failCount} รายการบันทึกขึ้นคลาวด์ไม่สำเร็จ — ดูรายละเอียดใน Console`, "danger");
        } else {
            showToast("✅ กู้คืนข้อมูลขึ้นคลาวด์เสร็จสมบูรณ์!", "success");
        }
        switchView('dashboard');
        resetInput();
    } catch (err) {
        setBackupProgress('');
        showToast("❌ กู้คืนไม่สำเร็จ: " + err.message, "danger");
        resetInput();
    }
}

// Automatically load on app start
document.addEventListener("DOMContentLoaded", () => {
    setupDateMask("worker-dob");
    setupDateMask("worker-permit-expiry");
    setupDateMask("worker-passport-issue");
    setupDateMask("worker-passport-expiry");
    setupDateMask("cust-cert-issue-date");
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

// ลบไฟล์จริงออกจาก Supabase Storage bucket "worker-documents" ตาม public URL ที่เก็บไว้ใน attachments
// (เดิมตอนลบไฟล์จากแฟ้มเอกสาร ระบบลบแค่ reference ใน jsonb ไฟล์จริงยังค้างอยู่ใน Storage ตลอดไป — ไม่มี path
// เก็บแยกไว้ต่างหาก จึงต้องแยกเอา path ออกจาก URL เอง) ทำแบบ fire-and-forget ไม่บล็อกการลบ reference หลัก
// เพราะการลบไฟล์จริงพลาดไม่ควรทำให้ผู้ใช้ลบรายการออกจากแฟ้มไม่ได้
async function deleteStorageFileByUrl(url) {
    if (!window.supabaseAdapter || !url || typeof url !== 'string') return;
    const marker = '/worker-documents/';
    const idx = url.indexOf(marker);
    if (idx === -1) return; // ไม่ใช่ URL จาก Storage bucket นี้ (เช่น data: URL ของโหมด local fallback)

    const path = decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
    try {
        const { error } = await window.supabaseAdapter.client.storage.from('worker-documents').remove([path]);
        if (error) console.warn("ลบไฟล์จริงใน Storage ไม่สำเร็จ:", path, error.message);
    } catch (e) {
        console.warn("ลบไฟล์จริงใน Storage ไม่สำเร็จ:", path, e);
    }
}

// ==================== ถามผู้ใช้ตอน AI อ่านเอกสารไม่สำเร็จ: กรอกเอง หรือรอแนบใหม่ ====================
// งานที่แนบทีละหลายไฟล์ (bulk import / แฟ้มเอกสาร) เรียก beginAiRejectedBatch() ก่อนวนไฟล์ และ endAiRejectedBatch()
// หลังจบ เพื่อให้มีช่อง "ใช้คำตอบนี้กับไฟล์ที่เหลือ" ไม่ต้องตอบซ้ำทุกไฟล์
let aiRejectedBatchActive = false;
let aiRejectedBatchChoice = null;
let pendingAiRejectedResolve = null;

function beginAiRejectedBatch() {
    aiRejectedBatchActive = true;
    aiRejectedBatchChoice = null;
}

function endAiRejectedBatch() {
    aiRejectedBatchActive = false;
    aiRejectedBatchChoice = null;
}

function askAiRejectedChoice(fileName, ocrError) {
    if (aiRejectedBatchChoice) return Promise.resolve(aiRejectedBatchChoice);

    document.getElementById("ai-rejected-title").innerHTML = ocrError === 'busy' ? "" + icon("warn") + " AI ไม่ว่าง" : "" + icon("warn") + " AI อ่านเอกสารไม่สำเร็จ";
    document.getElementById("ai-rejected-filename").innerHTML = `${icon("file")} ${escapeHtml(fileName)}`;
    document.getElementById("ai-rejected-text").innerText = ocrError === 'busy'
        ? "Gemini มีผู้ใช้งานมากตอนนี้ AI จึงยังอ่านเอกสารนี้ไม่ได้ ไฟล์ยังไม่ถูกบันทึก ต้องการทำอย่างไร?"
        : "AI อ่านข้อมูลจากเอกสารนี้ไม่ได้ (ไฟล์อาจไม่ชัด หรือไม่ใช่เอกสารประเภทนี้) ไฟล์ยังไม่ถูกบันทึก ต้องการทำอย่างไร?";
    document.getElementById("ai-rejected-remember").checked = false;
    document.getElementById("ai-rejected-remember-wrap").classList.toggle("hidden", !aiRejectedBatchActive);
    document.getElementById("ai-rejected-modal").classList.remove("hidden");

    return new Promise(resolve => { pendingAiRejectedResolve = resolve; });
}

function resolveAiRejectedChoice(choice) {
    document.getElementById("ai-rejected-modal").classList.add("hidden");
    if (aiRejectedBatchActive && document.getElementById("ai-rejected-remember").checked) {
        aiRejectedBatchChoice = choice;
    }
    const resolve = pendingAiRejectedResolve;
    pendingAiRejectedResolve = null;
    if (resolve) resolve(choice);
}

// ช่องที่ต้องกรอกเองเมื่อผู้ใช้เลือก "บันทึกไฟล์ กรอกเอง" — ตามประเภทเอกสาร (ช่องแรก = ช่องที่ได้ focus)
const MANUAL_ENTRY_FIELDS = {
    'worker-wp-doc': ['worker-permit-no', 'worker-permit-expiry'],
    'worker-passport': ['worker-passport-no', 'worker-passport-expiry'],
    'worker-visa': ['worker-passport-no'],
    'worker-myanmar-id': ['worker-first-name', 'worker-dob'],
    'worker-pink-card': ['worker-pink-card-no', 'worker-thai-name'],
    'worker-insurance-doc': ['worker-insurance-no'],
    'cust-id-card': ['cust-director-id', 'cust-coordinator'],
    'cust-cert': ['cust-company-name', 'cust-tax-id', 'cust-cert-issue-date'],
    'job-appointment': ['job-appointment-date', 'job-appointment-time', 'job-appointment-no'],
    'expense-slip': ['expense-amount', 'expense-date'],
};

// เลื่อนไปที่ช่องที่ต้องกรอกในฟอร์มที่เปิดอยู่ ใส่ไฮไลต์ชั่วคราว แล้ว focus ช่องแรก
function focusManualEntryFields(docType) {
    const els = (MANUAL_ENTRY_FIELDS[docType] || []).map(id => document.getElementById(id)).filter(Boolean);
    if (els.length === 0) return;
    if (docType.startsWith('cust-')) switchCustomerModalTab('general');
    els.forEach(el => {
        el.classList.add('manual-entry-highlight');
        setTimeout(() => el.classList.remove('manual-entry-highlight'), 6000);
    });
    els[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    els[0].focus({ preventScroll: true });
}

// แนบผ่านแฟ้มเอกสาร/Bulk Import (ไม่มีฟอร์มเปิดอยู่) -> ปิดหน้าต่างเดิม เปิดฟอร์มแก้ไขของคนงาน/นายจ้างรายนั้น แล้วพาไปช่องที่ต้องกรอก
function openManualEntryForm(kind, recordId, docType) {
    if (kind === 'customer') {
        closeCustomerFolderModal();
        openCustomerModal(recordId);
    } else {
        closeWorkerFolderModal();
        closeBulkImportModal();
        openWorkerModal(recordId);
    }
    setTimeout(() => focusManualEntryFields(docType), 150); // รอฟอร์มเติมค่าและแสดงผลก่อน
}

function createAiRejectedError(ocrError) {
    const err = new Error(getAiRejectedMessage(ocrError));
    err.aiRejected = true;
    err.ocrError = ocrError;
    return err;
}

// ผู้ใช้กด "ไม่อัปโหลด" (เลข 13 หลักไม่ตรง — confirmWorkerUidChange) — ไม่มีไฟล์ถูกเก็บ ไม่ใช่ข้อผิดพลาด
function createUploadCancelledError() {
    const err = new Error('ไม่ได้อัปโหลด — เลข 13 หลักไม่ตรงกับคนงาน');
    err.cancelled = true;
    return err;
}

function getAiRejectedMessage(ocrError) {
    return ocrError === 'busy'
        ? "AI ไม่ว่าง (Gemini มีผู้ใช้งานมาก) — ยังไม่ได้บันทึกไฟล์ กรุณาแนบใหม่อีกครั้งในอีกสักครู่"
        : "AI อ่านเอกสารไม่สำเร็จ — ยังไม่ได้บันทึกไฟล์ กรุณาตรวจไฟล์แล้วแนบใหม่";
}

// อัปโหลดไฟล์ขึ้น Supabase Storage (bucket worker-documents) แล้วเรียก Edge Function
// "ocr-document" (Gemini) ให้อ่านข้อมูลจากเอกสารกลับมาด้วยถ้าเป็นประเภทเอกสารที่รองรับ
async function uploadDocumentFile(fileDataUrl, fileName, customerId = "", workerId = "", docType = "", options = {}) {
    if (!window.supabaseAdapter) return null; // ยังไม่ได้ตั้งค่า Supabase

    try {
        showToast("☁️ กำลังอัปโหลดไฟล์ขึ้น Supabase Storage...", "warning");
        const resData = await window.supabaseAdapter.uploadFile(fileDataUrl, fileName, customerId, workerId, docType, currentUser, options);

        if (resData && resData.status === 'success') {
            showToast("✅ บันทึกไฟล์สำเร็จ!", "success");
            notifyEwpStatus(resData.parsedData);
            return {
                fileUrl: resData.fileUrl,
                viewUrl: resData.viewUrl,
                fileId: resData.fileId,
                fileName: resData.fileName || fileName, // อาจถูกตั้งชื่อใหม่จากข้อมูลที่ AI อ่าน (options.nameFromOcr)
                parsedData: resData.parsedData,
                ocrAttempted: !!resData.ocrAttempted
            };
        } else if (resData && resData.status === 'cancelled') {
            // ผู้ใช้กดไม่อัปโหลดหลัง AI อ่าน (options.confirmParsed) — ไม่มีไฟล์ถูกเก็บ
            showToast("ไม่ได้อัปโหลดไฟล์ — คงข้อมูลเดิมไว้", "warning");
            return { cancelled: true };
        } else if (resData && resData.aiRejected) {
            // เอกสารประเภทที่ใช้ AI แต่ AI อ่านไม่สำเร็จ — ไฟล์ยังไม่ถูกเก็บ ให้ผู้ใช้เลือก:
            //   manual = อัปโหลดไฟล์เดิมอีกรอบแบบไม่ผ่าน AI แล้วกรอกข้อมูลเอง
            //   retry  = ไม่เก็บไฟล์ (กันไฟล์ซ้ำซ้อนตอนแนบใหม่) ผู้เรียกต้องเช็ก aiRejected แล้วหยุด
            //            ห้าม fallback ไปเก็บไฟล์ทางอื่น (uploadFileToServer)
            const choice = await askAiRejectedChoice(fileName, resData.ocrError);
            if (choice === 'manual') {
                const manualRes = await window.supabaseAdapter.uploadFile(fileDataUrl, fileName, customerId, workerId, docType, currentUser, { ...options, skipOcr: true });
                if (manualRes && manualRes.status === 'success') {
                    showToast("✅ บันทึกไฟล์แล้ว (ไม่ผ่าน AI) — กรุณากรอกข้อมูลเอง", "success");
                    // manualEntry: ผู้เรียกเปิด/เลื่อนไปที่ช่องที่ต้องกรอกให้อัตโนมัติ (ดู focusManualEntryFields)
                    return { fileUrl: manualRes.fileUrl, viewUrl: manualRes.viewUrl, fileId: manualRes.fileId, fileName: manualRes.fileName || fileName, parsedData: null, ocrAttempted: false, manualEntry: true };
                }
                showToast("❌ อัปโหลดไฟล์ล้มเหลว: " + ((manualRes && manualRes.message) || "ข้อผิดพลาดระบบ"), "danger");
                return null;
            }
            showToast(getAiRejectedMessage(resData.ocrError), "warning");
            return { aiRejected: true, ocrError: resData.ocrError };
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

// ==================== CUSTOMER (นายจ้าง/ลูกค้าผู้ว่าจ้าง) DOCUMENTS FOLDER SYSTEM ====================
let activeFolderCustomerId = null;
let activeFolderCustomerDocType = null;

const CUSTOMER_DOC_TYPES = [
    { key: "cust-id-card", label: "บัตรประชาชนนายจ้าง", icon: "user" },
    { key: "cust-cert", label: "หนังสือรับรองบริษัท", icon: "cert" },
    { key: "cust-house", label: "ทะเบียนบ้านบริษัท", icon: "building" },
    { key: "employer-house", label: "ทะเบียนบ้านนายจ้าง", icon: "home" },
    { key: "cust-photos", label: "รูปถ่ายกิจการ", icon: "photo" },
    { key: "cust-commerce", label: "ทะเบียนพาณิชย์ (ถ้ามี)", icon: "briefcase" },
    { key: "cust-signature", label: "ลายเซ็นนายจ้าง (ใช้ใน บต.46)", icon: "edit" },
    { key: "cust-other", label: "เอกสารอื่นๆ", icon: "clip" }
];

const WORKER_FOLDER_DOC_TYPES = [
    { key: "worker-wp-doc", label: "ใบอนุญาตทำงาน (Work Permit)", icon: "wp", type: "ใบอนุญาตทำงาน" },
    { key: "worker-passport", label: "หนังสือเดินทาง (Passport / CI)", icon: "passport", type: "พาสปอร์ต" },
    { key: "worker-myanmar-id", label: "บัตรประชาชน/ทะเบียนบ้านพม่า", icon: "home", type: "ทะเบียนบ้านพม่า" },
    { key: "worker-pink-card", label: "บัตรชมพู (Pink Card)", icon: "pink", type: "บัตรชมพู" },
    { key: "worker-receipt", label: "ใบเสร็จรับเงิน (Receipt)", icon: "receipt", type: "ใบเสร็จ" },
    { key: "worker-medical", label: "ใบรับรองแพทย์ (Medical Certificate)", icon: "medical", type: "ใบรับรองแพทย์" },
    { key: "worker-insurance-doc", label: "ประกัน (เอกชน/รัฐ/ประกันสังคม)", icon: "shield", type: "ประกัน" },
    { key: "worker-application", label: "ใบคำขอ (Application Form)", icon: "edit", type: "ใบคำขอ" },
    { key: "worker-other", label: "เอกสารอื่นๆ", icon: "clip", type: "เอกสารอื่นๆ" }
];

// วาดไฟล์ตามคำค้นหาในช่อง "ค้นหาชื่อไฟล์ในแฟ้มนี้" (ถ้ามี) — เรียกซ้ำได้ทุกครั้งที่พิมพ์ โดยไม่ต้องเปิด modal ใหม่
function renderCustomerFolderTiles() {
    const c = customers.find(item => item.id === activeFolderCustomerId);
    if (!c) return;

    const searchInput = document.getElementById("search-customer-folder");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    const canAdd = can('ops');
    const groups = [];
    const allFiles = [];
    CUSTOMER_DOC_TYPES.forEach(docInfo => {
        const items = [];
        getAttachments(c, docInfo.key).forEach((fItem, fIdx) => {
            if (query && !(fItem.name || '').toLowerCase().includes(query)) return;
            allFiles.push({ key: docInfo.key, idx: fIdx });
            items.push(`
                <div class="fv-item" data-key="${docInfo.key}" data-idx="${fIdx}" onclick="selectCustomerFolderFile('${docInfo.key}', ${fIdx})" title="${escapeHtml(fItem.name || '')}">
                    ${renderDriveThumbnail(fItem.data || '')}
                    <div class="fv-item-text"><b>${escapeHtml(fItem.name || '-')}</b><small>${fItem.uploadedAt ? formatThaiDate(String(fItem.uploadedAt).slice(0, 10)) : ''}</small></div>
                </div>`);
        });
        if (query && items.length === 0) return;
        groups.push(`
            <div class="fv-group">
                <div class="fv-group-head">
                    <span>${icon(docInfo.icon)} ${docInfo.label}</span>
                    <b>${items.length || ''}</b>
                    ${canAdd ? `<button type="button" class="fv-add" onclick="triggerCustomerFolderFileUpload('${docInfo.key}')" data-paste-target="customer-folder:${docInfo.key}" title="แนบไฟล์: ${docInfo.label} — คลิกเลือกไฟล์ หรือชี้แล้วกด Ctrl+V วางภาพ">${icon('plus')} แนบ</button>` : ''}${canAdd && isCameraDevice() ? cameraButtonHtml(`cameraCustomerFolderUpload('${docInfo.key}')`, 'fv-cam') : ''}
                </div>
                ${items.join('') || '<div class="fv-none">ยังไม่มีไฟล์</div>'}
            </div>`);
    });

    // คงไฟล์ที่เลือกไว้ (หลังแนบ/เปลี่ยนชื่อ/ลบ) — ถ้าไม่อยู่แล้ว เลือกไฟล์แรกแทน
    const sel = activeCustomerFolderSel;
    if (!(sel && allFiles.some(f => f.key === sel.key && f.idx === sel.idx))) {
        activeCustomerFolderSel = allFiles[0] ? { key: allFiles[0].key, idx: allFiles[0].idx } : null;
    }

    const listEl = document.getElementById("customer-folder-files-list");
    listEl.innerHTML = groups.join('') || `<p class="text-muted fv-empty">${icon("bad")} ไม่พบไฟล์ตามคำค้นหา</p>`;
    hydratePdfThumbnails(listEl);
    markCustomerFolderSelection();
    renderCustomerFolderPreview();
}

let activeCustomerFolderSel = null; // { key, idx } ไฟล์ที่เลือกดูในแฟ้มนายจ้าง

function markCustomerFolderSelection() {
    const sel = activeCustomerFolderSel;
    document.querySelectorAll('#customer-folder-modal .fv-item').forEach(el => {
        el.classList.toggle('is-active', !!sel && el.dataset.key === sel.key && Number(el.dataset.idx) === sel.idx);
    });
}

function selectCustomerFolderFile(key, idx) {
    activeCustomerFolderSel = { key, idx };
    markCustomerFolderSelection();
    renderCustomerFolderPreview();
}

// ช่องพรีวิวใหญ่ทางขวา (เหมือน renderWorkerFolderPreview)
function renderCustomerFolderPreview() {
    const box = document.getElementById("customer-folder-preview");
    const c = customers.find(item => item.id === activeFolderCustomerId);
    if (!box || !c) return;
    const sel = activeCustomerFolderSel;
    if (!sel) {
        box.innerHTML = `<div class="fv-placeholder">${icon('folder')}<p>ยังไม่มีเอกสารในแฟ้มนี้${can('ops') ? ' — กด "แนบ" ที่หมวดทางซ้ายเพื่อเพิ่มไฟล์' : ''}</p></div>`;
        return;
    }
    const type = CUSTOMER_DOC_TYPES.find(t => t.key === sel.key) || { label: '' };
    const fItem = getAttachments(c, sel.key)[sel.idx];
    if (!fItem) { box.innerHTML = ''; return; }
    const url = fItem.data || '';
    const canEdit = can('ops');
    const viewer = isPdfUrl(url)
        ? `<iframe src="${escapeHtml(url)}" title="${escapeHtml(fItem.name || '')}"></iframe>`
        : `<img src="${escapeHtml(url)}" alt="${escapeHtml(fItem.name || '')}" onerror="this.outerHTML = '<iframe src=&quot;' + this.src + '&quot;></iframe>'">`;
    box.innerHTML = `
        <div class="fv-bar">
            <div class="fv-bar-title">
                ${canEdit ? `<input type="text" class="fv-name" value="${escapeHtml(fItem.name || '')}" title="แก้ชื่อไฟล์แล้วกด Enter" onchange="renameCustomerFolderFileIndex('${sel.key}', ${sel.idx}, this.value)">`
                    : `<b>${escapeHtml(fItem.name || '-')}</b>`}
                <small>${type.label}</small>
            </div>
            <div class="fv-bar-actions">
                <a class="btn btn-sm btn-outline" href="${escapeHtml(url)}" target="_blank" rel="noopener">${icon('link')} เปิดแท็บใหม่</a>
                <button type="button" class="btn btn-sm btn-outline" onclick="customerFolderAction('download')">${icon('inbox')} ดาวน์โหลด</button>
                <button type="button" class="btn btn-sm btn-outline" onclick="customerFolderAction('share')">${icon('link')} แชร์</button>
                <button type="button" class="btn btn-sm btn-outline btn-danger-outline drive-tile-action-btn danger" onclick="deleteCustomerFolderFileIndex('${sel.key}', ${sel.idx})" title="ลบไฟล์">${icon('trash')}</button>
            </div>
        </div>
        <div class="fv-doc">${viewer}</div>`;
}

function customerFolderAction(action) {
    const c = customers.find(item => item.id === activeFolderCustomerId);
    const sel = activeCustomerFolderSel;
    if (!c || !sel) return;
    const fItem = getAttachments(c, sel.key)[sel.idx];
    if (!fItem) return;
    if (action === 'download') downloadAttachment(fItem.name, fItem.data || '');
    else shareAttachment(fItem.name, c.companyName, fItem.data || '');
}

function openCustomerFolderModal(customerId) {
    // เรียกซ้ำหลังแนบ/เปลี่ยนชื่อ/ลบไฟล์ (แฟ้มเดิมยังเปิดอยู่) → คงไฟล์ที่เลือกและคำค้นหาไว้
    const reopening = customerId === activeFolderCustomerId && !document.getElementById("customer-folder-modal").classList.contains("hidden");
    if (!reopening) activeCustomerFolderSel = null;
    activeFolderCustomerId = customerId;
    const c = customers.find(item => item.id === customerId);
    if (!c) return;

    document.getElementById("customer-folder-name").innerText = c.companyName || "ไม่ระบุชื่อบริษัท";
    const workerCount = allWorkers().filter(w => w.employerId === c.id && w.status !== 'deleted').length;
    document.getElementById("customer-folder-meta").innerText =
        `${isIndividualCustomer(c) ? 'บุคคลธรรมดา' : 'นิติบุคคล'} | เลขผู้เสียภาษี: ${c.taxId || '-'} | ผู้ประสานงาน: ${c.coordinator || '-'} | คนงาน ${workerCount} คน`;
    const searchInput = document.getElementById("search-customer-folder");
    if (searchInput && !reopening) searchInput.value = '';

    renderCustomerFolderTiles();
    document.getElementById("customer-folder-modal").classList.remove("hidden");
}

// ==================== GOOGLE-DRIVE-STYLE FOLDER GRID (shared by customer/worker folder modals) ====================
// สไตล์ตามแฟ้มเอกสารของ Google Drive: รูปภาพและ PDF โชว์ thumbnail จริง (หน้าแรกของ PDF เรนเดอร์ด้วย pdf.js)
// เป็นแค่ "ภาพนิ่ง" ของหน้าแรกเท่านั้น — ไม่ได้ฝัง viewer ของเอกสารจริงในกรอบเล็ก เพราะตัวอ่านเอกสารในเบราว์เซอร์
// มีแถบเลื่อนของตัวเองติดมาด้วยเสมอ ควบคุมให้หายขาดไม่ได้ 100% — คลิกที่ไฟล์เพื่อเปิดดูฉบับเต็มในแท็บใหม่ได้ตามปกติ ที่นั่นเลื่อนดูได้จริง
function renderDriveThumbnail(fileData) {
    if (!fileData) return `<div class="drive-tile-thumb">${icon("file")}</div>`;
    const isDefinitelyPdf = fileData.startsWith('data:application/pdf') || /\.pdf(\?|#|$)/i.test(fileData);
    if (isDefinitelyPdf) {
        // เรนเดอร์ภาพย่อหน้าแรกจริงแบบ async ทีหลัง (ดู hydratePdfThumbnails) — ใส่ไอคอนไว้ก่อนระหว่างรอ
        return `<div class="drive-tile-thumb" data-pdf-thumb="${fileData}">${icon("file")}</div>`;
    }
    // ไฟล์เก่าบางไฟล์ (อัปโหลดก่อนแก้บั๊กชื่อไฟล์ไม่มีนามสกุล) เดาชนิดจากนามสกุลไม่ได้ล่วงหน้า ทั้งที่อาจเป็นรูปหรือ PDF จริงก็ได้ —
    // Supabase Storage คืน Content-Type ถูกต้องเสมอไม่ว่าชื่อไฟล์จะมีนามสกุลหรือไม่ จึงลองโหลดเป็นรูปก่อนเสมอ
    // ถ้าโหลดไม่สำเร็จ (เพราะจริงๆ เป็น PDF) ค่อยลองเรนเดอร์เป็นภาพย่อ PDF แทนก่อนจะ fallback เป็นไอคอนจริงๆ
    return `<div class="drive-tile-thumb" data-fallback-url="${fileData}"><img src="${fileData}" alt="" loading="lazy" onerror="tryPdfThumbFallback(this)"></div>`;
}

// แคชภาพย่อหน้าแรกของ PDF ที่เรนเดอร์แล้ว (key = url) กันเรนเดอร์ซ้ำทุกครั้งที่เปิดแฟ้ม/พิมพ์ค้นหาในช่องเดิม
const pdfThumbCache = new Map();

async function renderPdfPageThumbnail(url) {
    if (pdfThumbCache.has(url)) return pdfThumbCache.get(url);
    if (!window.pdfjsLib) return null;
    let result = null;
    try {
        const pdf = await pdfjsLib.getDocument({ url }).promise;
        const page = await pdf.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = 160 / baseViewport.width; // ย่อให้พอดีกับกรอบ thumbnail (~160px)
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        result = canvas.toDataURL("image/jpeg", 0.8);
    } catch (e) {
        console.warn("renderPdfPageThumbnail failed:", url, e);
    }
    pdfThumbCache.set(url, result);
    return result;
}

// เรนเดอร์ภาพย่อ PDF ให้ช่อง thumbnail เดียวที่ระบุ (element ต้องมี data-pdf-thumb เป็น url ของไฟล์)
async function hydrateSinglePdfThumb(el) {
    const url = el.getAttribute('data-pdf-thumb');
    if (!url) return;
    const dataUrl = await renderPdfPageThumbnail(url);
    if (dataUrl) el.innerHTML = `<img src="${dataUrl}" alt="" loading="lazy">`;
    // เรนเดอร์ไม่สำเร็จ (ไฟล์เสีย/ไม่ใช่ PDF จริง) ปล่อยไอคอน 📄 เดิมไว้เป็น fallback
}

// หาช่อง PDF ที่ยังไม่เรนเดอร์ภาพย่อทั้งหมดในคอนเทนเนอร์ที่ระบุ แล้วเรนเดอร์ให้ทีละช่อง (async, ไม่บล็อกการวาดตารางไฟล์หลัก)
function hydratePdfThumbnails(containerEl) {
    if (!containerEl) return;
    containerEl.querySelectorAll('[data-pdf-thumb]').forEach(hydrateSinglePdfThumb);
}

// <img> โหลดไม่สำเร็จ (ไฟล์เก่าที่นามสกุลหายไปแต่จริงๆ เป็น PDF) — ลองเรนเดอร์เป็นภาพย่อ PDF แทนก่อน fallback เป็นไอคอน
function tryPdfThumbFallback(imgEl) {
    const container = imgEl.closest('.drive-tile-thumb');
    if (!container) return;
    const url = container.getAttribute('data-fallback-url') || '';
    container.innerHTML = '' + icon("file") + '';
    container.setAttribute('data-pdf-thumb', url);
    hydrateSinglePdfThumb(container);
}

// pasteTarget ("worker-folder:<ประเภท>" / "customer-folder:<ประเภท>") = ชี้เมาส์ที่ช่องนี้แล้วกด Ctrl+V วางภาพได้ (ดู findPasteTarget)
function renderDriveAddTile(label, triggerCall, pasteTarget = '', iconName = '', cameraCall = '') {
    return `
        <div class="drive-tile add-tile" onclick="${triggerCall}" ${pasteTarget ? `data-paste-target="${pasteTarget}"` : ''} title="แนบไฟล์: ${label}${pasteTarget ? ' — คลิกเลือกไฟล์ หรือชี้แล้วกด Ctrl+V วางภาพ' : ''}">
            <div class="add-tile-icon">${icon("plus")}</div>
            <div class="add-tile-label">${iconName ? icon(iconName) + ' ' : ''}${label}</div>
            ${cameraCall && isCameraDevice() ? cameraButtonHtml(cameraCall) : ''}
        </div>
    `;
}

function renderCustomerDriveTile(docInfo, fileItem, idx, entityName) {
    const data = fileItem.data || '';
    const safeName = (fileItem.name || '').replace(/'/g, "\\'");
    const safeEntityName = (entityName || '').replace(/'/g, "\\'");
    return `
        <div class="drive-tile">
            <a class="drive-tile-thumb-link" href="${data}" target="_blank" rel="noopener">${renderDriveThumbnail(data)}</a>
            <div class="drive-tile-body">
                <span class="drive-tile-category" title="${docInfo.label}">${icon(docInfo.icon)} ${docInfo.label}</span>
                <input type="text" class="drive-tile-name" value="${fileItem.name}" title="${fileItem.name}" onchange="renameCustomerFolderFileIndex('${docInfo.key}', ${idx}, this.value)">
            </div>
            <div class="drive-tile-actions">
                <button type="button" class="drive-tile-action-btn" onclick="downloadAttachment('${safeName}', '${data}')" title="ดาวน์โหลดไฟล์">${icon("inbox")}</button>
                <button type="button" class="drive-tile-action-btn" onclick="shareAttachment('${safeName}', '${safeEntityName}', '${data}')" title="แชร์ลิงก์">${icon("link")}</button>
                <button type="button" class="drive-tile-action-btn danger" onclick="deleteCustomerFolderFileIndex('${docInfo.key}', ${idx})" title="ลบไฟล์">${icon("trash")}</button>
            </div>
        </div>
    `;
}

async function renameCustomerFolderFileIndex(docType, index, newName) {
    if (!activeFolderCustomerId) return;
    const nameClean = newName.trim();
    if (!nameClean) {
        showToast("⚠️ กรุณาระบุชื่อไฟล์ให้ถูกต้อง", "warning");
        return;
    }

    const idx = customers.findIndex(x => x.id === activeFolderCustomerId);
    if (idx === -1) return;
    const c = customers[idx];
    const list = getAttachments(c, docType);
    if (!list[index]) return;
    list[index].name = nameClean;
    c.attachments = c.attachments || {};
    c.attachments[docType] = list;

    const res = await callCloudAPI("saveCustomer", { customerData: c });
    if (!res || res.status === "error") {
        showToast("❌ เปลี่ยนชื่อไฟล์ไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
        openCustomerFolderModal(activeFolderCustomerId);
        return;
    }
    saveData();
    showToast("✏️ เปลี่ยนชื่อไฟล์เรียบร้อยแล้ว!", "success");
    openCustomerFolderModal(activeFolderCustomerId);
}

function closeCustomerFolderModal() {
    document.getElementById("customer-folder-modal").classList.add("hidden");
}

function triggerCustomerFolderFileUpload(docType) {
    activeFolderCustomerDocType = docType;
    const fileInput = document.getElementById("customer-folder-upload-input");
    if (fileInput) {
        fileInput.value = "";
        fileInput.click();
    }
}

// แนบไฟล์ 1 ไฟล์เข้าแฟ้มเอกสารนายจ้าง/ลูกค้า 1 ราย (upload ขึ้น Supabase Storage แล้วผูกลิงก์เข้าข้อมูลลูกค้าทันที)
// เติมข้อมูลนายจ้างจากผลลัพธ์ AI OCR (บัตรประชาชนนายจ้าง / หนังสือรับรองบริษัท) — เติมเฉพาะฟิลด์ที่อ่านเจอจริงๆ
function applyOcrDataToCustomer(c, docType, p) {
    if (!p) return;
    if (docType === 'cust-id-card') {
        if (p.directorId && isIndividualCustomer(c)) c.taxId = p.directorId;
        else if (p.directorId) c.directorId = p.directorId;
        if (p.coordinatorName && !c.coordinator) c.coordinator = p.coordinatorName;
    } else if (docType === 'cust-cert' || docType === 'cust-commerce') {
        if (p.companyName) c.companyName = p.companyName;
        if (p.taxId) c.taxId = p.taxId;
    } else if (docType === 'cust-house') {
        if (p.companyName && !c.companyName) c.companyName = p.companyName;
    }
}

async function attachDocumentToCustomer(c, docType, fileContent) {
    const nameClean = (c.companyName || 'customer').replace(/\s+/g, '_');
    const currentList = getAttachments(c, docType);
    const suffix = currentList.length > 0 ? `_${currentList.length + 1}` : "";
    const fileName = `${nameClean}_${docType}${suffix}${extFromDataUrl(fileContent)}`;

    const uploadResult = await uploadDocumentFile(fileContent, fileName, c.id, "", docType);
    if (uploadResult && uploadResult.aiRejected) throw createAiRejectedError(uploadResult.ocrError);
    const storedUrl = uploadResult ? uploadResult.fileUrl : null;
    const serverUrl = storedUrl || await uploadFileToServer(fileContent, fileName);

    c.attachments = c.attachments || {};
    c.attachments[docType] = currentList;
    c.attachments[docType].push({ name: fileName, data: serverUrl || fileContent });

    if (uploadResult && uploadResult.parsedData) {
        applyOcrDataToCustomer(c, docType, uploadResult.parsedData);
    }

    const saveRes = await callCloudAPI("saveCustomer", { customerData: c });
    if (!saveRes || saveRes.status === "error") throw new Error(saveRes && saveRes.message ? saveRes.message : "บันทึกไม่สำเร็จ");
    return uploadResult;
}

// แนบไฟล์เข้าแฟ้มเอกสารนายจ้าง/ลูกค้า — แนบได้หลายไฟล์พร้อมกันในครั้งเดียว
async function handleCustomerFolderFileUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !activeFolderCustomerId || !activeFolderCustomerDocType) return;

    showToast(`📤 กำลังอัปโหลดไฟล์ ${files.length} ไฟล์...`, "warning");

    let failCount = 0;
    let anyAiRead = false;
    let aiRejectedCount = 0; // AI อ่านไม่สำเร็จ = ไม่ได้บันทึกไฟล์ (ต้องแนบใหม่)
    let needsManualEntry = false; // มีไฟล์ที่ผู้ใช้เลือก "บันทึกไฟล์ กรอกเอง"
    beginAiRejectedBatch();
    for (const file of files) {
        const idx = customers.findIndex(x => x.id === activeFolderCustomerId);
        if (idx === -1) break;
        const c = customers[idx];
        try {
            const fileContent = await readFileAsDataUrl(file);
            const uploadResult = await attachDocumentToCustomer(c, activeFolderCustomerDocType, fileContent);
            if (uploadResult && uploadResult.parsedData) anyAiRead = true;
            if (uploadResult && uploadResult.manualEntry) needsManualEntry = true;
        } catch (err) {
            console.error("attachDocumentToCustomer failed:", err);
            if (err && err.aiRejected) aiRejectedCount++; else failCount++;
        }
    }

    endAiRejectedBatch();
    if (anyAiRead) showToast("✨ AI อ่านข้อมูลจากเอกสารและอัปเดตข้อมูลนายจ้างให้อัตโนมัติแล้ว กรุณาตรวจสอบความถูกต้องอีกครั้ง", "success");
    if (aiRejectedCount > 0) showToast(`⚠️ AI อ่านไม่สำเร็จ ${aiRejectedCount} จาก ${files.length} ไฟล์ — ไฟล์เหล่านี้ยังไม่ได้บันทึก กรุณาแนบใหม่อีกครั้งในอีกสักครู่`, "warning");
    if (failCount > 0) showToast(`❌ อัปโหลดไม่สำเร็จ ${failCount} จาก ${files.length} ไฟล์`, "danger");
    else if (aiRejectedCount === 0) showToast("✅ อัปโหลดไฟล์และอัปเดตแฟ้มเอกสารสำเร็จ!", "success");

    saveData();
    renderCustomers();
    // เลือก "บันทึกไฟล์ กรอกเอง" ไว้ -> เปิดฟอร์มแก้ไขนายจ้างรายนี้แล้วพาไปช่องที่ต้องกรอกเลย แทนการกลับไปหน้าแฟ้มเอกสาร
    if (needsManualEntry) openManualEntryForm('customer', activeFolderCustomerId, activeFolderCustomerDocType);
    else openCustomerFolderModal(activeFolderCustomerId);
}

// ==================== CONFIRM-DELETE MODAL สำหรับไฟล์แนบ (ใช้ร่วมกันทั้งแฟ้มคนงาน/นายจ้าง) ====================
// โชว์ชื่อไฟล์ + พรีวิว + ลิงก์เปิดดูก่อนลบจริง (แทนที่ confirm() เดิมที่บอกแค่ "แน่ใจไหม" ไม่รู้ว่าไฟล์ไหน)
// เพราะตอนนี้กดลบแล้วไฟล์จริงใน Storage จะหายไปถาวร กู้คืนไม่ได้ (เดิมลบได้แค่ reference)
let pendingAttachmentDelete = null; // { kind: 'worker'|'customer', docType, index }

function openConfirmDeleteAttachmentModal(kind, docType, index, fileItem) {
    pendingAttachmentDelete = { kind, docType, index };
    document.getElementById('confirm-delete-attachment-filename').innerText = (fileItem && fileItem.name) || 'ไฟล์ไม่มีชื่อ';
    document.getElementById('confirm-delete-attachment-viewlink').href = (fileItem && fileItem.data) || '#';
    document.getElementById('confirm-delete-attachment-thumb').innerHTML = renderDriveThumbnail(fileItem && fileItem.data);
    hydratePdfThumbnails(document.getElementById('confirm-delete-attachment-modal'));
    document.getElementById('confirm-delete-attachment-modal').classList.remove('hidden');
}

function closeConfirmDeleteAttachmentModal() {
    pendingAttachmentDelete = null;
    document.getElementById('confirm-delete-attachment-modal').classList.add('hidden');
}

async function confirmPendingAttachmentDelete() {
    if (!pendingAttachmentDelete) return;
    const { kind, docType, index } = pendingAttachmentDelete;
    closeConfirmDeleteAttachmentModal();
    if (kind === 'worker') await performDeleteWorkerFolderFile(docType, index);
    else await performDeleteCustomerFolderFile(docType, index);
}

// เรียกตอนกดปุ่ม 🗑️ ในการ์ดไฟล์ — แค่เปิด modal ให้ดูว่ากำลังจะลบไฟล์ไหน ยังไม่ลบจริง (ดู performDeleteCustomerFolderFile)
function deleteCustomerFolderFileIndex(docType, index) {
    if (!activeFolderCustomerId) return;
    const c = customers.find(x => x.id === activeFolderCustomerId);
    const list = c ? getAttachments(c, docType) : [];
    openConfirmDeleteAttachmentModal('customer', docType, index, list[index]);
}

function performDeleteCustomerFolderFile(docType, index) {
    const idx = customers.findIndex(x => x.id === activeFolderCustomerId);
    if (idx === -1) return;
    const c = customers[idx];
    const list = getAttachments(c, docType);
    const removed = list.splice(index, 1)[0];

    c.attachments = c.attachments || {};
    if (list.length === 0) delete c.attachments[docType];
    else c.attachments[docType] = list;

    callCloudAPI("saveCustomer", { customerData: c }).then(res => {
        if (!res || res.status === "error") {
            showToast("❌ ลบไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
            return;
        }
        saveData();
        if (removed) deleteStorageFileByUrl(removed.data);
        showToast("🗑️ ลบไฟล์ออกจากแฟ้มเอกสารเรียบร้อยแล้ว", "success");
        openCustomerFolderModal(activeFolderCustomerId);
        renderCustomers();
    });
}

// สร้าง/นำลิงก์แชร์ "ทั้งโฟลเดอร์" ของนายจ้าง/ลูกค้า 1 รายมาคัดลอก — เปิดดูได้โดยไม่ต้องล็อกอินเข้า WorkerOS
// (ใช้ share_token สุ่มผูกกับลูกค้ารายนั้น ผ่าน edge function share-customer-docs — ดู share-customer.html)
// คู่เดียวกับ shareWorkerFolder ของฝั่งคนงาน
async function shareCustomerFolder(customerId) {
    const c = customers.find(item => item.id === customerId);
    if (!c) return;

    let token = c.shareToken;
    if (!token) {
        token = crypto.randomUUID();
        c.shareToken = token;
        const res = await callCloudAPI("saveCustomer", { customerData: c });
        if (!res || res.status === "error") {
            showToast("ไม่สามารถสร้างลิงก์แชร์ได้: " + (res && res.message ? res.message : "unknown error"), "error");
            return;
        }
        saveData();
    }

    const link = new URL(`share-customer.html?c=${encodeURIComponent(customerId)}&t=${encodeURIComponent(token)}`, location.href).toString();
    navigator.clipboard.writeText(link).then(() => {
        showToast(`📋 คัดลอกลิงก์แชร์ทั้งโฟลเดอร์ของ ${c.companyName} เรียบร้อยแล้ว! ส่งให้ลูกค้าได้เลย ไม่ต้องล็อกอิน`, "success");
    }).catch(err => {
        uiAlert("ไม่สามารถคัดลอกได้: " + err);
    });
}

// ยกเลิกลิงก์แชร์เดิม (ลิงก์ที่เคยส่งไปแล้วจะใช้ไม่ได้อีก — ต้องกด "สร้างลิงก์แชร์" ใหม่ถ้าต้องการอันใหม่)
async function revokeCustomerShareLink(customerId) {
    const c = customers.find(item => item.id === customerId);
    if (!c || !c.shareToken) return;
    if (!(await uiConfirm(`ยกเลิกลิงก์แชร์ของ ${c.companyName}? ลิงก์เดิมที่เคยส่งให้ลูกค้าจะเปิดไม่ได้อีก`, { okText: "ยกเลิกลิงก์", card: dialogCardForCustomer(c) }))) return;

    c.shareToken = null;
    const res = await callCloudAPI("saveCustomer", { customerData: c });
    if (!res || res.status === "error") {
        showToast("ไม่สามารถยกเลิกลิงก์ได้: " + (res && res.message ? res.message : "unknown error"), "error");
        return;
    }
    saveData();
    showToast("🚫 ยกเลิกลิงก์แชร์เรียบร้อยแล้ว", "success");
}

// ==================== ATTACHMENT DOWNLOADS & SHARING HELPERS ====================
function filterWorkersByEmployer(employerId) {
    switchView('workers');
    const selectEmp = document.getElementById("filter-worker-employer");
    if (selectEmp) {
        selectEmp.value = "";
        const searchWorker = document.getElementById("search-worker");
        const empRec = customers.find(c => c.id === employerId);
        if (searchWorker) searchWorker.value = empRec ? empRec.companyName : "";
    }
    const selectStatus = document.getElementById("filter-worker-employment-status");
    if (selectStatus) {
        selectStatus.value = "all"; // ทุกคนที่ยังไม่พ้นสภาพ (ปกติ + รอขึ้นทะเบียน) — คนพ้นสภาพดูได้จากตัวกรอง "เฉพาะแจ้งออก/พ้นสภาพ"
    }
    renderWorkers();
}

function downloadAttachment(fileName, dataUrl = null) {
    if (!dataUrl) {
        showToast("❌ ไม่พบไฟล์เอกสารนี้ในระบบ (อาจอัปโหลดไม่สำเร็จ)", "danger");
        return;
    }

    if (dataUrl.startsWith("data:")) {
        // Legacy: ไฟล์เก่าที่ยังเก็บเป็น base64 data URL ตรงๆ (ไม่ได้อัปโหลดขึ้น Supabase Storage)
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(`📥 ดาวน์โหลดเอกสาร: ${fileName} เรียบร้อยแล้ว`, 'success');
        return;
    }

    // ไฟล์จริงบน Supabase Storage (public bucket) — เปิดลิงก์ตรงๆ ให้เบราว์เซอร์จัดการดาวน์โหลด/แสดงผลเอง
    window.open(dataUrl, '_blank');
}

function shareAttachment(fileName, entityName, fileUrl = null) {
    if (!fileUrl) {
        uiAlert("ยังไม่มีลิงก์เอกสารนี้ (ไฟล์อาจอัปโหลดไม่สำเร็จ หรือเป็นไฟล์เก่าที่ยังไม่ได้ย้ายขึ้น Supabase Storage)");
        return;
    }

    const shareText = `เอกสารของ: ${entityName}\nไฟล์: ${fileName}\nลิงก์ดาวน์โหลด: ${fileUrl}`;

    navigator.clipboard.writeText(shareText).then(() => {
        showToast("📋 คัดลอกลิงก์เอกสารเรียบร้อยแล้ว! วางส่งให้ลูกค้าทาง Line/Email ได้เลย (เปิดลิงก์ดาวน์โหลดได้ทันทีโดยไม่ต้องล็อกอิน)", "success");
    }).catch(err => {
        uiAlert("ไม่สามารถคัดลอกได้: " + err);
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

    const monthNamesTh = MONTH_NAMES_TH;

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
            custUl.innerHTML = '<li class="text-muted" style="font-size:13.5px; text-align:center; padding:10px;">' + icon("bad") + ' ไม่มีนายจ้างลงทะเบียนใหม่ในเดือนนี้</li>';
        } else {
            custUl.innerHTML = matchingCustomers.map(c => `
                <li style="font-size:13.5px; padding: 6px 10px; background-color: #ffffff; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                    <span>${icon("building")} <strong>${c.companyName}</strong> (${c.businessType})</span>
                    <span style="font-size:12px; color:var(--text-muted);">${formatDateOnly(c.createdAt)}</span>
                </li>
            `).join('');
        }
    }

    if (workUl) {
        if (matchingWorkers.length === 0) {
            workUl.innerHTML = '<li class="text-muted" style="font-size:13.5px; text-align:center; padding:10px;">' + icon("bad") + ' ไม่มีคนงานขึ้นทะเบียนใหม่ในเดือนนี้</li>';
        } else {
            workUl.innerHTML = matchingWorkers.map(w => {
                const emp = customers.find(c => c.id === w.employerId);
                const empName = emp ? emp.companyName : "ไม่ระบุนายจ้าง";
                return `
                    <li style="font-size:13.5px; padding: 6px 10px; background-color: #ffffff; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; display:flex; flex-direction:column; gap:4px;">
                        <div style="display:flex; justify-content:space-between;">
                            <strong>${icon("user")} ${w.firstName} ${w.lastName} (${w.nationality})</strong>
                            <span style="font-size:12px; color:var(--text-muted);">${formatDateOnly(w.createdAt)}</span>
                        </div>
                        <div style="font-size:12px; color:var(--text-muted);">
                            เลขประจำตัว: ${w.workerUid || '-'} | นายจ้าง: ${empName}
                        </div>
                    </li>
                `;
            }).join('');
        }
    }
}

// ==================== FINANCE AND ACCOUNTING STATS ====================
function isJobPaid(j) {
    return !!(j && j.paymentStatus === 'ชำระเงินแล้ว');
}

function getJobPaymentMethod(j) {
    if (!isJobPaid(j)) return null;
    return j.paymentMethod || "ไม่ระบุบัญชี";
}

// สร้างตัวเลือกช่วงเวลา (ปี/เดือน) จากวันที่เปิดงานจริงของ jobs และวันที่ของ expenses ทั้งหมด — คงค่าที่เลือกไว้เดิม
function populateFinancePeriodSelect() {
    const select = document.getElementById("db-finance-period-select");
    if (!select) return "";
    const currentSelection = select.value;

    const months = new Set();
    const years = new Set();
    const addPeriod = (dateStr) => {
        const [year, month] = (dateStr || "").split('-');
        if (year && month) {
            months.add(`${year}-${month}`);
            years.add(year);
        }
    };
    jobs.forEach(j => addPeriod((j.createdAt || j.updatedAt || "").split('T')[0]));
    expenses.forEach(x => addPeriod(x.expenseDate));
    payments.forEach(p => addPeriod(p.paidDate));
    receipts.forEach(r => addPeriod(r.paidDate));
    invoices.forEach(i => addPeriod(i.issueDate));

    const yearOptions = Array.from(years).sort().reverse()
        .map(y => `<option value="${y}">ปี ${parseInt(y) + 543} (ทั้งปี)</option>`).join('');
    const monthOptions = Array.from(months).sort().reverse()
        .map(k => {
            const [y, m] = k.split('-');
            return `<option value="${k}">${MONTH_NAMES_TH[m] || m} ${parseInt(y) + 543}</option>`;
        }).join('');

    select.innerHTML = `<option value="">ทั้งหมด (All Time)</option>${yearOptions}${monthOptions}`;
    select.value = currentSelection;
    return select.value;
}

// กรอง jobs ตามช่วงเวลาที่เลือก — periodValue เป็น "" (ทั้งหมด), "YYYY" (ทั้งปี), หรือ "YYYY-MM" (รายเดือน)
function getFinancePeriodFilteredJobs(periodValue) {
    if (!periodValue) return jobs;
    return jobs.filter(j => {
        const dateStr = (j.createdAt || j.updatedAt || "").split('T')[0];
        return dateStr.startsWith(periodValue);
    });
}

// กรอง expenses ตามช่วงเวลาเดียวกันกับตัวกรองฝั่งรายรับ (ใช้ periodValue รูปแบบเดียวกัน)
function getFinancePeriodFilteredExpenses(periodValue) {
    if (!periodValue) return expenses;
    return expenses.filter(x => (x.expenseDate || "").startsWith(periodValue));
}

function renderFinanceStats() {
    const periodValue = populateFinancePeriodSelect();
    const periodJobs = getFinancePeriodFilteredJobs(periodValue);
    const periodExpenses = getFinancePeriodFilteredExpenses(periodValue);

    // 1. Calculations — รายรับนับตาม "วันที่รับเงินจริง" (payments.paidDate) ไม่ใช่วันเปิดงาน
    //    ยอดบิล/ค้างรับ นับจากบิลที่ออกในช่วงนี้ (ไม่รวมบิลที่ยกเลิก) + ใบงานในช่วงนี้ที่ยังไม่ออกบิล (ราคาประมาณ)
    const inPeriod = (d) => !periodValue || (d || '').startsWith(periodValue);
    const periodPayments = payments.filter(p => !p.voided && inPeriod(p.paidDate));
    const periodInvoices = invoices.filter(i => i.status !== 'void' && inPeriod(i.issueDate));
    const unbilledJobs = periodJobs.filter(jobAwaitingBill);
    const unbilledAmount = unbilledJobs.reduce((s, j) => s + jobEstimatedFee(j), 0);

    const totalRevenue = periodInvoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0) + unbilledAmount;
    const paidRevenue = periodPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const unpaidRevenue = periodInvoices.reduce((s, i) => s + invoiceBalance(i), 0) + unbilledAmount;

    const totalExpenses = periodExpenses.reduce((sum, x) => sum + (x.amount || 0), 0);
    const netProfit = paidRevenue - totalExpenses;

    // Update stats cards
    document.getElementById("stat-finance-total").innerText = totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + " บาท";
    document.getElementById("stat-finance-paid").innerText = paidRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + " บาท";
    document.getElementById("stat-finance-unpaid").innerText = unpaidRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + " บาท";
    document.getElementById("stat-finance-expenses").innerText = totalExpenses.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + " บาท";
    const netProfitEl = document.getElementById("stat-finance-net-profit");
    netProfitEl.innerText = netProfit.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + " บาท";
    netProfitEl.style.color = netProfit < 0 ? "var(--danger)" : "var(--dk-ok, #1f7a50)";

    // บัตร Wallet: ชื่อช่วงเวลา + แถบ "เก็บเงินได้กี่ %" (รับจริงในช่วงนี้ ÷ ยอดบิลช่วงนี้ — อาจรวมเงินของบิลเก่า จึงตัดที่ 100%)
    const periodSelect = document.getElementById("db-finance-period-select");
    const periodLabelEl = document.getElementById("stat-finance-period-label");
    if (periodLabelEl && periodSelect) {
        const opt = periodSelect.options[periodSelect.selectedIndex];
        periodLabelEl.innerText = opt ? opt.text : "ทั้งหมด";
    }
    const collectPct = totalRevenue > 0 ? Math.min(100, (paidRevenue / totalRevenue) * 100) : 0;
    const collectBar = document.getElementById("stat-finance-collect-bar");
    if (collectBar) collectBar.style.width = collectPct.toFixed(1) + "%";
    const collectPctEl = document.getElementById("stat-finance-collect-pct");
    if (collectPctEl) collectPctEl.innerText = `เก็บเงินได้ ${collectPct < 10 && collectPct > 0 ? collectPct.toFixed(1) : Math.round(collectPct)}%`;

    // ข้อมูลที่ควรรู้เพิ่ม: บิลเกินกำหนด (ณ วันนี้), งานยังไม่ออกบิล (ช่วงนี้), มัดจำ/เครดิตลูกค้าคงเหลือ (ณ วันนี้)
    const overdue = overdueInvoices();
    const overdueFinEl = document.getElementById("stat-finance-overdue");
    if (overdueFinEl) {
        const overdueSum = overdue.reduce((s, i) => s + invoiceBalance(i), 0);
        overdueFinEl.innerText = overdue.length ? `${overdue.length} ใบ · ${fmtMoney(overdueSum)}` : "0";
    }
    const unbilledEl = document.getElementById("stat-finance-unbilled");
    if (unbilledEl) unbilledEl.innerText = unbilledJobs.length ? `${unbilledJobs.length} งาน · ${fmtMoney(unbilledAmount)}` : "0";
    const creditEl = document.getElementById("stat-finance-credit");
    if (creditEl) creditEl.innerText = fmtMoney(customers.reduce((s, c) => s + customerCredit(c.id), 0));

    renderFinanceInternalSplit(periodPayments, periodExpenses);
    renderReceivablesAging();

    // 2. Bank & Cash account summaries — จากเงินเข้าจริงในช่วงนี้ (รวมมัดจำ) แยกตามบัญชีที่รับ
    const accountsGrid = document.getElementById("db-finance-accounts-grid");
    if (accountsGrid) {
        let cashSum = 0;
        const bankSums = {};
        banks.forEach(b => { bankSums[b.bankName] = 0; });
        let unspecifiedSum = 0;

        moneyInEntries().filter(p => inPeriod(p.paidDate)).forEach(p => {
            const amount = Number(p.amount) || 0;
            if (p.method === 'cash') { cashSum += amount; return; }
            const b = banks.find(x => x.id === p.bankId);
            if (b) bankSums[b.bankName] = (bankSums[b.bankName] || 0) + amount;
            else unspecifiedSum += amount;
        });

        let accountsHtml = "";
        
        // Cash Account
        accountsHtml += `
            <div class="stats-card" style="border-left: 4px solid #10b981; background: #ffffff; padding: 12px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px;">
                <div style="font-size: 24px;">${icon("cash")}</div>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 11.5px; color: #64748b; font-weight: 500;">เงินสด (Cash)</span>
                    <strong style="font-size: 14px; color: #0f172a; margin-top: 2px;">${cashSum.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.</strong>
                </div>
            </div>
        `;

        // Bank Accounts
        Object.entries(bankSums).forEach(([bankName, sum]) => {
            const meta = getBankMeta(bankName);
            accountsHtml += `
                <div class="stats-card" style="border-left: 4px solid ${meta.color}; background: #ffffff; padding: 12px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px;">
                    ${renderBankLogoBadge(bankName, 28)}
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 11.5px; color: #64748b; font-weight: 500; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 120px;" title="${bankName}">${bankName}</span>
                        <strong style="font-size: 14px; color: #0f172a; margin-top: 2px;">${sum.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.</strong>
                    </div>
                </div>
            `;
        });

        // Unspecified Card
        if (unspecifiedSum > 0) {
            accountsHtml += `
                <div class="stats-card" style="border-left: 4px solid #94a3b8; background: #ffffff; padding: 12px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 24px;">${icon("edit")}</div>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 11.5px; color: #64748b; font-weight: 500;">บัญชีธนาคาร (ไม่ระบุ)</span>
                        <strong style="font-size: 14px; color: #0f172a; margin-top: 2px;">${unspecifiedSum.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.</strong>
                    </div>
                </div>
            `;
        }

        accountsGrid.innerHTML = accountsHtml;

        // Pie chart: revenue by account, colored using each bank's actual brand color
        const accountEntries = [{ name: "เงินสด (Cash)", value: cashSum, color: "#10b981" }];
        Object.entries(bankSums).forEach(([bankName, sum]) => {
            accountEntries.push({ name: bankName, value: sum, color: getBankMeta(bankName).color });
        });
        if (unspecifiedSum > 0) accountEntries.push({ name: "บัญชีธนาคาร (ไม่ระบุ)", value: unspecifiedSum, color: "#94a3b8" });
        renderPieChartInto("db-finance-accounts-chart", accountEntries);
    }

    // 3. Revenue by Job Type
    const jobTypeStats = {};
    periodJobs.forEach(j => {
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
                        ${icon("bad")} ไม่มีข้อมูลประเภทงานในระบบ
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
    renderPieChartInto("db-finance-jobtypes-chart", Object.entries(jobTypeStats).map(([name, stat]) => ({ name, value: stat.revenue })));

    // Top highlight: บริการขายดีที่สุด (by count) และบริการทำรายได้สูงสุด (by revenue)
    const topByCountEl = document.getElementById("stat-top-jobtype-count");
    const topByRevenueEl = document.getElementById("stat-top-jobtype-revenue");
    const jobTypeEntries = Object.entries(jobTypeStats);
    if (topByCountEl) {
        const top = jobTypeEntries.slice().sort((a, b) => b[1].count - a[1].count)[0];
        topByCountEl.innerText = top ? `${top[0]} (${top[1].count} งาน)` : "-";
    }
    if (topByRevenueEl) {
        const top = jobTypeEntries.slice().sort((a, b) => b[1].revenue - a[1].revenue)[0];
        topByRevenueEl.innerText = top && top[1].revenue > 0 ? `${top[0]} (${top[1].revenue.toLocaleString('th-TH')} บ.)` : "-";
    }

    // 4. Revenue & Outstanding by Customer
    const custStats = customers.map(c => {
        const custInvoices = periodInvoices.filter(i => i.customerId === c.id);
        const custUnbilled = unbilledJobs.filter(j => j.customerId === c.id);
        const unbilled = custUnbilled.reduce((s, j) => s + jobEstimatedFee(j), 0);
        const total = custInvoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0) + unbilled;
        const paid = custInvoices.reduce((s, i) => s + invoicePaidAmount(i), 0);
        const unpaid = custInvoices.reduce((s, i) => s + invoiceBalance(i), 0) + unbilled;
        return {
            customer: c,
            total: total,
            paid: paid,
            unpaid: unpaid,
            jobCount: periodJobs.filter(j => j.customerId === c.id).length
        };
    }).filter(item => item.total > 0)
      .sort((a, b) => b.unpaid - a.unpaid || b.total - a.total);

    const custTbody = document.getElementById("db-finance-customers-tbody");
    if (custTbody) {
        if (custStats.length === 0) {
            custTbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-muted" style="text-align: center; padding: 25px;">
                        ${icon("bad")} ไม่มีข้อมูลลูกค้าผู้ว่าจ้างในระบบ
                    </td>
                </tr>
            `;
        } else {
            custTbody.innerHTML = custStats.map(item => {
                let actionBtn = "";
                if (item.unpaid > 0) {
                    actionBtn = `
                        <button class="btn btn-sm btn-gold" onclick="quickCombineInvoice('${item.customer.id}')" style="font-size: 11.5px; padding: 4px 10px;">
                            ${icon("receipt")} รวมบิลเพื่อเก็บเงิน
                        </button>
                    `;
                } else {
                    actionBtn = `<span class="badge badge-success" style="font-size: 11.5px; padding: 2px 8px;">${icon("ok")} ครบถ้วน</span>`;
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
    renderPieChartInto("db-finance-customers-chart", custStats.map(item => ({ name: item.customer.companyName, value: item.paid })));

    // Top highlight: ลูกค้าที่ทำรายได้ (ชำระเงินแล้ว) ให้มากที่สุด
    const topCustomerEl = document.getElementById("stat-top-customer");
    if (topCustomerEl) {
        const top = custStats.slice().sort((a, b) => b.paid - a.paid)[0];
        topCustomerEl.innerText = top && top.paid > 0 ? `${top.customer.companyName} (${top.paid.toLocaleString('th-TH')} บ.)` : "-";
    }

    // 5. Render payment status breakdown bars
    const payStatusEl = document.getElementById("db-finance-payment-breakdown-container");
    if (payStatusEl) {
        const totalJobs = periodJobs.length;
        if (totalJobs === 0) {
            payStatusEl.innerHTML = '<p class="text-muted">ไม่มีข้อมูลงานจ้าง</p>';
        } else {
            const paidJobs = periodJobs.filter(isJobPaid).length;
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
        const totalJobs = periodJobs.length;
        if (totalJobs === 0) {
            progressEl.innerHTML = '<p class="text-muted">ไม่มีข้อมูลงานจ้าง</p>';
        } else {
            const statusCounts = {};
            periodJobs.forEach(j => {
                statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
            });

            progressEl.innerHTML = Object.entries(statusCounts).map(([status, count]) => {
                const pct = Math.round((count / totalJobs) * 100);
                let color = "var(--navy-medium)";
                if (status === "ปิดงานแล้ว") color = "var(--success)";
                if (status === "รอดำเนินการ") color = "var(--text-muted)";
                if (status === "กำลังดำเนินการ") color = "var(--navy-light)";
                
                return `
                    <div class="chart-bar-item" style="margin-bottom: 8px;">
                        <div class="bar-info" style="font-size: 12px;">
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

    // 7. Expenses by Category
    const expenseCatStats = {};
    periodExpenses.forEach(x => {
        const name = x.category || "ไม่ระบุหมวดหมู่";
        if (!expenseCatStats[name]) expenseCatStats[name] = { count: 0, total: 0 };
        expenseCatStats[name].count++;
        expenseCatStats[name].total += x.amount || 0;
    });

    const expenseCatTbody = document.getElementById("db-finance-expensecat-tbody");
    if (expenseCatTbody) {
        const sortedCats = Object.entries(expenseCatStats).sort((a, b) => b[1].total - a[1].total);
        if (sortedCats.length === 0) {
            expenseCatTbody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-muted" style="text-align: center; padding: 25px;">
                        ${icon("bad")} ยังไม่มีข้อมูลรายจ่ายในระบบ
                    </td>
                </tr>
            `;
        } else {
            expenseCatTbody.innerHTML = sortedCats.map(([name, stat]) => `
                <tr>
                    <td><strong>${name}</strong></td>
                    <td style="text-align: center; font-weight: 500;">${stat.count} รายการ</td>
                    <td style="text-align: right; font-weight: 600; color: var(--danger);">${stat.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</td>
                </tr>
            `).join('');
        }
    }
    renderPieChartInto("db-finance-expensecat-chart", Object.entries(expenseCatStats).map(([name, stat]) => ({ name, value: stat.total })));
}

// ==================== COMPLETED JOBS SUMMARY (MONTHLY + BY TYPE) ====================
function renderCompletedJobsStats() {
    const employerSelect = document.getElementById("db-completed-select-employer");
    if (!employerSelect) return;

    // Populate employer options (preserve current selection across re-renders)
    const currentSelection = employerSelect.value;
    const sortedCustomers = [...customers].sort((a, b) =>
        (a.companyName || "").localeCompare(b.companyName || "", 'th')
    );
    employerSelect.innerHTML = '<option value="">ภาพรวมทั้งหมด (ทุกนายจ้าง)</option>' +
        sortedCustomers.map(c => `<option value="${c.id}">${c.companyName}</option>`).join('');
    employerSelect.value = currentSelection;
    const selectedEmployerId = employerSelect.value;

    // Populate agent options (preserve current selection across re-renders)
    const agentSelect = document.getElementById("db-completed-select-agent");
    let selectedAgentId = "";
    if (agentSelect) {
        const currentAgentSelection = agentSelect.value;
        const sortedAgents = [...agents].sort((a, b) => (a.name || "").localeCompare(b.name || "", 'th'));
        agentSelect.innerHTML = '<option value="">ทุก Agent (ไม่กรอง)</option>' +
            sortedAgents.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
        agentSelect.value = currentAgentSelection;
        selectedAgentId = agentSelect.value;
    }

    // Only closed/successful jobs, optionally scoped to one employer and/or one agent's referred customers
    let completedJobs = jobs.filter(j => j.status === 'ปิดงานแล้ว');
    if (selectedEmployerId) {
        completedJobs = completedJobs.filter(j => j.customerId === selectedEmployerId);
    }
    if (selectedAgentId) {
        const referredCustomerIds = new Set(
            customers.filter(c => c.referredByAgentId === selectedAgentId).map(c => c.id)
        );
        completedJobs = completedJobs.filter(j => referredCustomerIds.has(j.customerId));
    }

    const totalEl = document.getElementById("stat-completed-total");
    if (totalEl) totalEl.innerText = completedJobs.length;

    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthCount = completedJobs.filter(j => (j.closedAt || "").startsWith(thisMonthKey)).length;
    const thisMonthEl = document.getElementById("stat-completed-this-month");
    if (thisMonthEl) thisMonthEl.innerText = thisMonthCount;

    const monthNamesTh = MONTH_NAMES_TH;
    const noDataMsg = `${icon("bad")} ยังไม่มีงานที่แจ้งสำเร็จ${selectedEmployerId ? "ของนายจ้างรายนี้" : ""}${selectedAgentId ? "ของลูกค้าที่ Agent รายนี้แนะนำมา" : ""}`;

    // Monthly breakdown (grouped by closedAt year-month)
    const monthlyCounts = {};
    completedJobs.forEach(j => {
        const dateStr = (j.closedAt || "").split('T')[0];
        const [year, month] = dateStr.split('-');
        if (!year || !month) return;
        const key = `${year}-${month}`;
        monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
    });
    const monthKeys = Object.keys(monthlyCounts).sort().reverse();

    const monthlyTbody = document.getElementById("db-completed-monthly-tbody");
    if (monthlyTbody) {
        monthlyTbody.innerHTML = monthKeys.length === 0
            ? `<tr><td colspan="2" class="text-muted" style="text-align:center; padding:20px;">${noDataMsg}</td></tr>`
            : monthKeys.map(k => {
                const [year, month] = k.split('-');
                const monthLabel = `${monthNamesTh[month] || month} ${parseInt(year) + 543}`;
                return `
                    <tr>
                        <td><strong>${monthLabel}</strong></td>
                        <td style="text-align: center; font-weight: 600; color: var(--success);">${monthlyCounts[k]} งาน</td>
                    </tr>
                `;
            }).join('');
    }

    // Breakdown by job type/category
    const typeCounts = {};
    completedJobs.forEach(j => {
        const name = getCleanJobTypeName(j.jobType) || "ไม่ระบุประเภทงาน";
        typeCounts[name] = (typeCounts[name] || 0) + 1;
    });
    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

    const typeTbody = document.getElementById("db-completed-jobtype-tbody");
    if (typeTbody) {
        typeTbody.innerHTML = sortedTypes.length === 0
            ? `<tr><td colspan="2" class="text-muted" style="text-align:center; padding:20px;">${noDataMsg}</td></tr>`
            : sortedTypes.map(([name, count]) => `
                <tr>
                    <td><strong>${name}</strong></td>
                    <td style="text-align: center; font-weight: 600; color: var(--success);">${count} งาน</td>
                </tr>
            `).join('');
    }
}

function quickCombineInvoice(customerId) {
    switchView('jobs');
    openCombineBillsModal();
    const select = document.getElementById("combine-cust-select");
    if (select) {
        select.value = customerId;
        const cust = customers.find(c => c.id === customerId);
        const search = document.getElementById("combine-cust-search");
        if (search) search.value = cust ? cust.companyName : '';
        onCombineCustomerChange();
    }
}

// ==================== WORKER PHOTO PROCESSING & BACKGROUND REMOVAL ====================
// ลบรูปถ่ายคนงานที่แนบไว้ (ปุ่ม × มุมขวาบนวงกลม — โผล่เฉพาะตอนมีรูปแล้ว) คืนกลับไปเป็นไอคอนเปล่า
// และลบไฟล์จริงใน Storage ด้วย (ไม่ใช่แค่ล้าง preview) ต้องกด "บันทึกข้อมูล" อีกครั้งเพื่อให้ตัดออกจากคนงานจริง
async function removeWorkerPhoto(event) {
    if (event) event.stopPropagation();
    const preview = document.getElementById("worker-photo-preview");
    const icon = document.getElementById("worker-photo-icon");
    if (!preview || preview.classList.contains("hidden")) return;
    const photoOwner = [document.getElementById("worker-title")?.value, document.getElementById("worker-first-name")?.value, document.getElementById("worker-last-name")?.value].filter(Boolean).join(" ");
    if (!(await uiConfirm("ต้องการลบรูปถ่ายคนงานนี้หรือไม่?", { card: { image: preview.src, imageIcon: "user", title: photoOwner || "คนงานในฟอร์มนี้", subtitle: "รูปถ่ายนี้จะถูกลบออก" } }))) return;

    const oldUrl = preview.src;
    preview.src = "";
    preview.classList.add("hidden");
    if (icon) icon.classList.remove("hidden");
    document.getElementById("worker-photo-input").value = "";

    deleteStorageFileByUrl(oldUrl);
}

// แนบรูปถ่ายคนงานแบบธรรมดา — ใช้ไฟล์ต้นฉบับตามที่เลือกมา (เดิมแปลงฉากหลังเป็นสีขาว + ครอป 300x300 อัตโนมัติ ซึ่งทำให้รูปเพี้ยน)
function handleWorkerPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const preview = document.getElementById("worker-photo-preview");
    const icon = document.getElementById("worker-photo-icon");

    const reader = new FileReader();
    reader.onload = async function(e) {
        const dataUrl = e.target.result;
        // Set local preview first
        preview.src = dataUrl;
        preview.classList.remove("hidden");
        icon.classList.add("hidden");

        // อัปโหลดขึ้น Supabase Storage แบบ async
        const editId = document.getElementById("worker-edit-id").value;
        const employerId = document.getElementById("worker-employer-id").value;
        const firstName = document.getElementById("worker-first-name").value.trim() || "worker";
        const uploadResult = await uploadDocumentFile(dataUrl, `${firstName}_photo${extFromDataUrl(dataUrl)}`, employerId, editId);
        if (uploadResult && uploadResult.viewUrl) {
            preview.src = uploadResult.viewUrl; // สลับจาก data URL ชั่วคราวเป็นลิงก์ไฟล์จริงบน Storage
        }
    };
    reader.readAsDataURL(file);
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

// แฟ้มเอกสารคนงาน แบบ "รายการ + พรีวิวใหญ่": รายการไฟล์แยกหมวดทางซ้าย กดแล้วแสดงเอกสารใหญ่ทางขวาทันที
// ด้านบนแสดงรูปคนงาน (กดรูปเพื่อดูใหญ่ในช่องพรีวิว) — เลือกโดยเจ้าของระบบ 2026-10-02
let activeFolderSel = null; // { kind: 'file', key, idx } | { kind: 'photo' }

function workerFolderFileUrl(fItem) {
    return (fItem && fItem.data) || '';
}

function isPdfUrl(url) {
    return String(url).startsWith('data:application/pdf') || /\.pdf(\?|#|$)/i.test(String(url));
}

// ---------- แท็บ "เอกสารทั้งหมด": เอกสารที่แนบในแฟ้ม (ทุกหมวด รวมที่หมดอายุ) + เอกสารปิดงาน/ใบนัดหมายจากใบงานของคนงานนี้ ----------
let workerFolderMode = 'type'; // 'type' = แยกตามหมวด (เดิม) | 'all' = เอกสารทั้งหมด

function setWorkerFolderMode(mode) {
    workerFolderMode = mode === 'all' ? 'all' : 'type';
    [['type', 'btn-fv-mode-type'], ['all', 'btn-fv-mode-all']].forEach(([key, id]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const on = key === workerFolderMode;
        btn.className = on ? "btn btn-gold btn-sm" : "btn btn-outline btn-sm";
        btn.style.borderColor = on ? "" : "transparent";
        btn.style.color = on ? "" : "var(--text-dark)";
        btn.style.background = on ? "" : "transparent";
    });
    renderWorkerFolderTiles();
}

// เอกสารของใบงาน 1 ใบ: เอกสารปิดงาน (jobs.attachments) + ใบนัดหมาย (jobs.appointmentDocUrl)
function jobDocsOf(j) {
    const docs = (Array.isArray(j.attachments) ? j.attachments : []).filter(f => f && f.url)
        .map(f => ({ name: f.name || 'เอกสารปิดงาน', url: f.url, note: f.note || '', uploadedAt: f.uploadedAt || '', group: 'เอกสารปิดงาน' }));
    if (j.appointmentDocUrl) docs.push({ name: 'ใบนัดหมาย', url: j.appointmentDocUrl, note: '', uploadedAt: '', group: 'ใบนัดหมาย' });
    return docs;
}

// รายการเอกสารทั้งหมดของคนงาน (ใช้ทั้งแท็บ "เอกสารทั้งหมด" และปุ่มดาวน์โหลดทั้งหมด)
function collectWorkerAllDocs(w) {
    const out = [];
    WORKER_FOLDER_DOC_TYPES.forEach(type => {
        const list = getAttachments(w, type.key);
        list.forEach((fItem, idx) => {
            const url = workerFolderFileUrl(fItem);
            if (!url) return;
            out.push({ sel: { kind: 'file', key: type.key, idx }, name: fItem.name || type.label, url, folder: type.label,
                sub: type.label + (isWorkerDocFileExpired(fItem, idx, list, type.key) ? ' • หมดอายุ' : ''), date: String(fItem.uploadedAt || '').slice(0, 10) });
        });
    });
    const seenUrls = new Set(out.map(d => d.url)); // เอกสารปิดงานที่ AI เก็บเข้าแฟ้มแล้ว ไม่แสดงซ้ำ
    jobs.filter(j => j.workerId === w.id)
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .forEach(j => {
            const jobLabel = `${getCleanJobTypeName(j.jobType)} (${getJobDisplayNo(j)})`;
            jobDocsOf(j).forEach((d, idx) => {
                if (seenUrls.has(d.url)) return;
                out.push({ sel: { kind: 'jobdoc', key: `job:${j.id}`, jobId: j.id, idx }, name: d.name, url: d.url, folder: `${d.group} - ${jobLabel}`,
                    sub: `${d.group} • ${jobLabel}`, date: String(d.uploadedAt || j.closedAt || '').slice(0, 10), note: d.note });
            });
        });
    return out;
}

function renderWorkerFolderAllDocs(w, query) {
    const docs = collectWorkerAllDocs(w).filter(d => !query || `${d.name} ${d.sub}`.toLowerCase().includes(query));
    const selKey = activeFolderSel && `${activeFolderSel.key}#${activeFolderSel.idx}`;
    if (!docs.some(d => `${d.sel.key}#${d.sel.idx}` === selKey)) activeFolderSel = docs[0] ? docs[0].sel : (w.photo ? { kind: 'photo' } : null);

    const listEl = document.getElementById("worker-folder-files-list");
    listEl.innerHTML = `
        <div class="fv-group">
            <div class="fv-group-head">
                <span>${icon('folder')} เอกสารทั้งหมด</span><b>${docs.length || ''}</b>
            </div>
            ${docs.map(d => `
                <div class="fv-item" data-key="${escapeHtml(d.sel.key)}" data-idx="${d.sel.idx}" draggable="false"
                     onclick="selectWorkerFolderAnyDoc('${escapeHtml(d.sel.kind)}', '${escapeHtml(d.sel.key)}', ${d.sel.idx})" title="${escapeHtml(d.name)}">
                    ${renderDriveThumbnail(d.url)}
                    <div class="fv-item-text"><b>${escapeHtml(d.name)}</b><small>${escapeHtml(d.sub)}${d.date ? ` • ${formatThaiDate(d.date)}` : ''}</small></div>
                </div>`).join('') || `<div class="fv-none">${query ? 'ไม่พบไฟล์ตามคำค้นหา' : 'ยังไม่มีเอกสาร'}</div>`}
        </div>`;
    hydratePdfThumbnails(listEl);
    const expiredSection = document.getElementById("worker-folder-expired-section");
    if (expiredSection) expiredSection.classList.add("hidden");
    markWorkerFolderSelection();
    renderWorkerFolderPreview();
}

function selectWorkerFolderAnyDoc(kind, key, idx) {
    activeFolderSel = kind === 'jobdoc' ? { kind, key, jobId: key.replace(/^job:/, ''), idx } : { kind: 'file', key, idx };
    markWorkerFolderSelection();
    renderWorkerFolderPreview();
}

// ดึงไฟล์เป็น Blob: ไฟล์ใน Storage ใช้ SDK (ไม่ติด CORS), data: URL / ลิงก์อื่นใช้ fetch
async function fetchDocBlob(url) {
    const marker = '/worker-documents/';
    const i = String(url).indexOf(marker);
    if (i !== -1 && window.supabaseAdapter) {
        const path = decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
        const { data, error } = await window.supabaseAdapter.client.storage.from('worker-documents').download(path);
        if (!error && data) return data;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
}

// ปุ่ม "ดาวน์โหลดทั้งหมด": รวมเอกสารทุกไฟล์ของคนงาน (+ รูปคนงาน) เป็น ZIP ไฟล์เดียว แยกโฟลเดอร์ตามหมวด/ใบงาน
async function downloadAllWorkerDocs() {
    const w = workers.find(item => item.id === activeFolderWorkerId);
    if (!w) return;
    const docs = collectWorkerAllDocs(w);
    if (w.photo) docs.unshift({ name: 'รูปคนงาน', url: w.photo, folder: '' });
    if (!docs.length) { showToast("ยังไม่มีเอกสารในแฟ้มนี้", "warning"); return; }
    const btn = document.getElementById('btn-fv-download-all');
    if (btn) btn.disabled = true;
    try {
        const JSZip = await loadJsZip();
        const zip = new JSZip();
        const used = new Set();
        const safe = s => String(s || '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'ไฟล์';
        let failed = 0;
        for (let i = 0; i < docs.length; i++) {
            const d = docs[i];
            showToast(`📦 กำลังรวมไฟล์ ${i + 1}/${docs.length}...`, "warning");
            let blob;
            try { blob = await fetchDocBlob(d.url); } catch (e) { failed++; continue; }
            // นามสกุลไฟล์: จากชื่อไฟล์เดิม → จาก URL → จากชนิดไฟล์
            let name = safe(d.name);
            if (!/\.[a-z0-9]{2,5}$/i.test(name)) {
                const urlExt = (String(d.url).split('?')[0].match(/\.([a-z0-9]{2,5})$/i) || [])[1];
                const typeExt = (blob.type || '').includes('pdf') ? 'pdf' : (blob.type || '').startsWith('image/') ? blob.type.split('/')[1].replace('jpeg', 'jpg') : '';
                const ext = (String(d.url).startsWith('data:') ? '' : urlExt) || typeExt;
                if (ext) name += '.' + ext.toLowerCase();
            }
            let path = (d.folder ? safe(d.folder) + '/' : '') + name;
            for (let n = 2; used.has(path); n++) path = path.replace(/(\.[^./]+)?$/, m => ` (${n})${m}`);
            used.add(path);
            zip.file(path, blob);
        }
        const out = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
        downloadBlob(out, `${safe(workerFullName(w))}_${safe(w.workerUid || 'เอกสาร')}.zip`);
        showToast(failed ? `⚠️ ดาวน์โหลดแล้ว แต่มี ${failed} ไฟล์ที่ดึงไม่ได้` : `📥 ดาวน์โหลดเอกสารทั้งหมด ${docs.length} ไฟล์แล้ว`, failed ? "warning" : "success");
    } catch (err) {
        showToast("❌ ดาวน์โหลดทั้งหมดไม่สำเร็จ: " + err.message, "danger");
    } finally {
        if (btn) btn.disabled = false;
    }
}

function renderWorkerFolderTiles() {
    const w = workers.find(item => item.id === activeFolderWorkerId);
    if (!w) return;
    const searchInput = document.getElementById("search-worker-folder");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const canAdd = can('ops');
    if (workerFolderMode === 'all') { renderWorkerFolderAllDocs(w, query); return; }

    const groups = [];
    const expiredItems = [];
    const allFiles = [];
    WORKER_FOLDER_DOC_TYPES.forEach(file => {
        const list = getAttachments(w, file.key);
        const items = [];
        list.forEach((fItem, fIdx) => {
            if (query && !(fItem.name || '').toLowerCase().includes(query)) return;
            const isExpired = isWorkerDocFileExpired(fItem, fIdx, list, file.key);
            allFiles.push({ key: file.key, idx: fIdx, isExpired });
            const row = renderWorkerFolderItem(file, fItem, fIdx, isExpired);
            if (isExpired) expiredItems.push(row); else items.push(row);
        });
        if (query && items.length === 0) return;
        groups.push(`
            <div class="fv-group">
                <div class="fv-group-head">
                    <span>${icon(file.icon)} ${file.label}</span>
                    <b>${items.length || ''}</b>
                    ${canAdd ? `<button type="button" class="fv-add" onclick="triggerFolderFileUpload('${file.key}')" data-paste-target="worker-folder:${file.key}" title="แนบไฟล์: ${file.label} — คลิกเลือกไฟล์ หรือชี้แล้วกด Ctrl+V วางภาพ">${icon('plus')} แนบ</button>` : ''}${canAdd && isCameraDevice() ? cameraButtonHtml(`cameraWorkerFolderUpload('${file.key}')`, 'fv-cam') : ''}
                </div>
                ${items.join('') || '<div class="fv-none">ยังไม่มีไฟล์</div>'}
            </div>`);
    });

    // คงไฟล์ที่เลือกไว้ (เช่น หลังเปลี่ยนชื่อ/ลบ/แนบไฟล์ใหม่) — ถ้าไฟล์นั้นไม่อยู่แล้ว เลือกไฟล์ปัจจุบันไฟล์แรกแทน
    const stillThere = activeFolderSel && activeFolderSel.kind === 'file' && allFiles.some(f => f.key === activeFolderSel.key && f.idx === activeFolderSel.idx);
    if (!stillThere && !(activeFolderSel && activeFolderSel.kind === 'photo')) {
        const first = allFiles.find(f => !f.isExpired) || allFiles[0];
        activeFolderSel = first ? { kind: 'file', key: first.key, idx: first.idx } : (w.photo ? { kind: 'photo' } : null);
    }

    const listEl = document.getElementById("worker-folder-files-list");
    listEl.innerHTML = groups.join('') || `<p class="text-muted fv-empty">${icon("bad")} ไม่พบไฟล์ตามคำค้นหา</p>`;
    hydratePdfThumbnails(listEl);

    const expiredSection = document.getElementById("worker-folder-expired-section");
    const expiredListEl = document.getElementById("worker-folder-expired-files-list");
    if (expiredSection && expiredListEl) {
        expiredListEl.innerHTML = expiredItems.join('') || `<div class="fv-none">${can('ops') ? 'ลากไฟล์จากด้านบนมาวางที่นี่เพื่อย้ายเป็น "หมดอายุ"' : 'ไม่มีไฟล์ที่หมดอายุ'}</div>`;
        hydratePdfThumbnails(expiredListEl);
        expiredSection.classList.remove("hidden");
    }
    markWorkerFolderSelection();
    renderWorkerFolderPreview();
}

function renderWorkerFolderItem(file, fItem, idx, isExpired) {
    const exp = fItem.expiryDate ? safeParseDate(fItem.expiryDate) : null;
    const days = exp ? Math.ceil((exp - new Date()) / 86400000) : null;
    const expTag = isExpired ? '<span class="tag-mini is-bad">หมดอายุ</span>'
        : days === null ? '' : days < 0 ? '<span class="tag-mini is-bad">หมดอายุ</span>'
        : days <= 60 ? `<span class="tag-mini is-warn">อีก ${days} วัน</span>` : `<span class="tag-mini is-ok">ถึง ${formatThaiDate(fItem.expiryDate)}</span>`;
    return `
        <div class="fv-item${isExpired ? ' is-expired' : ''}" data-key="${file.key}" data-idx="${idx}" draggable="${can('ops') ? 'true' : 'false'}"
             ondragstart="onWorkerFileDragStart(event, '${file.key}', ${idx})" onclick="selectWorkerFolderFile('${file.key}', ${idx})" title="${escapeHtml(fItem.name || '')}">
            ${renderDriveThumbnail(workerFolderFileUrl(fItem))}
            <div class="fv-item-text"><b>${escapeHtml(fItem.name || '-')}</b><small>${fItem.uploadedAt ? formatThaiDate(String(fItem.uploadedAt).slice(0, 10)) : ''} ${expTag}</small></div>
        </div>`;
}

function markWorkerFolderSelection() {
    document.querySelectorAll('#worker-folder-modal .fv-item').forEach(el => {
        el.classList.toggle('is-active', !!activeFolderSel && (activeFolderSel.kind === 'file' || activeFolderSel.kind === 'jobdoc') && el.dataset.key === activeFolderSel.key && Number(el.dataset.idx) === activeFolderSel.idx);
    });
    const photoBtn = document.querySelector('#worker-folder-modal .fv-photo');
    if (photoBtn) photoBtn.classList.toggle('is-active', !!activeFolderSel && activeFolderSel.kind === 'photo');
}

function selectWorkerFolderFile(key, idx) {
    activeFolderSel = { kind: 'file', key, idx };
    markWorkerFolderSelection();
    renderWorkerFolderPreview();
}

function selectWorkerFolderPhoto() {
    const w = workers.find(item => item.id === activeFolderWorkerId);
    if (!w || !w.photo) return;
    activeFolderSel = { kind: 'photo' };
    markWorkerFolderSelection();
    renderWorkerFolderPreview();
}

// ช่องพรีวิวใหญ่ทางขวา: รูป → <img>, PDF → <iframe>, ไม่รู้ชนิด → ลองเป็นรูปก่อนแล้วค่อยเปิดเป็น PDF
function renderWorkerFolderPreview() {
    const box = document.getElementById("worker-folder-preview");
    const w = workers.find(item => item.id === activeFolderWorkerId);
    if (!box || !w) return;
    if (!activeFolderSel) {
        box.innerHTML = `<div class="fv-placeholder">${icon('folder')}<p>ยังไม่มีเอกสารในแฟ้มนี้${can('ops') ? ' — กด "แนบ" ที่หมวดทางซ้ายเพื่อเพิ่มไฟล์' : ''}</p></div>`;
        return;
    }
    if (activeFolderSel.kind === 'photo') {
        box.innerHTML = `
            <div class="fv-bar"><div class="fv-bar-title"><b>รูปคนงาน</b><small>${escapeHtml(`${w.firstName} ${w.lastName || ''}`)}</small></div>
                <div class="fv-bar-actions"><a class="btn btn-sm btn-outline" href="${escapeHtml(w.photo)}" target="_blank" rel="noopener">${icon('link')} เปิดแท็บใหม่</a></div></div>
            <div class="fv-doc"><img src="${escapeHtml(w.photo)}" alt="รูปคนงาน"></div>`;
        return;
    }
    if (activeFolderSel.kind === 'jobdoc') {
        // เอกสารปิดงาน/ใบนัดหมายจากใบงาน — ดู/ดาวน์โหลดได้ แก้/ลบที่หน้าต่างใบงานนั้น
        const j = jobs.find(x => x.id === activeFolderSel.jobId);
        const d = j ? jobDocsOf(j)[activeFolderSel.idx] : null;
        if (!d) { box.innerHTML = ''; return; }
        const jurl = d.url;
        const jviewer = isPdfUrl(jurl)
            ? `<iframe src="${escapeHtml(jurl)}" title="${escapeHtml(d.name)}"></iframe>`
            : `<img src="${escapeHtml(jurl)}" alt="${escapeHtml(d.name)}" onerror="this.outerHTML = '<iframe src=&quot;' + this.src + '&quot;></iframe>'">`;
        box.innerHTML = `
            <div class="fv-bar">
                <div class="fv-bar-title"><b>${escapeHtml(d.name)}</b>
                    <small>${escapeHtml(d.group)} • ${escapeHtml(getCleanJobTypeName(j.jobType))} (${escapeHtml(getJobDisplayNo(j))})${d.note ? ` • ${escapeHtml(d.note)}` : ''}</small></div>
                <div class="fv-bar-actions">
                    <a class="btn btn-sm btn-outline" href="${escapeHtml(jurl)}" target="_blank" rel="noopener">${icon('link')} เปิดแท็บใหม่</a>
                    <button type="button" class="btn btn-sm btn-outline" onclick="workerFolderAction('download')">${icon('inbox')} ดาวน์โหลด</button>
                </div>
            </div>
            <div class="fv-doc">${jviewer}</div>`;
        return;
    }
    const type = WORKER_FOLDER_DOC_TYPES.find(t => t.key === activeFolderSel.key) || { label: '' };
    const list = getAttachments(w, activeFolderSel.key);
    const fItem = list[activeFolderSel.idx];
    if (!fItem) { box.innerHTML = ''; return; }
    const url = workerFolderFileUrl(fItem);
    const canEdit = can('ops');
    const viewer = isPdfUrl(url)
        ? `<iframe src="${escapeHtml(url)}" title="${escapeHtml(fItem.name || '')}"></iframe>`
        : `<img src="${escapeHtml(url)}" alt="${escapeHtml(fItem.name || '')}" onerror="this.outerHTML = '<iframe src=&quot;' + this.src + '&quot;></iframe>'">`;
    box.innerHTML = `
        <div class="fv-bar">
            <div class="fv-bar-title">
                ${canEdit ? `<input type="text" class="fv-name" value="${escapeHtml(fItem.name || '')}" title="แก้ชื่อไฟล์แล้วกด Enter" onchange="renameFolderFileIndex('${activeFolderSel.key}', ${activeFolderSel.idx}, this.value)">`
                    : `<b>${escapeHtml(fItem.name || '-')}</b>`}
                <small>${type.label}${fItem.expiryDate ? ` • หมดอายุ ${formatThaiDate(fItem.expiryDate)}` : ''}${fItem.note ? ` • ${escapeHtml(fItem.note)}` : ''}</small>
            </div>
            <div class="fv-bar-actions">
                ${canEdit && !isPdfUrl(url) && w.photo !== url ? `<button type="button" class="btn btn-sm btn-outline" onclick="workerFolderAction('setPhoto')" title="ใช้รูปนี้เป็นรูปประจำตัวคนงาน (แสดงด้านบนแฟ้มและในตาราง)">${icon('photo')} ตั้งเป็นรูปคนงาน</button>` : ''}
                <a class="btn btn-sm btn-outline" href="${escapeHtml(url)}" target="_blank" rel="noopener">${icon('link')} เปิดแท็บใหม่</a>
                <button type="button" class="btn btn-sm btn-outline" onclick="workerFolderAction('download')">${icon('inbox')} ดาวน์โหลด</button>
                <button type="button" class="btn btn-sm btn-outline" onclick="workerFolderAction('share')">${icon('link')} แชร์</button>
                ${canEdit ? `<button type="button" class="btn btn-sm btn-outline btn-danger-outline drive-tile-action-btn danger" onclick="deleteFolderFileIndex('${activeFolderSel.key}', ${activeFolderSel.idx})" title="ลบไฟล์">${icon('trash')}</button>` : ''}
            </div>
        </div>
        <div class="fv-doc">${viewer}</div>`;
}

// ปุ่มดาวน์โหลด/แชร์ของไฟล์ที่เลือก — ไม่ฝัง URL ยาว ๆ (บางไฟล์เป็น base64) ไว้ใน onclick
function workerFolderAction(action) {
    const w = workers.find(item => item.id === activeFolderWorkerId);
    if (w && activeFolderSel && activeFolderSel.kind === 'jobdoc') {
        const j = jobs.find(x => x.id === activeFolderSel.jobId);
        const d = j ? jobDocsOf(j)[activeFolderSel.idx] : null;
        if (d && action === 'download') downloadAttachment(d.name, d.url);
        return;
    }
    if (!w || !activeFolderSel || activeFolderSel.kind !== 'file') return;
    const fItem = getAttachments(w, activeFolderSel.key)[activeFolderSel.idx];
    if (!fItem) return;
    if (action === 'download') downloadAttachment(fItem.name, workerFolderFileUrl(fItem));
    else if (action === 'setPhoto') setWorkerPhotoFromFile(w, workerFolderFileUrl(fItem));
    else shareAttachment(fItem.name, `${w.firstName} ${w.lastName || ''}`, workerFolderFileUrl(fItem));
}

// ตั้งรูปในแฟ้มเป็นรูปประจำตัวคนงาน (workers.photo) — ใช้แก้คนงานเก่าที่รูปไม่เคยถูกบันทึก (บั๊ก map ตกหล่น แก้ 2026-10-02)
async function setWorkerPhotoFromFile(w, url) {
    if (!can('ops') || !url) return;
    const prev = w.photo;
    w.photo = url;
    const res = await callCloudAPI("saveWorker", { workerData: { id: w.id, firstName: w.firstName, photo: url } });
    if (!res || res.status === "error") { w.photo = prev; return; }
    saveData();
    document.getElementById("worker-folder-avatar").src = url;
    renderWorkerFolderPreview();
    renderWorkers();
    showToast(`🖼️ ตั้งรูปประจำตัวของ ${w.firstName} แล้ว`, "success");
}
// ==================== ลากไฟล์ในแฟ้มคนงานย้ายเข้า/ออกโฟลเดอร์ "ไฟล์ที่หมดอายุ" (เหมือนลากการ์ดใน Kanban) ====================
function onWorkerFileDragStart(e, docType, idx) {
    if (!can('ops')) { e.preventDefault(); return; }
    e.dataTransfer.setData("text/plain", JSON.stringify({ docType, idx }));
}

function onWorkerFileDragOver(e) {
    e.preventDefault();
}

async function onWorkerFileDropToExpired(e) {
    e.preventDefault();
    await moveWorkerFileExpiryState(e, true);
}

async function onWorkerFileDropToCurrent(e) {
    e.preventDefault();
    await moveWorkerFileExpiryState(e, false);
}

async function moveWorkerFileExpiryState(e, markExpired) {
    if (!can('ops')) return; // นายจ้าง/บัญชีดูอย่างเดียว ย้ายไฟล์ไม่ได้
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    let payload;
    try { payload = JSON.parse(raw); } catch (err) { return; }
    const { docType, idx } = payload || {};
    if (!docType || typeof idx !== 'number') return;

    const w = workers.find(item => item.id === activeFolderWorkerId);
    if (!w) return;
    const list = getAttachments(w, docType);
    const fItem = list[idx];
    if (!fItem) return;

    if (isWorkerDocFileExpired(fItem, idx, list, docType) === markExpired) return; // อยู่ตรงที่ลากมาวางอยู่แล้ว ไม่ต้องทำอะไร

    fItem.manualExpired = markExpired; // เจ้าหน้าที่ตั้งเองแล้ว ใช้ทับตรรกะอัตโนมัติ (วันหมดอายุจริง/ลำดับอัปโหลด) ต่อจากนี้
    renderWorkerFolderTiles();
    showToast(markExpired ? "📁 ย้ายไฟล์ไปที่ \"ไฟล์ที่หมดอายุ\" แล้ว" : "📂 ย้ายไฟล์กลับมาที่เอกสารปัจจุบันแล้ว", "success");

    const saveRes = await callCloudAPI("saveWorker", { workerData: w });
    if (!saveRes || saveRes.status === "error") {
        showToast("⚠️ ย้ายไฟล์สำเร็จในเครื่อง แต่บันทึกขึ้นคลาวด์ไม่สำเร็จ: " + (saveRes && saveRes.message ? saveRes.message : "unknown error"), "danger");
    }
}

function openWorkerFolderModal(workerId) {
    // เรียกซ้ำหลังแนบ/เปลี่ยนชื่อ/ลบไฟล์ (แฟ้มเดิมยังเปิดอยู่) → คงไฟล์ที่เลือกและคำค้นหาไว้
    const reopening = workerId === activeFolderWorkerId && !document.getElementById("worker-folder-modal").classList.contains("hidden");
    if (!reopening) activeFolderSel = null;
    activeFolderWorkerId = workerId;
    const w = workers.find(item => item.id === workerId);
    if (!w) return;

    document.getElementById("worker-folder-name").innerText = workerFullName(w); // คำนำหน้านามจริงของคนงาน (นาย/นาง/นางสาว) ไม่ใช่ "คุณ"
    const emp = customers.find(c => c.id === w.employerId);
    const empName = emp ? emp.companyName : "ไม่ระบุนายจ้าง";
    document.getElementById("worker-folder-meta").innerText = `เลขประจำตัว: ${w.workerUid || '-'} | สัญชาติ: ${w.nationality} | นายจ้าง: ${empName}`;

    const avatarUrl = w.photo ? w.photo : 'data:image/svg+xml;utf8,<svg xmlns="http:' + '/' + '/www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="%2394a3b8"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 3.58-8 8v1h16v-1c0-4.42-3.58-8-8-8z"/></svg>';
    document.getElementById("worker-folder-avatar").src = avatarUrl;

    const searchInput = document.getElementById("search-worker-folder");
    if (searchInput && !reopening) searchInput.value = '';

    renderWorkerFolderTiles();
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
    const shareText = "แฟ้มเอกสารคนงานของ: คุณ " + w.firstName + " " + (w.lastName || "") + "\n(รวมใบอนุญาตทำงาน, พาสปอร์ต, บัตรชมพู, ทะเบียนบ้าน, ใบเสร็จ)\nเปิดคลังเอกสารได้ที่: http:" + "/" + "/localhost:3000/#worker-folder-" + w.id;
    
    navigator.clipboard.writeText(shareText).then(() => {
        showToast("📋 คัดลอกลิงก์แฟ้มเอกสารไปที่คลิปบอร์ดเรียบร้อยแล้ว!", "success");
    }).catch(err => {
        uiAlert("ไม่สามารถคัดลอกได้: " + err);
    });
}

// Trigger hidden file input upload inside Folder modal
function triggerFolderFileUpload(docType) {
    if (!can('ops')) return; // แก้/ลบ/แนบไฟล์ในแฟ้มคนงานได้เฉพาะเจ้าหน้าที่ (ไม่ใช่นายจ้าง)
    activeFolderDocType = docType;
    const fileInput = document.getElementById("folder-upload-input");
    if (fileInput) {
        fileInput.value = ""; // reset
        fileInput.click();
    }
}

// เติมข้อมูลคนงานจากผลลัพธ์ AI OCR — ใช้ร่วมกันทั้งอัปโหลดทีละไฟล์ และนำเข้าหลายไฟล์พร้อมกัน (bulk import)
function applyOcrDataToWorker(w, docType, p) {
    if (!p) return;
    const printedTitle = readOcrTitle(p);
    // เชื่อมโยงคำนำหน้านามกับเพศ: ถ้า AI ไม่ได้อ่านเพศแยกมาให้ (หรืออ่านไม่ออก) ใช้คำนำหน้าที่อ่านได้มาเดาเพศแทน
    const gender = mapGeminiGender(p.gender) || deriveGenderFromTitle(printedTitle);
    // ไม่มีคำนำหน้าพิมพ์ในเอกสาร: เติมจากเพศเฉพาะคนงานที่ยังไม่มีคำนำหน้า (ไม่ทับค่าเดิม เช่น "นาง" ที่ผู้ใช้แก้ไว้)
    const title = printedTitle || (!w.title ? defaultTitleForGender(gender || w.gender) : null);

    // ข้อมูลจากใบอนุญาตทำงาน: ใบที่เก่ากว่า (เช่น ใบแทนฉบับเก่า) ไม่ทับข้อมูลจากใบที่ใหม่กว่า — เติมเฉพาะช่องว่าง (ดู shouldWpDocOverride)
    const wpOverride = (docType !== 'worker-wp-doc' && !p.ewp) || shouldWpDocOverride(p, w.permitExpiry);
    if (docType === 'worker-wp-doc' && !wpOverride) {
        const fillEmpty = (field, val) => { if (val && !w[field]) w[field] = val; };
        fillEmpty('permitNo', p.permitNo);
        fillEmpty('permitExpiry', p.permitExpiry && parseDateInput(p.permitExpiry));
        fillEmpty('workerUid', p.uid);
        fillEmpty('firstName', p.firstName);
        fillEmpty('lastName', w.firstName ? null : p.lastName);
        fillEmpty('dob', p.dob && parseDateInput(p.dob));
        fillEmpty('nationality', p.nationality);
        fillEmpty('refNo', p.refNo);
        fillEmpty('gender', gender);
        fillEmpty('title', title);
        fillEmpty('position', p.position);
    } else if (docType === 'worker-wp-doc') {
        if (p.permitNo) w.permitNo = p.permitNo;
        if (p.permitExpiry) w.permitExpiry = parseDateInput(p.permitExpiry) || w.permitExpiry;
        if (p.uid) w.workerUid = p.uid;
        if (p.firstName) w.firstName = p.firstName;
        if (p.lastName) w.lastName = p.lastName;
        if (p.dob) w.dob = parseDateInput(p.dob) || w.dob;
        if (p.nationality) w.nationality = p.nationality;
        if (p.refNo) w.refNo = p.refNo;
        if (gender) w.gender = gender;
        if (title) w.title = title;
        if (p.position) w.position = p.position;

        // กฎ: คนสัญชาติเมียนมาไม่มีนามสกุล (ชื่อพม่าเป็นชื่อเดียวทั้งหมด ต่อให้มีหลายคำ)
        // เผื่อ AI ยังแยกชื่อ-นามสกุลมาให้ผิดๆ ทั้งที่สั่งในพรอมต์แล้วว่าไม่ต้องแยก
        if (w.nationality === 'Myanmar' && w.lastName) {
            w.firstName = `${w.firstName} ${w.lastName}`.trim();
            w.lastName = '';
        }
    } else if (docType === 'worker-passport') {
        if (p.passportNo) w.passportNo = p.passportNo;
        if (p.passportPob) w.passportPob = p.passportPob;
        if (p.passportAuth) w.passportAuth = p.passportAuth;
        if (p.passportIssue) w.passportIssue = parseDateInput(p.passportIssue) || w.passportIssue;
        if (p.passportExpiry) w.passportExpiry = parseDateInput(p.passportExpiry) || w.passportExpiry;
        if (p.dob) w.dob = parseDateInput(p.dob) || w.dob;
        if (gender) w.gender = gender;
        if (title) w.title = title;
    } else if (docType === 'worker-pink-card') {
        if (p.pinkCardNo) w.pinkCardNo = p.pinkCardNo;
        if (p.thaiName) w.thaiName = p.thaiName;
        if (p.insuranceNo) w.insuranceNo = p.insuranceNo;
        if (p.dob) w.dob = parseDateInput(p.dob) || w.dob;
        if (gender) w.gender = gender;
        if (title) w.title = title;
    } else if (docType === 'worker-myanmar-id') {
        if (p.firstName) w.firstName = p.firstName;
        if (p.lastName) w.lastName = p.lastName;
        if (p.dob) w.dob = parseDateInput(p.dob) || w.dob;
        if (p.nationality) w.nationality = p.nationality;
        if (gender) w.gender = gender;
        if (title) w.title = title;
        if (w.nationality === 'Myanmar' && w.lastName) {
            w.firstName = `${w.firstName} ${w.lastName}`.trim();
            w.lastName = '';
        }
    } else if (docType === 'worker-insurance-doc') {
        if (p.insuranceNo) w.insuranceNo = p.insuranceNo;
    } else if (docType === 'worker-receipt') {
        // ใบเสร็จกรมการจัดหางาน: เติมเฉพาะช่องที่ยังว่าง — ไม่ทับข้อมูลจากใบอนุญาตทำงาน/พาสปอร์ตที่แม่นกว่า
        if (p.uid && !w.workerUid) w.workerUid = p.uid;
        if (p.refNo && !w.refNo) w.refNo = p.refNo;
        if (title && !w.title) w.title = title;
        if (gender && !w.gender) w.gender = gender;
        if (['Myanmar', 'Cambodia', 'Laos'].includes(p.nationality) && !w.nationality) w.nationality = p.nationality;
    }
    if (p.ewp) applyEwpDataToWorker(w, p, wpOverride);
    if (docType === 'worker-wp-doc' || (p.ewp && docType !== 'worker-passport')) applyWpPassportInfoToWorker(w, p);
    // ยุบช่องว่างซ้อนในชื่อที่ AI อ่านมา (เช่น "NUN  WIN  AYE") ให้ค้นหาเจอ
    if (w.firstName) w.firstName = String(w.firstName).replace(/\s+/g, ' ').trim();
    if (w.lastName) w.lastName = String(w.lastName).replace(/\s+/g, ' ').trim();
    // อีเมล (เช่น ช่อง Email บนใบเสร็จ) — เติมเมื่อคนงานยังไม่มีอีเมลเท่านั้น
    if (p.email && !w.email) w.email = String(p.email).trim();
}

// วันหมดอายุจริงของเอกสาร (อ่านจากผล OCR ตอนแนบไฟล์) — มีแค่บางประเภทเอกสารที่มีวันหมดอายุพิมพ์อยู่จริง
// ประเภทอื่น (บัตรชมพู/ทะเบียนบ้าน/ใบเสร็จ/ใบรับรองแพทย์/ประกัน/ใบคำขอ/อื่นๆ) คืน null เสมอ — ใช้ลำดับอัปโหลดตัดสินแทนตอนแสดงผล
function extractDocExpiryDate(docType, parsedData) {
    if (!parsedData) return null;
    if (docType === 'worker-wp-doc') return parseDateInput(parsedData.permitExpiry) || null;
    if (docType === 'worker-passport') return parseDateInput(parsedData.passportExpiry) || null;
    return null;
}

// ประเภทเอกสารที่มีวันหมดอายุพิมพ์อยู่จริงและ AI อ่านมาเก็บไว้ได้ (ต้องตรงกับ extractDocExpiryDate ด้านบน)
const EXPIRY_TRACKED_WORKER_DOC_TYPES = ['worker-wp-doc', 'worker-passport'];

// ไฟล์นี้ "หมดอายุ" หรือยัง — ถ้าเจ้าหน้าที่เคยลากย้ายไฟล์นี้ด้วยตัวเอง (fItem.manualExpired) ให้ยึดตามนั้นก่อนเสมอ
// ไม่งั้นถ้ามีวันหมดอายุจริงที่บันทึกไว้ตอนแนบไฟล์ (fItem.expiryDate) ให้เทียบกับวันนี้ตรงๆ
// ถ้าไม่มีวันหมดอายุ:
//   - ใบอนุญาตทำงาน/พาสปอร์ต (ปกติมีวันหมดอายุ แต่ AI อ่านไม่ได้ เช่น Gemini ไม่ว่าง หรือเป็นหน้า 2-3 ของเอกสารชุดเดียวกัน)
//     ถือว่ายังใช้ได้ เว้นแต่มีไฟล์ประเภทเดียวกันที่แนบทีหลังและรู้วันหมดอายุแน่ชัดมาแทนแล้ว — เดิมใช้ลำดับอัปโหลดล้วน ๆ
//     ทำให้ไฟล์ที่เพิ่งแนบ (แต่ไม่ใช่ไฟล์สุดท้าย) ตกไปอยู่ "หมดอายุ" ทั้งที่ยังไม่หมด
//   - เอกสารประเภทที่ไม่มีวันหมดอายุพิมพ์อยู่ ให้ตัดสินจากลำดับอัปโหลดแทน (ไฟล์ล่าสุดของประเภทนั้น = ปัจจุบัน)
function isWorkerDocFileExpired(fItem, fIdx, list, docType) {
    if (fItem && typeof fItem.manualExpired === 'boolean') return fItem.manualExpired;
    if (fItem && fItem.expiryDate) {
        const exp = safeParseDate(fItem.expiryDate);
        if (exp) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            return exp < todayStart;
        }
    }
    // ใบเสร็จรับเงินเป็นหลักฐานการจ่ายเงิน ไม่มีวันหมดอายุจริงและยังใช้อ้างอิงได้เสมอ ต่อให้มีหลายใบสะสมไว้
    // (ไม่งั้นถ้าอัปโหลดซ้ำ/มีหลายใบจากคนละรอบต่ออายุ ใบเก่าจะโดนจัดเป็น "หมดอายุ" ไปเองตามลำดับอัปโหลดทั้งที่ไม่ควร)
    if (docType === 'worker-receipt') return false;
    if (EXPIRY_TRACKED_WORKER_DOC_TYPES.includes(docType)) {
        return list.slice(fIdx + 1).some(f => f && f.expiryDate && f.manualExpired !== true);
    }
    return fIdx < list.length - 1;
}

// แนบไฟล์ 1 ไฟล์เข้าแฟ้มคนงาน 1 คน (upload + OCR + อัปเดตข้อมูล) — ใช้ร่วมกันทั้งอัปโหลดทีละไฟล์ และ bulk import
async function attachDocumentToWorker(w, docType, fileContent, preParsed = null) {
    const currentList = getAttachments(w, docType);
    const suffix = currentList.length > 0 ? `_${currentList.length + 1}` : "";
    const ext = extFromDataUrl(fileContent);
    const nameOptions = workerDocNameOptions({ uid: w.workerUid, firstName: w.firstName, lastName: w.lastName }, docType, suffix, ext);
    let fileName = nameOptions.nameFromOcr(preParsed);

    // เลข 13 หลักในเอกสารไม่ตรงกับคนงาน → ถามก่อนอัปโหลด กด "ไม่อัปโหลด" = ไม่เก็บไฟล์ ไม่แก้ข้อมูลคนงาน (throw .cancelled)
    const known = { uid: w.workerUid, firstName: w.firstName, lastName: w.lastName };
    if (preParsed && !(await confirmWorkerUidChange(known, preParsed, fileName))) throw createUploadCancelledError();
    const uploadOptions = preParsed ? { skipOcr: true } : { ...nameOptions, confirmParsed: (p) => confirmWorkerUidChange(known, p, fileName) };
    const uploadResult = await uploadDocumentFile(fileContent, fileName, w.employerId, w.id, docType, uploadOptions);
    if (uploadResult && uploadResult.cancelled) throw createUploadCancelledError();
    if (uploadResult && uploadResult.aiRejected) throw createAiRejectedError(uploadResult.ocrError);
    if (uploadResult && uploadResult.fileName) fileName = uploadResult.fileName;
    const storedUrl = uploadResult ? uploadResult.fileUrl : null;
    const serverUrl = storedUrl || await uploadFileToServer(fileContent, fileName);

    w.attachments = w.attachments || {};
    w.attachments[docType] = currentList;
    w.attachments[docType].push({
        name: fileName,
        data: serverUrl || fileContent,
        expiryDate: extractDocExpiryDate(docType, preParsed || (uploadResult && uploadResult.parsedData))
    });

    const parsedForWorker = preParsed || (uploadResult && uploadResult.parsedData);
    if (parsedForWorker) applyOcrDataToWorker(w, docType, parsedForWorker);

    // Auto-transition from pending_register to active when both Work Permit and Receipt are uploaded
    const hasWp = getAttachments(w, 'worker-wp-doc').length > 0;
    const hasReceipt = getAttachments(w, 'worker-receipt').length > 0;
    if (w.status === 'pending_register' && hasWp && hasReceipt) {
        w.status = 'active';
        // ขึ้นทะเบียนเสร็จ = เข้าระบบแล้ว ไม่ต้องแจ้งเข้าซ้ำ (ไม่งั้นป้าย "⏳ รอแจ้งเข้า" ขึ้นทันทีที่สถานะเปลี่ยนเป็นปกติ
        // เพราะคนงานยังไม่มีใบงาน) — admin ยกเลิกติ๊กได้ในฟอร์มคนงานถ้าคนนี้ต้องแจ้งเข้าจริง
        w.skipNotifyEntry = true;
    }

    // บันทึกข้อมูลคนงาน (attachments ใหม่ + ฟิลด์ที่ AI เติมให้) กลับขึ้นคลาวด์จริง —
    // ไฟล์อัปโหลดขึ้น Storage ไปแล้วก็จริง แต่ถ้าไม่บันทึกจุดนี้ แถว worker ใน DB จะไม่รู้จักไฟล์นี้เลย
    // (เห็นแค่ในเบราว์เซอร์เครื่องนี้ผ่าน localStorage ชั่วคราว หายไปทันทีที่เปิดจากเครื่อง/บัญชีอื่น)
    w.workplace = getCustomerHQAddress(w.employerId); // ล็อคตามที่อยู่นายจ้าง (ไม่ใช้ที่อยู่ที่ AI อ่านจากเอกสาร)
    const saveRes = await callCloudAPI("saveWorker", { workerData: w });
    if (!saveRes || saveRes.status === "error") {
        throw new Error('อัปโหลดไฟล์สำเร็จ แต่บันทึกข้อมูลคนงานขึ้นคลาวด์ไม่สำเร็จ: ' + (saveRes && saveRes.message ? saveRes.message : 'unknown error'));
    }

    return uploadResult;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Handle folder file upload (Appends file(s) to the array) — แนบได้หลายไฟล์พร้อมกันในครั้งเดียว
async function handleFolderFileUpload(event) {
    if (!can('ops')) return; // แก้/ลบ/แนบไฟล์ในแฟ้มคนงานได้เฉพาะเจ้าหน้าที่ (ไม่ใช่นายจ้าง)
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !activeFolderWorkerId || !activeFolderDocType) return;

    showToast(`📤 กำลังอัปโหลดไฟล์ ${files.length} ไฟล์...`, "warning");

    let anyAiRead = false;
    let failCount = 0;
    let aiRejectedCount = 0; // AI อ่านไม่สำเร็จ = ไม่ได้บันทึกไฟล์ (ต้องแนบใหม่)
    let cancelledCount = 0; // กด "ไม่อัปโหลด" (เลข 13 หลักไม่ตรง) = ไม่ได้บันทึกไฟล์ตามที่ผู้ใช้เลือก
    let needsManualEntry = false; // มีไฟล์ที่ผู้ใช้เลือก "บันทึกไฟล์ กรอกเอง"
    const movedLabels = []; // ไฟล์ที่แนบในหมวด "เอกสารอื่นๆ" แล้ว AI ย้ายไปหมวดที่ถูกต้อง
    beginAiRejectedBatch();
    for (const file of files) {
        const workerIdx = workers.findIndex(w => w.id === activeFolderWorkerId);
        if (workerIdx === -1) break;
        const w = workers[workerIdx];
        const wasPending = w.status === 'pending_register';
        try {
            const fileContent = await readFileAsDataUrl(file);
            // หมวด "เอกสารอื่นๆ": ให้ AI ระบุประเภทเอกสาร + อ่านข้อมูลเอง → เก็บเข้าหมวดที่ถูกต้อง (ไม่รู้จัก/AI อ่านไม่ได้ = เอกสารอื่นๆ)
            let targetType = activeFolderDocType, preParsed = null;
            if (activeFolderDocType === 'worker-other') {
                const read = await aiReadWorkerDoc(fileContent);
                if (read) {
                    targetType = read.docType;
                    preParsed = read.parsed;
                    if (targetType !== 'worker-other') movedLabels.push((WORKER_FOLDER_DOC_TYPES.find(x => x.key === targetType) || {}).label || targetType);
                }
            }
            const uploadResult = await attachDocumentToWorker(w, targetType, fileContent, preParsed);
            if (preParsed) anyAiRead = true;
            if (uploadResult && uploadResult.parsedData) anyAiRead = true;
            if (uploadResult && uploadResult.manualEntry) needsManualEntry = true;
            if (wasPending && w.status === 'active') {
                showToast(`🎉 อัปโหลดใบอนุญาตทำงานและใบเสร็จแล้ว! เปลี่ยนสถานะ ${workerFullName(w)} เป็น ปกติ (Active) อัตโนมัติ`, "success");
            }
        } catch (err) {
            if (err && err.cancelled) { cancelledCount++; continue; }
            console.error("attachDocumentToWorker failed:", err);
            if (err && err.aiRejected) aiRejectedCount++; else failCount++;
        }
    }

    endAiRejectedBatch();
    if (anyAiRead) showToast("✨ AI อ่านข้อมูลจากเอกสารสำเร็จ กำลังอัปเดตข้อมูลคนงาน", "success");
    if (movedLabels.length) showToast(`📂 AI จัดเอกสารเข้าหมวดให้แล้ว: ${movedLabels.join(', ')}`, "success");
    if (cancelledCount > 0) showToast(`ไม่ได้อัปโหลด ${cancelledCount} จาก ${files.length} ไฟล์ — เลข 13 หลักไม่ตรงกับคนงานนี้`, "warning");
    if (aiRejectedCount > 0) showToast(`⚠️ AI อ่านไม่สำเร็จ ${aiRejectedCount} จาก ${files.length} ไฟล์ — ไฟล์เหล่านี้ยังไม่ได้บันทึก กรุณาแนบใหม่อีกครั้งในอีกสักครู่`, "warning");
    if (failCount > 0) showToast(`❌ อัปโหลดไม่สำเร็จ ${failCount} จาก ${files.length} ไฟล์`, "danger");
    else if (aiRejectedCount === 0 && cancelledCount < files.length) showToast("✅ อัปโหลดไฟล์และอัปเดตแฟ้มคนงานต่างด้าวสำเร็จ!", "success");

    saveData();
    renderWorkers();
    renderDashboard();
    // เลือก "บันทึกไฟล์ กรอกเอง" ไว้ -> เปิดฟอร์มแก้ไขคนงานคนนี้แล้วพาไปช่องที่ต้องกรอกเลย แทนการกลับไปหน้าแฟ้มเอกสาร
    if (needsManualEntry) openManualEntryForm('worker', activeFolderWorkerId, activeFolderDocType);
    else openWorkerFolderModal(activeFolderWorkerId);
}

// ==================== BULK IMPORT: นำเข้าเอกสารหลายไฟล์พร้อมกัน ====================
// จับคู่ไฟล์ -> คนงาน จากเลขประจำตัว 13 หลักในชื่อไฟล์ก่อน (มั่นใจสูง) ถ้าไม่เจอลองจับคู่จากชื่อคนในชื่อไฟล์ (มั่นใจกลาง)
// จับคู่ไฟล์ -> ประเภทเอกสาร จากคำสำคัญในชื่อไฟล์ — แถวที่จับคู่ไม่ได้ต้องให้ผู้ใช้เลือกเองก่อนนำเข้า (ไม่เดามั่ว)
const WORKER_DOC_TYPES = [
    { key: "worker-wp-doc", label: "ใบอนุญาตทำงาน", keywords: ["ใบอนุญาตทำงาน", "work permit", "workpermit", "อนุญาตทำงาน", "_wp_", "-wp-", " wp "] },
    { key: "worker-passport", label: "พาสปอร์ต/CI", keywords: ["passport", "พาสปอร์ต", "_ci_", "-ci-", " ci "] },
    { key: "worker-myanmar-id", label: "บัตรประชาชน/ทะเบียนบ้านพม่า", keywords: ["myanmar id", "myanmarid", "บัตรประชาชนพม่า", "ทะเบียนบ้าน"] },
    { key: "worker-pink-card", label: "บัตรชมพู", keywords: ["pink card", "pinkcard", "บัตรชมพู", "ชมพู"] },
    { key: "worker-receipt", label: "ใบเสร็จรับเงิน", keywords: ["receipt", "ใบเสร็จ"] },
    { key: "worker-medical", label: "ใบรับรองแพทย์", keywords: ["medical", "แพทย์", "รับรองแพทย์"] },
    { key: "worker-insurance-doc", label: "ประกัน", keywords: ["insurance", "ประกัน"] },
    { key: "worker-application", label: "ใบคำขอ", keywords: ["application", "คำขอ", "บต.46", "บต46"] }
];

function matchWorkerFromFilename(filename) {
    const base = filename.replace(/\.[^.]+$/, '');

    // 1) เลขประจำตัวคนต่างด้าว 13 หลักในชื่อไฟล์ตรงกับคนงานเป๊ะๆ = มั่นใจสูง
    const idMatch = base.match(/\d{13}/);
    if (idMatch) {
        const w = workers.find(item => item.workerUid === idMatch[0]);
        if (w) return { workerId: w.id, confidence: 'high' };
    }

    // 2) ชื่อคนงาน (ชื่อ+นามสกุล) ปรากฏอยู่ในชื่อไฟล์ = มั่นใจกลาง (เลือกตัวที่ชื่อยาวที่สุดที่ตรง กันชื่อสั้นชนกันมั่ว)
    const normalized = base.replace(/[_\-]+/g, ' ').toLowerCase().trim();
    let best = null;
    workers.forEach(w => {
        const fullName = `${w.firstName} ${w.lastName || ''}`.trim().toLowerCase();
        if (fullName && fullName.length >= 3 && normalized.includes(fullName)) {
            if (!best || fullName.length > best.nameLen) {
                best = { workerId: w.id, nameLen: fullName.length };
            }
        }
    });
    if (best) return { workerId: best.workerId, confidence: 'medium' };

    return { workerId: null, confidence: 'none' };
}

function matchDocTypeFromFilename(filename) {
    const base = filename.toLowerCase();
    // แปลงตัวคั่น (_ - . วงเล็บ) เป็นช่องว่างแล้วเติมช่องว่างหัวท้าย ให้คำย่ออย่าง " wp " / " ci " จับได้ทุกตำแหน่ง
    // เช่น "6689490000811_wp.pdf", "wp-6689490000811.jpg" (เดิมจับได้แค่ตอนมีตัวคั่นทั้ง 2 ข้าง เช่น "_wp_")
    const spaced = ` ${base.replace(/[_\-.()\[\]]+/g, ' ')} `;
    for (const dt of WORKER_DOC_TYPES) {
        if (dt.keywords.some(k => base.includes(k.toLowerCase()) || spaced.includes(k.toLowerCase()))) return dt.key;
    }
    return null;
}

let bulkImportRows = [];

// ==================== BULK IMPORT: ให้ AI อ่าน -> จับคู่คนงานเดิม / สร้างคนงานใหม่ ====================
// ขั้น "🤖 ให้ AI อ่านและจับคู่" อ่านทุกไฟล์ก่อน (ยังไม่เก็บไฟล์) เก็บผลไว้ที่ row.parsedData แล้วใช้ผลเดิมตอนนำเข้า
// (attachDocumentToWorker(..., preParsed)) — แต่ละไฟล์เรียก AI แค่ครั้งเดียว ไม่เปลืองโควตา
// ไฟล์ที่ไม่ตรงกับคนงานเดิมจะถูกรวมกลุ่มเป็น "คนงานใหม่" (bulkNewWorkers) ให้ตรวจ/แก้ก่อนสร้างจริงตอนกดนำเข้า
// row.workerId เป็นได้ทั้ง id คนงานเดิม หรือ "new:<id คนงานใหม่>"
const BULK_NEW_WORKER_PREFIX = 'new:';
let bulkNewWorkers = [];          // [{ id, keys: Set, data: {...ฟิลด์คนงานที่ AI เติมให้} }]
let bulkImportEmployerId = null;  // นายจ้างของคนงานใหม่ทุกคนในรอบนี้ (เลือก 1 รายต่อรอบ)
let bulkNewWorkerSeq = 0;

// ข้อความจาก AI/ชื่อไฟล์ที่ใส่ลง innerHTML — กันอักขระ HTML ทำหน้าเว็บพัง
function escapeHtml(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function normalizeIdForMatch(v) {
    return String(v || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

function normalizeNameForMatch(first, last) {
    return `${first || ''} ${last || ''}`.replace(/\s+/g, ' ').trim().toUpperCase();
}

// คีย์ที่ใช้จับคู่ไฟล์เข้าคนงาน — ใช้เฉพาะเลขที่เป็นของเอกสารประเภทนั้นจริง ๆ เท่านั้น
// (เช่น เลข 13 หลักบนบัตรชมพูไม่ใช่เลขประจำตัวคนต่างด้าวบนใบอนุญาตทำงาน จึงไม่เอามาเทียบกันเด็ดขาด)
// เอกสารต่างประเภทของคนเดียวกันเชื่อมกันผ่าน ชื่อ+วันเกิด
function getOcrMatchKeys(docType, p) {
    const keys = [];
    const add = (prefix, v) => { const n = normalizeIdForMatch(v); if (n.length >= 5) keys.push(prefix + n); };
    if (docType === 'worker-wp-doc') {
        add('uid:', p.uid);
        add('permit:', p.permitNo);
        add('ref:', p.refNo);
    } else if (docType === 'worker-passport' || docType === 'worker-visa') {
        add('passport:', p.passportNo);
    } else if (docType === 'worker-pink-card') {
        add('pink:', p.pinkCardNo);
    } else if (docType === 'worker-insurance-doc') {
        add('ins:', p.insuranceNo);
    } else if (docType === 'worker-receipt') {
        // ใบเสร็จกรมการจัดหางานพิมพ์เลขประจำตัวคนต่างด้าว/เลขพาสปอร์ตของคนงานไว้ (ไม่เอา permitNo — ช่องนั้นเป็นเลขที่ใบเสร็จ)
        add('uid:', p.uid);
        add('passport:', p.passportNo);
        add('ref:', p.refNo);
    }
    const dob = parseDateInput(p.dob);
    const name = normalizeNameForMatch(p.firstName, p.lastName);
    if (name && dob) keys.push(`nd:${name}|${dob}`);
    if (p.thaiName && dob) keys.push(`td:${String(p.thaiName).replace(/\s+/g, '')}|${dob}`);
    // เอกสารที่ไม่มีวันเกิด (เช่น ใบเสร็จ) — จับคู่ด้วยชื่ออย่างเดียวเป็นทางสุดท้าย (ใช้เฉพาะตอนชื่อตรงคนงานเดิมคนเดียว ดู matchBulkRowsFromOcr)
    if (!dob) {
        const nameKey = compactNameForMatch(p.firstName, p.lastName);
        if (nameKey) keys.push(`nm:${nameKey}`);
        if (p.thaiName) keys.push(`tn:${String(p.thaiName).replace(/\s+/g, '')}`);
    }
    return keys;
}

// ชื่อเต็มไม่มีช่องว่าง — ชื่อพม่าบางใบ AI แยกเป็นชื่อ/นามสกุล บางใบรวมเป็นชื่อเดียว ให้เทียบกันได้
function compactNameForMatch(first, last) {
    const n = `${first || ''}${last || ''}`.replace(/\s+/g, '').toUpperCase();
    return n.length >= 4 ? n : '';
}

function getWorkerMatchKeys(w) {
    const keys = [];
    const add = (prefix, v) => { const n = normalizeIdForMatch(v); if (n.length >= 5) keys.push(prefix + n); };
    add('uid:', w.workerUid);
    add('permit:', w.permitNo);
    add('ref:', w.refNo);
    add('passport:', w.passportNo);
    add('pink:', w.pinkCardNo);
    add('ins:', w.insuranceNo);
    const name = normalizeNameForMatch(w.firstName, w.lastName);
    if (name && w.dob) keys.push(`nd:${name}|${w.dob}`);
    if (w.thaiName && w.dob) keys.push(`td:${String(w.thaiName).replace(/\s+/g, '')}|${w.dob}`);
    const nameKey = compactNameForMatch(w.firstName, w.lastName);
    if (nameKey) keys.push(`nm:${nameKey}`);
    if (w.thaiName) keys.push(`tn:${String(w.thaiName).replace(/\s+/g, '')}`);
    return keys;
}

function describeMatchKey(key) {
    const prefix = key.split(':')[0];
    return { uid: 'เลขประจำตัว 13 หลัก', permit: 'เลขใบอนุญาต', ref: 'เลขอ้างอิง', passport: 'เลขพาสปอร์ต',
        pink: 'เลขบัตรชมพู', ins: 'เลขประกัน', nd: 'ชื่อ+วันเกิด', td: 'ชื่อไทย+วันเกิด', nm: 'ชื่อ', tn: 'ชื่อไทย' }[prefix] || 'ข้อมูลเอกสาร';
}

function isBulkNewWorkerId(workerId) {
    return typeof workerId === 'string' && workerId.startsWith(BULK_NEW_WORKER_PREFIX);
}

function findBulkNewWorker(workerId) {
    return bulkNewWorkers.find(c => BULK_NEW_WORKER_PREFIX + c.id === workerId);
}

// ช่องที่ต้องมีก่อนสร้างคนงาน — ตรงกับที่ saveWorker บังคับ (นายจ้างเลือกรวมทั้งรอบ)
function getBulkNewWorkerMissingFields(c) {
    const missing = [];
    if (!c.data.title) missing.push('title');
    if (!c.data.firstName) missing.push('firstName');
    if (!c.data.nationality) missing.push('nationality');
    if (!c.data.dob) missing.push('dob');
    return missing;
}

// ครอปรูปหน้าคนงานจากเอกสาร (ภาพ หรือหน้าแรกของ PDF) ตามกรอบที่ AI บอกมา (photoBox = [ymin, xmin, ymax, xmax] สเกล 0-1000)
// คืน data URL (jpeg) หรือ null ถ้าครอปไม่ได้ — ใช้เป็นรูปประจำตัวของคนงานใหม่ที่ Bulk Import สร้างให้
async function cropPhotoFromFile(file, box) {
    if (!Array.isArray(box) || box.length !== 4 || box.some(v => typeof v !== 'number')) return null;
    try {
        let source; // canvas หรือ <img> ของหน้าเต็ม
        if (file.type === 'application/pdf') {
            if (!window.pdfjsLib) return null;
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.5 }); // ความละเอียดพอให้รูปหน้าชัด
            source = document.createElement('canvas');
            source.width = viewport.width;
            source.height = viewport.height;
            await page.render({ canvasContext: source.getContext('2d'), viewport }).promise;
        } else {
            source = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = URL.createObjectURL(file);
            });
        }
        const W = source.width, H = source.height;
        const [ymin, xmin, ymax, xmax] = box.map(v => Math.min(1000, Math.max(0, v)) / 1000);
        if (xmax <= xmin || ymax <= ymin) return null;
        const padX = (xmax - xmin) * 0.06, padY = (ymax - ymin) * 0.06; // เผื่อขอบเล็กน้อย กันครอปติดหน้า
        const sx = Math.max(0, (xmin - padX) * W), sy = Math.max(0, (ymin - padY) * H);
        const sw = Math.min(W, (xmax + padX) * W) - sx, sh = Math.min(H, (ymax + padY) * H) - sy;
        if (sw < 20 || sh < 20) return null;
        const scale = Math.min(1, 400 / Math.max(sw, sh));
        const out = document.createElement('canvas');
        out.width = Math.round(sw * scale);
        out.height = Math.round(sh * scale);
        out.getContext('2d').drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height);
        if (source instanceof HTMLImageElement) URL.revokeObjectURL(source.src);
        return out.toDataURL('image/jpeg', 0.9);
    } catch (e) {
        console.warn('cropPhotoFromFile failed:', file && file.name, e);
        return null;
    }
}

// เลือกเอกสารที่จะใช้ครอปรูปหน้า: ใบอนุญาตทำงาน > บัตรชมพู > พาสปอร์ต > อื่น ๆ (ต้องมี photoBox จาก AI)
const PHOTO_SOURCE_PRIORITY = ['worker-wp-doc', 'worker-pink-card', 'worker-passport'];
function pickPhotoSourceRow(rows) {
    const withBox = rows.filter(r => r.parsedData && Array.isArray(r.parsedData.photoBox));
    const rank = r => { const i = PHOTO_SOURCE_PRIORITY.indexOf(r.docType); return i === -1 ? 99 : i; };
    return withBox.sort((a, b) => rank(a) - rank(b))[0] || null;
}

// ครอปรูปหน้าให้คนงานใหม่ที่ยังไม่มีรูป (ทำหลังจับคู่เสร็จ แสดงในการ์ดให้ตรวจก่อนสร้าง)
async function fillBulkNewWorkerPhotos() {
    for (const c of bulkNewWorkers) {
        if (c.photoDataUrl !== undefined) continue; // ครอปแล้ว (หรือครอปไม่ได้ = null)
        const row = pickPhotoSourceRow(bulkImportRows.filter(r => r.workerId === BULK_NEW_WORKER_PREFIX + c.id));
        c.photoDataUrl = row ? await cropPhotoFromFile(row.file, row.parsedData.photoBox) : null;
    }
    renderBulkNewWorkers();
}

// ลบคนงานใหม่ที่ไม่มีไฟล์ไหนชี้ถึงแล้ว (เช่น ผู้ใช้เปลี่ยนไฟล์ไปแนบคนงานเดิมหมด)
function pruneBulkNewWorkers() {
    bulkNewWorkers = bulkNewWorkers.filter(c => bulkImportRows.some(r => r.workerId === BULK_NEW_WORKER_PREFIX + c.id));
}

// ผล AI ของไฟล์ที่นำเข้าสำเร็จ: filled = AI เติมข้อมูลแล้ว / none = ประเภทเอกสารนี้ไม่ใช้ AI
// (AI อ่านไม่สำเร็จ = ไม่บันทึกไฟล์ ไปตกที่ catch ใน runBulkImport แทน ตั้ง aiStatus เป็น busy/failed ที่นั่น)
function getBulkImportAiStatus(uploadResult) {
    if (uploadResult && uploadResult.manualEntry) return 'manual'; // ผู้ใช้เลือก "บันทึกไฟล์ กรอกเอง"
    return uploadResult && uploadResult.ocrAttempted && uploadResult.parsedData ? 'filled' : 'none';
}

function openBulkImportModal() {
    bulkImportRows = [];
    bulkNewWorkers = [];
    presetSearchSelect('bulk-import-employer', null);
    const fileInput = document.getElementById('bulk-import-file-input');
    if (fileInput) fileInput.value = '';
    const progressEl = document.getElementById('bulk-import-progress');
    progressEl.classList.add('hidden');
    progressEl.innerHTML = '';
    renderBulkImportTable();
    document.getElementById('bulk-import-modal').classList.remove('hidden');
}

function closeBulkImportModal() {
    document.getElementById('bulk-import-modal').classList.add('hidden');
}

function handleBulkImportFilesSelected(fileList) {
    addFilesToBulkImport(Array.from(fileList || []));
}

// รองรับลากทั้งโฟลเดอร์มาวาง (ไม่ใช่แค่ไฟล์เดี่ยวๆ) ผ่าน FileSystem Entry API ของเบราว์เซอร์
function handleBulkImportDrop(event) {
    event.preventDefault();
    const dropzone = document.getElementById('bulk-import-dropzone');
    if (dropzone) dropzone.style.borderColor = '#cbd5e1';

    const items = event.dataTransfer.items;
    if (items && items.length > 0 && items[0].webkitGetAsEntry) {
        const entries = [];
        for (let i = 0; i < items.length; i++) {
            const entry = items[i].webkitGetAsEntry();
            if (entry) entries.push(entry);
        }
        readEntriesRecursively(entries).then(files => addFilesToBulkImport(files));
    } else {
        addFilesToBulkImport(Array.from(event.dataTransfer.files || []));
    }
}

function readEntriesRecursively(entries) {
    return Promise.all(entries.map(readEntry)).then(fileArrays => fileArrays.flat());
}

function readEntry(entry) {
    return new Promise((resolve) => {
        if (entry.isFile) {
            entry.file(file => resolve([file]), () => resolve([]));
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const collected = [];
            const readBatch = () => {
                reader.readEntries((batch) => {
                    if (batch.length === 0) {
                        readEntriesRecursively(collected).then(resolve);
                    } else {
                        collected.push(...batch);
                        readBatch();
                    }
                }, () => resolve([]));
            };
            readBatch();
        } else {
            resolve([]);
        }
    });
}

function addFilesToBulkImport(fileArray) {
    const validFiles = fileArray.filter(f => f && (f.type.startsWith('image/') || f.type === 'application/pdf'));
    validFiles.forEach(file => {
        const wMatch = matchWorkerFromFilename(file.name);
        const docType = matchDocTypeFromFilename(file.name);
        bulkImportRows.push({
            file,
            fileName: file.name,
            workerId: wMatch.workerId,
            confidence: wMatch.confidence,
            docType: docType,
            selected: !!(wMatch.workerId && docType),
            status: 'pending' // pending | success | failed
        });
    });
    renderBulkImportTable();
}

function renderBulkImportTable() {
    const tbody = document.getElementById('bulk-import-tbody');
    if (!tbody) return;

    const summary = document.getElementById('bulk-import-summary');

    if (bulkImportRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align:center; padding:20px;">ยังไม่ได้เลือกไฟล์</td></tr>`;
        if (summary) summary.style.display = 'none';
        syncBulkImportSelectAll();
        // ต้องวาดการ์ดคนงานใหม่ด้วย ไม่งั้นการ์ดเก่าค้างบนจอหลังลบไฟล์สุดท้าย/กดไม่สร้าง/เปิดหน้าต่างใหม่ และกดเอาออกไม่ได้
        pruneBulkNewWorkers();
        renderBulkNewWorkers();
        return;
    }

    tbody.innerHTML = bulkImportRows.map((row, idx) => {
        let statusBadge;
        if (row.status === 'pending' && row.ocrStatus === 'busy') statusBadge = '<span class="badge badge-warning" style="font-size:11.5px;" title="Gemini ไม่ว่างหรือโควตาหมด — กด ให้ AI อ่าน อีกครั้งทีหลัง หรือเลือกคนงาน/ประเภทเอง">' + icon("warn") + ' AI ไม่ว่าง</span>';
        else if (row.status === 'pending' && row.ocrStatus === 'failed') statusBadge = '<span class="badge badge-warning" style="font-size:11.5px;" title="AI อ่านเอกสารนี้ไม่ได้ — เลือกคนงาน/ประเภทเอง">' + icon("warn") + ' AI อ่านไม่ได้</span>';
        else if (row.status === 'pending' && isBulkNewWorkerId(row.workerId)) statusBadge = '<span class="badge badge-gold" style="font-size:11.5px;" title="ไม่พบคนงานนี้ในระบบ จะสร้างคนงานใหม่ตอนกดนำเข้า">' + icon("sparkles", "blue") + ' คนงานใหม่</span>';
        else if (row.status === 'pending' && row.matchNote) statusBadge = `<span class="badge badge-success" style="font-size:11.5px;" title="AI อ่านเอกสารแล้วจับคู่กับคนงานเดิมด้วย${row.matchNote}">${icon("bot")} ตรง${row.matchNote}</span>`;
        else if (row.status === 'failed' && row.aiStatus === 'busy') statusBadge = '<span class="badge badge-warning" style="font-size:11.5px;" title="Gemini มีผู้ใช้งานมาก ไฟล์นี้ยังไม่ได้บันทึก — กด นำเข้า อีกครั้งในอีกสักครู่">' + icon("warn") + ' ยังไม่บันทึก • AI ไม่ว่าง</span>';
        else if (row.status === 'failed' && row.aiStatus === 'failed') statusBadge = '<span class="badge badge-warning" style="font-size:11.5px;" title="AI อ่านเอกสารไม่ได้ ไฟล์นี้ยังไม่ได้บันทึก — ตรวจไฟล์แล้วลองใหม่">' + icon("warn") + ' ยังไม่บันทึก • AI อ่านไม่ได้</span>';
        else if (row.status === 'success' && row.aiStatus === 'manual') statusBadge = `<button type="button" class="btn btn-sm btn-outline" style="font-size:11.5px; padding:2px 8px; white-space:nowrap;" onclick="openManualEntryForm('worker', '${row.workerId}', '${row.docType}')" title="ไฟล์เข้าระบบแล้ว (ไม่ผ่าน AI) — กดเพื่อเปิดฟอร์มคนงานไปกรอกข้อมูล">${icon("sign")} กรอกข้อมูล</button>`;
        else if (row.status === 'success' && row.aiStatus === 'filled') statusBadge = '<span class="badge badge-success" style="font-size:11.5px;">' + icon("ok") + ' นำเข้าแล้ว • AI เติมข้อมูลแล้ว</span>';
        else if (row.status === 'success') statusBadge = '<span class="badge badge-success" style="font-size:11.5px;">' + icon("ok") + ' นำเข้าแล้ว</span>';
        else if (row.status === 'failed' && row.aiStatus === 'cancelled') statusBadge = '<span class="badge badge-warning" style="font-size:11.5px;" title="เลข 13 หลักในเอกสารไม่ตรงกับคนงานที่จับคู่ไว้ — เลือกไม่อัปโหลด ไฟล์นี้ไม่ได้บันทึก">' + icon("warn") + ' ไม่อัปโหลด • เลข 13 หลักไม่ตรง</span>';
        else if (row.status === 'failed') statusBadge = '<span class="badge badge-danger" style="font-size:11.5px;">' + icon("bad") + ' ล้มเหลว</span>';
        else if (row.confidence === 'high') statusBadge = '<span class="badge badge-success" style="font-size:11.5px;">' + icon("ok") + ' ตรงเลข 13 หลัก</span>';
        else if (row.confidence === 'medium') statusBadge = '<span class="badge badge-gold" style="font-size:11.5px;">' + icon("dot") + ' จับคู่จากชื่อ</span>';
        else statusBadge = '<span class="badge badge-danger" style="font-size:11.5px;">' + icon("bad") + ' ไม่พบคู่</span>';

        const rowStyle = (!row.workerId || !row.docType) && row.status === 'pending' ? 'background:#fef2f2;' : '';

        return `
            <tr style="${rowStyle}">
                <td><input type="checkbox" ${row.selected ? 'checked' : ''} ${row.status === 'success' ? 'disabled' : ''} onchange="setBulkImportRowSelected(${idx}, this.checked)"></td>
                <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${row.fileName}">${row.fileName}</td>
                <td>
                    <select style="font-size:12.5px; max-width:200px;" onchange="updateBulkImportWorker(${idx}, this.value)">
                        <option value="">--- เลือกคนงาน ---</option>
                        ${bulkNewWorkers.map((c, cIdx) => { const v = BULK_NEW_WORKER_PREFIX + c.id; return `<option value="${v}" ${row.workerId === v ? 'selected' : ''}>🆕 คนงานใหม่ #${cIdx + 1}: ${escapeHtml(`${c.data.firstName || '(ไม่มีชื่อ)'} ${c.data.lastName || ''}`.trim())}</option>`; }).join('')}
                        ${workers.map(w => `<option value="${w.id}" ${row.workerId === w.id ? 'selected' : ''}>${w.firstName} ${w.lastName || ''} (${w.workerUid || 'ไม่มีเลข'})</option>`).join('')}
                    </select>
                </td>
                <td>
                    <select style="font-size:12.5px;" onchange="updateBulkImportDocType(${idx}, this.value)">
                        <option value="">--- เลือกประเภท ---</option>
                        ${WORKER_DOC_TYPES.map(dt => `<option value="${dt.key}" ${row.docType === dt.key ? 'selected' : ''}>${dt.label}</option>`).join('')}
                    </select>
                </td>
                <td>${statusBadge}</td>
                <td><button type="button" class="action-icon-btn delete-btn" onclick="removeBulkImportRow(${idx})" title="ลบแถวนี้ออกจากรายการ">${icon("trash")}</button></td>
            </tr>
        `;
    }).join('');

    const matchedCount = bulkImportRows.filter(r => r.workerId && r.docType).length;
    if (summary) {
        summary.style.display = 'block';
        summary.innerHTML = `พบ ${bulkImportRows.length} ไฟล์ — จับคู่แล้ว ${matchedCount} ไฟล์ (เหลืออีก ${bulkImportRows.length - matchedCount} ไฟล์ที่ต้องเลือกเอง)` +
            (bulkNewWorkers.length > 0 ? ` • จะสร้างคนงานใหม่ ${bulkNewWorkers.length} คน` : '');
    }
    syncBulkImportSelectAll();
    renderBulkNewWorkers();
}

function updateBulkImportWorker(idx, workerId) {
    if (!bulkImportRows[idx]) return;
    bulkImportRows[idx].workerId = workerId || null;
    bulkImportRows[idx].workerManual = true; // ผู้ใช้เลือกเอง — จับคู่ AI รอบถัดไปจะไม่เขียนทับ
    bulkImportRows[idx].selected = !!(bulkImportRows[idx].workerId && bulkImportRows[idx].docType);
    pruneBulkNewWorkers();
    renderBulkImportTable();
}

// ==================== ขั้น "🤖 ให้ AI อ่านและจับคู่" ====================
// onlyUnattempted: ตอนกด "นำเข้า" ปุ่มเดียว อ่านเฉพาะไฟล์ที่ยังไม่เคยลองอ่าน (ไฟล์ที่ AI ไม่ว่างรอบก่อนไม่ต้องรอซ้ำ
// — กดปุ่ม "ให้ AI อ่านและจับคู่" เองเพื่อลองอ่านไฟล์พวกนั้นใหม่)
async function analyzeBulkImportWithAi(onlyUnattempted = false) {
    const rowsToRead = bulkImportRows.filter(r => r.status !== 'success' && !r.parsedData && (!onlyUnattempted || !r.ocrStatus));
    if (rowsToRead.length === 0) {
        if (!onlyUnattempted) showToast("ไม่มีไฟล์ที่ต้องให้ AI อ่าน (อ่านไปครบแล้ว)", "warning");
        return;
    }

    const btn = document.getElementById('btn-bulk-ai-analyze');
    const importBtn = document.getElementById('btn-run-bulk-import');
    btn.disabled = true;
    importBtn.disabled = true;
    const progressEl = document.getElementById('bulk-import-progress');
    progressEl.classList.remove('hidden');

    let readCount = 0;
    let consecutiveBusy = 0;
    let stoppedEarly = false;
    for (let i = 0; i < rowsToRead.length; i++) {
        const row = rowsToRead[i];
        progressEl.innerHTML = `${icon("bot")} AI กำลังอ่าน ${i + 1}/${rowsToRead.length}: ${escapeHtml(row.fileName)}...`;
        try {
            const dataUrl = await readFileAsDataUrl(row.file);
            const ocr = await window.supabaseAdapter.ocrDocument(dataUrl, 'worker-auto');
            if (ocr.parsedData) {
                row.parsedData = ocr.parsedData;
                row.ocrStatus = 'read';
                notifyEwpStatus(ocr.parsedData, row.fileName);
                consecutiveBusy = 0;
                readCount++;
                // ประเภทเอกสาร: ถ้ายังไม่รู้ (ชื่อไฟล์ไม่บอก) ใช้ที่ AI จำแนกให้
                const aiType = ocr.parsedData.documentType;
                if (!row.docType && WORKER_DOC_TYPES.some(dt => dt.key === aiType)) row.docType = aiType;
            } else {
                row.ocrStatus = ocr.ocrError === 'busy' ? 'busy' : 'failed';
                consecutiveBusy = row.ocrStatus === 'busy' ? consecutiveBusy + 1 : 0;
            }
        } catch (err) {
            console.error('Bulk AI read failed for', row.fileName, err);
            row.ocrStatus = 'failed';
        }
        renderBulkImportTable();
        // Gemini ไม่ว่าง/โควตาหมดติดกัน 2 ไฟล์ = ไฟล์ที่เหลือก็น่าจะไม่ผ่าน หยุดก่อนไม่ให้รอนานเปล่า ๆ
        if (consecutiveBusy >= 2) {
            stoppedEarly = i < rowsToRead.length - 1;
            break;
        }
    }

    progressEl.innerHTML = '' + icon("photo") + ' กำลังจับคู่คนงานและครอปรูปจากเอกสาร...';
    await matchBulkRowsFromOcr();
    btn.disabled = false;
    importBtn.disabled = false;

    const notRead = bulkImportRows.filter(r => r.status !== 'success' && !r.parsedData).length;
    progressEl.innerHTML = `${icon("bot")} AI อ่านแล้ว ${readCount} ไฟล์` +
        (bulkNewWorkers.length > 0 ? ` • พบคนงานใหม่ ${bulkNewWorkers.length} คน (ตรวจข้อมูลด้านบนก่อนกดนำเข้า)` : '') +
        (notRead > 0 ? ` • ${icon("warn")} ยังอ่านไม่ได้ ${notRead} ไฟล์${stoppedEarly ? ' (หยุดก่อนเพราะ AI ไม่ว่าง/โควตาหมด)' : ''} — กดให้ AI อ่านอีกครั้งทีหลัง หรือเลือกคนงาน/ประเภทเอง` : '');
}

// จับคู่ไฟล์ที่ AI อ่านแล้ว: ตรงกับคนงานเดิม -> แนบคนนั้น / ไม่ตรง -> รวมกลุ่มเป็นคนงานใหม่ (ไฟล์ของคนเดียวกันอยู่กลุ่มเดียวกัน)
function matchBulkRowsFromOcr() {
    const workerKeyIndex = new Map();
    const ambiguousNameKeys = new Set(); // ชื่อซ้ำกันหลายคนในระบบ — จับคู่ด้วยชื่ออย่างเดียวไม่ได้
    workers.forEach(w => getWorkerMatchKeys(w).forEach(k => {
        if (!workerKeyIndex.has(k)) workerKeyIndex.set(k, w.id);
        else if (/^(nm|tn):/.test(k) && workerKeyIndex.get(k) !== w.id) ambiguousNameKeys.add(k);
    }));
    ambiguousNameKeys.forEach(k => workerKeyIndex.delete(k));

    bulkImportRows.forEach(row => {
        if (row.status === 'success' || !row.parsedData || row.workerManual) return;
        // ชื่อไฟล์มีเลข 13 หลักตรงกับคนงานเดิมอยู่แล้ว (มั่นใจสูง) — คงไว้ ไม่ให้ AI ย้ายไปเป็นคนงานใหม่
        if (row.workerId && !isBulkNewWorkerId(row.workerId) && row.confidence === 'high') return;
        const keys = getOcrMatchKeys(row.docType, row.parsedData);

        // 1) คนงานที่มีอยู่แล้วในระบบ — เลขเอกสารก่อน แล้วค่อย ชื่อ+วันเกิด (ลำดับตาม getOcrMatchKeys)
        const hitKey = keys.find(k => workerKeyIndex.has(k));
        if (hitKey) {
            row.workerId = workerKeyIndex.get(hitKey);
            row.matchNote = describeMatchKey(hitKey);
            if (!row.selectManual) row.selected = !!row.docType; // ผู้ใช้ติ๊ก/เอาติ๊กออกเองแล้ว ไม่ทับ
            return;
        }

        // 2) คนงานใหม่ที่เจอแล้วในรอบนี้ (มีคีย์ร่วมกัน) หรือสร้างกลุ่มใหม่
        row.matchNote = null;
        let cand = bulkNewWorkers.find(c => keys.some(k => c.keys.has(k)));
        if (!cand) {
            cand = { id: String(++bulkNewWorkerSeq), keys: new Set(), data: { title: '', firstName: '', lastName: '', nationality: '', dob: '', status: 'pending_register' } };
            bulkNewWorkers.push(cand);
        }
        if (row.workerId !== BULK_NEW_WORKER_PREFIX + cand.id) {
            keys.forEach(k => cand.keys.add(k));
            // เติมข้อมูลจากเอกสารนี้ลงคนงานใหม่ — เติมเฉพาะช่องที่ยังว่าง ไม่ทับที่ผู้ใช้แก้ไว้หรือที่เอกสารก่อนหน้าเติมแล้ว
            const filled = {};
            applyOcrDataToWorker(filled, row.docType, row.parsedData);
            // applyOcrDataToWorker เติมชื่อ/สัญชาติเฉพาะจากใบอนุญาตทำงาน/บัตรพม่า — คนงานใหม่ที่มีแค่บัตรชมพู/พาสปอร์ต
            // ก็ต้องมีชื่อ ใช้ชื่อจากเอกสารใดก็ได้เป็นค่าตั้งต้น (ช่องที่ยังว่างเท่านั้น)
            const p = row.parsedData;
            if (!filled.firstName && p.firstName) { filled.firstName = p.firstName; filled.lastName = p.lastName || ''; }
            if (!filled.nationality && p.nationality) filled.nationality = p.nationality;
            if (filled.nationality === 'Myanmar' && filled.lastName) { filled.firstName = `${filled.firstName} ${filled.lastName}`.trim(); filled.lastName = ''; }
            // เอกสารส่วนใหญ่ไม่พิมพ์คำนำหน้า — เดาจากเพศเป็นค่าตั้งต้น (หญิง = นางสาว แก้เป็น นาง ได้ในการ์ด)
            const gender = filled.gender || cand.data.gender;
            if (!filled.title && !cand.data.title && gender) filled.title = gender === 'Female' ? 'นางสาว' : 'นาย';
            Object.entries(filled).forEach(([k, v]) => { if (v && !cand.data[k]) cand.data[k] = v; });
            row.workerId = BULK_NEW_WORKER_PREFIX + cand.id;
        }
        if (!row.selectManual) row.selected = !!row.docType; // ผู้ใช้ติ๊ก/เอาติ๊กออกเองแล้ว ไม่ทับ
    });

    pruneBulkNewWorkers();
    renderBulkImportTable();
    return fillBulkNewWorkerPhotos();
}

// การ์ด "คนงานใหม่ที่จะสร้าง" ด้านบนตาราง — แก้ข้อมูลที่ AI อ่านมาได้ก่อนสร้างจริง
function renderBulkNewWorkers() {
    const wrap = document.getElementById('bulk-import-new-workers-wrap');
    const list = document.getElementById('bulk-import-new-workers');
    if (!wrap || !list) return;
    wrap.classList.toggle('hidden', bulkNewWorkers.length === 0);
    if (bulkNewWorkers.length === 0) { list.innerHTML = ''; return; }

    const titleOpts = ['', 'นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง'];
    const natOpts = [['', '-- สัญชาติ --'], ['Myanmar', 'เมียนมา'], ['Cambodia', 'กัมพูชา'], ['Laos', 'ลาว'], ['Vietnam', 'เวียดนาม']];
    list.innerHTML = bulkNewWorkers.map((c, cIdx) => {
        const missing = getBulkNewWorkerMissingFields(c);
        const bad = f => missing.includes(f) ? ' bulk-new-worker-missing' : '';
        const fileCount = bulkImportRows.filter(r => r.workerId === BULK_NEW_WORKER_PREFIX + c.id).length;
        const d = c.data;
        return `
            <div class="bulk-new-worker-card">
                <div class="bulk-new-worker-head">
                    ${c.photoDataUrl ? `<img class="bulk-new-worker-photo" src="${c.photoDataUrl}" alt="" title="รูปที่ครอปจากเอกสาร — จะใช้เป็นรูปประจำตัวคนงาน">` : ''}
                    <strong>${icon("sparkles", "blue")} คนงานใหม่ #${cIdx + 1}</strong>
                    <span class="text-muted">${fileCount} ไฟล์${d.workerUid ? ` • เลข 13 หลัก ${escapeHtml(d.workerUid)}` : ''}${d.permitNo ? ` • ใบอนุญาต ${escapeHtml(d.permitNo)}` : ''}</span>
                    <button type="button" class="btn btn-sm btn-outline bulk-new-worker-discard" onclick="discardBulkNewWorker('${c.id}')" title="ไม่สร้างคนงานนี้ — ไฟล์ของคนนี้จะกลับไปให้เลือกคนงานเอง">ไม่สร้าง</button>
                </div>
                <div class="bulk-new-worker-fields">
                    <select class="${bad('title')}" onchange="updateBulkNewWorkerField('${c.id}', 'title', this.value)">
                        ${titleOpts.map(t => `<option value="${t}" ${d.title === t ? 'selected' : ''}>${t || '-- คำนำหน้า --'}</option>`).join('')}
                    </select>
                    <input type="text" class="${bad('firstName')}" placeholder="ชื่อ *" value="${escapeHtml(d.firstName || '')}" onchange="updateBulkNewWorkerField('${c.id}', 'firstName', this.value)">
                    <input type="text" placeholder="นามสกุล" value="${escapeHtml(d.lastName || '')}" onchange="updateBulkNewWorkerField('${c.id}', 'lastName', this.value)">
                    <select class="${bad('nationality')}" onchange="updateBulkNewWorkerField('${c.id}', 'nationality', this.value)">
                        ${natOpts.map(([v, l]) => `<option value="${v}" ${d.nationality === v ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                    <input type="text" class="${bad('dob')}" placeholder="วันเกิด วว/ดด/ปปปป *" value="${d.dob ? formatDateForInput(d.dob) : ''}" onchange="updateBulkNewWorkerField('${c.id}', 'dob', this.value)">
                    <input type="text" placeholder="เลขประจำตัว 13 หลัก" value="${escapeHtml(d.workerUid || '')}" onchange="updateBulkNewWorkerField('${c.id}', 'workerUid', this.value)">
                </div>
            </div>
        `;
    }).join('');
}

function updateBulkNewWorkerField(candId, field, value) {
    const c = bulkNewWorkers.find(x => x.id === candId);
    if (!c) return;
    value = String(value || '').trim();
    if (field === 'dob') {
        if (value && !isValidDate(value)) {
            showToast("⚠️ วันเกิดไม่ถูกต้อง (รูปแบบ วัน/เดือน/ปี ค.ศ. เช่น 15/08/1994)", "warning");
            renderBulkNewWorkers();
            return;
        }
        value = value ? parseDateInput(value) : '';
    }
    c.data[field] = value;
    renderBulkImportTable(); // ชื่อใน dropdown เลือกคนงานเปลี่ยนตาม
}

function discardBulkNewWorker(candId) {
    bulkImportRows.forEach(r => {
        if (r.workerId === BULK_NEW_WORKER_PREFIX + candId) {
            r.workerId = null;
            r.selected = false;
            r.workerManual = true; // ไม่ให้จับคู่อัตโนมัติกลับเข้ากลุ่มเดิมอีก
        }
    });
    bulkNewWorkers = bulkNewWorkers.filter(c => c.id !== candId);
    renderBulkImportTable();
}

// สร้างคนงานใหม่ที่ไฟล์ในรอบนี้ชี้ถึง (ก่อนแนบไฟล์) — คืน Map id ชั่วคราว -> id คนงานจริง
async function createBulkNewWorkers(candIds, progressEl) {
    const created = new Map();
    for (let i = 0; i < candIds.length; i++) {
        const c = findBulkNewWorker(BULK_NEW_WORKER_PREFIX + candIds[i]);
        if (!c) continue;
        progressEl.innerHTML = `${icon("user")} กำลังสร้างคนงานใหม่ ${i + 1}/${candIds.length}: ${escapeHtml(c.data.firstName)}...`;

        // กันสร้างซ้ำ: มีคนงานเลข 13 หลักนี้อยู่แล้ว (เช่น เพิ่มจากที่อื่นระหว่างรอ) ให้แนบคนเดิมแทน
        const uid = normalizeIdForMatch(c.data.workerUid);
        const existing = uid ? workers.find(w => normalizeIdForMatch(w.workerUid) === uid) : null;
        if (existing) { created.set(c.id, existing.id); continue; }

        const newId = `work-${Date.now()}${i}`;
        // รูปหน้าที่ครอปจากเอกสาร -> อัปโหลดขึ้น Storage แล้วใช้ลิงก์จริงเป็นรูปประจำตัว (อัปโหลดไม่ได้ก็สร้างคนงานต่อโดยไม่มีรูป)
        let photo = '';
        if (c.photoDataUrl) {
            const up = await uploadDocumentFile(c.photoDataUrl, `${c.data.firstName || 'worker'}_photo.jpg`, bulkImportEmployerId, newId);
            if (up && up.viewUrl) photo = up.viewUrl;
        }
        const workerData = {
            ...c.data,
            photo,
            id: newId,
            employerId: bulkImportEmployerId,
            workplace: getCustomerHQAddress(bulkImportEmployerId),
            attachments: {},
            status: 'pending_register', // เปลี่ยนเป็น active เองเมื่อมีใบอนุญาตทำงาน + ใบเสร็จ (ดู attachDocumentToWorker)
            skipNotifyEntry: false,
            createdAt: new Date().toISOString().split('T')[0]
        };
        const res = await callCloudAPI("saveWorker", { workerData });
        if (!res || res.status === "error") continue; // ไฟล์ของคนนี้จะขึ้นล้มเหลวในตาราง
        workers.push(workerData);
        created.set(c.id, workerData.id);
    }
    return created;
}

function updateBulkImportDocType(idx, docType) {
    if (!bulkImportRows[idx]) return;
    bulkImportRows[idx].docType = docType || null;
    bulkImportRows[idx].selected = !!(bulkImportRows[idx].workerId && bulkImportRows[idx].docType);
    renderBulkImportTable();
}

function removeBulkImportRow(idx) {
    bulkImportRows.splice(idx, 1);
    pruneBulkNewWorkers();
    renderBulkImportTable();
}

// ติ๊ก "เลือกทั้งหมด" = เลือกทุกไฟล์ที่ยังไม่ได้นำเข้า (เดิมเลือกได้เฉพาะแถวที่จับคู่คนงาน+ประเภทแล้ว
// ก่อนให้ AI อ่านจึงไม่มีแถวไหนถูกเลือกเลย) — แถวที่ยังขาดคนงาน/ประเภทตอนกดนำเข้าจะถูกข้ามและแจ้งจำนวนให้เห็น
function toggleAllBulkImportRows(checked) {
    bulkImportRows.forEach(r => {
        if (r.status === 'success') return;
        r.selected = checked;
        r.selectManual = true;
    });
    renderBulkImportTable();
}

function setBulkImportRowSelected(idx, checked) {
    const row = bulkImportRows[idx];
    if (!row) return;
    row.selected = checked;
    row.selectManual = true;
    syncBulkImportSelectAll();
}

// ช่องติ๊กหัวตาราง: ติ๊กเมื่อเลือกครบทุกไฟล์ที่ยังไม่ได้นำเข้า, ขีดกลางเมื่อเลือกบางไฟล์
function syncBulkImportSelectAll() {
    const el = document.getElementById('bulk-import-select-all');
    if (!el) return;
    const pending = bulkImportRows.filter(r => r.status !== 'success');
    const selectedCount = pending.filter(r => r.selected).length;
    el.checked = pending.length > 0 && selectedCount === pending.length;
    el.indeterminate = selectedCount > 0 && selectedCount < pending.length;
}

async function runBulkImport() {
    if (!can('ops')) {
        showToast("❌ ตำแหน่งนี้ไม่มีสิทธิ์นำเข้าเอกสาร", "danger");
        return;
    }

    // กดปุ่มเดียวจบ: ไฟล์ที่ยังไม่เคยให้ AI อ่าน -> อ่าน + จับคู่ + เตรียมคนงานใหม่ (พร้อมรูป) ก่อน แล้วค่อยนำเข้าต่อในรอบเดียวกัน
    if (bulkImportRows.some(r => r.status !== 'success' && !r.parsedData && !r.ocrStatus)) {
        await analyzeBulkImportWithAi(true);
    }

    const rowsToImport = bulkImportRows.filter(r => r.selected && r.workerId && r.docType && r.status !== 'success');
    // ไฟล์ที่ติ๊กไว้แต่ยังไม่รู้คนงาน/ประเภทเอกสาร (เช่น AI อ่านไม่ได้) — ข้ามไป แต่ต้องบอกให้รู้ ไม่เงียบหาย
    const skippedCount = bulkImportRows.filter(r => r.selected && r.status !== 'success' && !(r.workerId && r.docType)).length;
    if (rowsToImport.length === 0) {
        uiAlert('ไม่มีไฟล์ที่พร้อมนำเข้า — ไฟล์ที่ AI อ่านไม่ได้ ให้เลือกคนงานและประเภทเอกสารเองในตาราง');
        return;
    }

    // คนงานใหม่ที่ไฟล์ในรอบนี้ชี้ถึง — ต้องมีนายจ้างและข้อมูลที่จำเป็นครบก่อน ไม่งั้นไม่สร้าง
    const newCandIds = [...new Set(rowsToImport.filter(r => isBulkNewWorkerId(r.workerId)).map(r => r.workerId.slice(BULK_NEW_WORKER_PREFIX.length)))];
    if (newCandIds.length > 0) {
        if (!bulkImportEmployerId) {
            uiAlert('กรุณาเลือก "นายจ้างของคนงานใหม่" ก่อน (ช่องด้านบนรายการคนงานใหม่)');
            document.getElementById('bulk-import-employer-search').focus();
            return;
        }
        const incomplete = newCandIds.map(id => bulkNewWorkers.findIndex(c => c.id === id))
            .filter(i => i !== -1 && getBulkNewWorkerMissingFields(bulkNewWorkers[i]).length > 0);
        if (incomplete.length > 0) {
            uiAlert(`กรุณากรอกข้อมูลที่จำเป็น (คำนำหน้า ชื่อ สัญชาติ วันเกิด) ของคนงานใหม่ #${incomplete.map(i => i + 1).join(', #')} ให้ครบก่อน (ช่องที่ขอบแดง)`);
            return;
        }
    }

    const btn = document.getElementById('btn-run-bulk-import');
    btn.disabled = true;
    const aiBtn = document.getElementById('btn-bulk-ai-analyze');
    if (aiBtn) aiBtn.disabled = true;
    const progressEl = document.getElementById('bulk-import-progress');
    progressEl.classList.remove('hidden');

    // สร้างคนงานใหม่ก่อน แล้วชี้ไฟล์ของคนนั้นไปที่ id จริง
    let createdWorkerCount = 0;
    if (newCandIds.length > 0) {
        const created = await createBulkNewWorkers(newCandIds, progressEl);
        createdWorkerCount = created.size;
        rowsToImport.forEach(r => {
            if (!isBulkNewWorkerId(r.workerId)) return;
            const realId = created.get(r.workerId.slice(BULK_NEW_WORKER_PREFIX.length));
            if (realId) r.workerId = realId;
        });
        bulkNewWorkers = bulkNewWorkers.filter(c => !created.has(c.id));
    }

    let successCount = 0;
    let failCount = 0;
    beginAiRejectedBatch();

    for (let i = 0; i < rowsToImport.length; i++) {
        const row = rowsToImport[i];
        progressEl.innerHTML = `${icon("hourglass")} กำลังนำเข้า ${i + 1}/${rowsToImport.length}: ${escapeHtml(row.fileName)}...`;

        try {
            const fileContent = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(row.file);
            });

            const w = workers.find(item => item.id === row.workerId);
            if (!w) throw new Error(isBulkNewWorkerId(row.workerId) ? 'สร้างคนงานใหม่ไม่สำเร็จ' : 'ไม่พบคนงานที่จับคู่ไว้');

            // อ่านด้วย AI ไปแล้วในขั้น "ให้ AI อ่านและจับคู่" -> ใช้ผลเดิม ไม่เรียก AI ซ้ำ
            const uploadResult = await attachDocumentToWorker(w, row.docType, fileContent, row.parsedData || null);
            row.status = 'success';
            row.aiStatus = row.parsedData ? 'filled' : getBulkImportAiStatus(uploadResult);
            successCount++;
        } catch (err) {
            console.error('Bulk import failed for', row.fileName, err);
            row.status = 'failed';
            row.aiStatus = err && err.cancelled ? 'cancelled' : err && err.aiRejected ? (err.ocrError === 'busy' ? 'busy' : 'failed') : null;
            failCount++;
        }
        renderBulkImportTable();
    }

    endAiRejectedBatch();
    btn.disabled = false;
    if (aiBtn) aiBtn.disabled = false;
    renderBulkImportTable();
    const aiMissedCount = rowsToImport.filter(r => r.status === 'failed' && (r.aiStatus === 'busy' || r.aiStatus === 'failed')).length;
    progressEl.innerHTML = `${icon("ok")} เสร็จสิ้น: สำเร็จ ${successCount} รายการ${failCount > 0 ? `, ล้มเหลว ${failCount} รายการ (ดูสถานะรายไฟล์ในตาราง)` : ''}` +
        (createdWorkerCount > 0 ? ` • สร้างคนงานใหม่ ${createdWorkerCount} คน` : '') +
        (skippedCount > 0 ? ` • ${icon("warn")} ข้าม ${skippedCount} ไฟล์ที่ติ๊กไว้แต่ยังไม่ได้เลือกคนงาน/ประเภทเอกสาร (แถวสีแดง)` : '') +
        (aiMissedCount > 0 ? ` — ${icon("warn")} ${aiMissedCount} ไฟล์ AI อ่านไม่สำเร็จ จึงยังไม่ได้บันทึก (แถวสีเหลือง) กด "นำเข้าที่เลือกทั้งหมด" อีกครั้งเพื่อลองใหม่เฉพาะไฟล์เหล่านี้` : '');

    saveData();
    renderWorkers();
    renderDashboard();
    showToast(`นำเข้าเอกสารสำเร็จ ${successCount}/${rowsToImport.length} รายการ`, failCount > 0 ? 'warning' : 'success');

    // ไฟล์ที่เลือก "บันทึกไฟล์ กรอกเอง": ถ้าเป็นของคนงานคนเดียวกันทั้งหมด เปิดฟอร์มคนงานคนนั้นให้เลย
    // ถ้าหลายคน เปิดทีละคนไม่ได้ — ให้กดปุ่ม "✍️ กรอกข้อมูล" ในแต่ละแถวแทน
    const manualRows = rowsToImport.filter(r => r.status === 'success' && r.aiStatus === 'manual');
    const manualWorkerIds = [...new Set(manualRows.map(r => r.workerId))];
    if (manualWorkerIds.length === 1) {
        openManualEntryForm('worker', manualWorkerIds[0], manualRows[0].docType);
    } else if (manualWorkerIds.length > 1) {
        progressEl.innerHTML += ` — ${icon("sign")} มี ${manualRows.length} ไฟล์ที่ต้องกรอกข้อมูลเอง กดปุ่ม "กรอกข้อมูล" ในแต่ละแถว`;
    }
}

// Rename file inside folder modal
async function renameFolderFileIndex(docType, index, newName) {
    if (!can('ops')) return; // แก้/ลบ/แนบไฟล์ในแฟ้มคนงานได้เฉพาะเจ้าหน้าที่ (ไม่ใช่นายจ้าง)
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

            const res = await callCloudAPI("saveWorker", { workerData: w });
            if (!res || res.status === "error") {
                showToast("❌ เปลี่ยนชื่อไฟล์ไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
                openWorkerFolderModal(activeFolderWorkerId);
                return;
            }
            saveData();
            showToast("✏️ เปลี่ยนชื่อไฟล์เรียบร้อยแล้ว!", "success");

            openWorkerFolderModal(activeFolderWorkerId);
        }
    }
}

// เรียกตอนกดปุ่ม 🗑️ ในการ์ดไฟล์ — แค่เปิด modal ให้ดูว่ากำลังจะลบไฟล์ไหน ยังไม่ลบจริง (ดู performDeleteWorkerFolderFile)
function deleteFolderFileIndex(docType, index) {
    if (!can('ops')) return; // แก้/ลบ/แนบไฟล์ในแฟ้มคนงานได้เฉพาะเจ้าหน้าที่ (ไม่ใช่นายจ้าง)
    if (!activeFolderWorkerId) return;
    const w = workers.find(item => item.id === activeFolderWorkerId);
    const list = w ? getAttachments(w, docType) : [];
    openConfirmDeleteAttachmentModal('worker', docType, index, list[index]);
}

async function performDeleteWorkerFolderFile(docType, index) {
    const workerIdx = workers.findIndex(w => w.id === activeFolderWorkerId);
    if (workerIdx !== -1) {
        const w = workers[workerIdx];
        const list = getAttachments(w, docType);
        const removed = list.splice(index, 1)[0];

        w.attachments = w.attachments || {};
        if (list.length === 0) {
            delete w.attachments[docType];
        } else {
            w.attachments[docType] = list;
        }

        const res = await callCloudAPI("saveWorker", { workerData: w });
        if (!res || res.status === "error") {
            showToast("❌ ลบไฟล์ไม่สำเร็จ: " + (res && res.message ? res.message : "unknown error"), "danger");
            openWorkerFolderModal(activeFolderWorkerId);
            return;
        }
        saveData();
        if (removed) deleteStorageFileByUrl(removed.data);
        showToast("🗑️ ลบไฟล์ออกจากประวัติเรียบร้อยแล้ว", "success");

        openWorkerFolderModal(activeFolderWorkerId);
        renderWorkers();
        renderDashboard();
    }
}

// สร้าง/นำลิงก์แชร์ "ทั้งโฟลเดอร์" ของคนงาน 1 คนมาคัดลอก — เปิดดูได้โดยไม่ต้องล็อกอินเข้า WorkerOS
// (ใช้ share_token สุ่มผูกกับคนงานคนนั้น ผ่าน edge function share-worker-docs — ดู share.html)
async function shareWorkerFolder(workerId) {
    const w = workers.find(item => item.id === workerId);
    if (!w) return;

    let token = w.shareToken;
    if (!token) {
        token = crypto.randomUUID();
        w.shareToken = token;
        const res = await callCloudAPI("saveWorker", { workerData: w });
        if (!res || res.status === "error") {
            showToast("ไม่สามารถสร้างลิงก์แชร์ได้: " + (res && res.message ? res.message : "unknown error"), "error");
            return;
        }
        saveData();
    }

    const link = new URL(`share.html?w=${encodeURIComponent(workerId)}&t=${encodeURIComponent(token)}`, location.href).toString();
    navigator.clipboard.writeText(link).then(() => {
        showToast(`📋 คัดลอกลิงก์แชร์ทั้งโฟลเดอร์ของ ${w.firstName} เรียบร้อยแล้ว! ส่งให้ลูกค้าได้เลย ไม่ต้องล็อกอิน`, "success");
    }).catch(err => {
        uiAlert("ไม่สามารถคัดลอกได้: " + err);
    });
}

// ยกเลิกลิงก์แชร์เดิม (ลิงก์ที่เคยส่งไปแล้วจะใช้ไม่ได้อีก — ต้องกด "สร้างลิงก์แชร์" ใหม่ถ้าต้องการอันใหม่)
async function revokeWorkerShareLink(workerId) {
    const w = workers.find(item => item.id === workerId);
    if (!w || !w.shareToken) return;
    if (!(await uiConfirm(`ยกเลิกลิงก์แชร์ของ ${w.firstName}? ลิงก์เดิมที่เคยส่งให้ลูกค้าจะเปิดไม่ได้อีก`, { okText: "ยกเลิกลิงก์", card: dialogCardForWorker(w) }))) return;

    w.shareToken = null;
    const res = await callCloudAPI("saveWorker", { workerData: w });
    if (!res || res.status === "error") {
        showToast("ไม่สามารถยกเลิกลิงก์ได้: " + (res && res.message ? res.message : "unknown error"), "error");
        return;
    }
    saveData();
    showToast("🚫 ยกเลิกลิงก์แชร์เรียบร้อยแล้ว", "success");
}

// เอกสารที่ถือว่าคนงานแต่ละคนควรมีครบ ใช้ทั้งเช็ค isWorkerMissingDocs และแสดงรายการที่ขาดในหน้า Dashboard
const REQUIRED_WORKER_DOCS = [
    { type: 'worker-wp-doc', label: 'ใบอนุญาตทำงาน (WP)' },
    { type: 'worker-passport', label: 'พาสปอร์ต/CI' },
    { type: 'worker-myanmar-id', label: 'บัตรประชาชน/ทะเบียนบ้านพม่า' },
    { type: 'worker-medical', label: 'ใบรับรองแพทย์' },
    { type: 'worker-insurance-doc', label: 'ประกัน' },
];

function isWorkerMissingDocs(w) {
    if (w.status === 'archived') return false;
    return REQUIRED_WORKER_DOCS.some(doc => getAttachments(w, doc.type).length === 0);
}

const NATIONALITY_TH_LABELS = { Myanmar: 'เมียนมา พม่า', Cambodia: 'กัมพูชา เขมร', Laos: 'ลาว', Vietnam: 'เวียดนาม' };

// ค้นหาในตาราง "คนงานที่ยังไม่ได้แนบเอกสาร" — ครอบคลุม ชื่อเต็ม/ชื่อไทย/คำนำหน้า, เลขเอกสารทุกประเภท, สัญชาติ (ไทย/อังกฤษ),
// นายจ้าง (ชื่อ/เลขภาษี/เลขบัตรกรรมการ) และชื่อเอกสารที่ "ยังขาด" เช่น พิมพ์ "พาสปอร์ต" หรือ "wp" = คนที่ยังไม่มีเอกสารนั้น
function missingDocsWorkerMatchesQuery(w, query) {
    const emp = customers.find(c => c.id === w.employerId);
    const missingLabels = REQUIRED_WORKER_DOCS.filter(doc => getAttachments(w, doc.type).length === 0).map(doc => doc.label);
    const haystack = [
        `${w.title || ''} ${w.firstName || ''} ${w.lastName || ''}`,
        w.thaiName, w.workerUid, w.permitNo, w.passportNo, w.pinkCardNo, w.refNo, w.insuranceNo,
        w.nationality, NATIONALITY_TH_LABELS[w.nationality],
        emp && emp.companyName, emp && emp.taxId, emp && emp.directorId,
        ...missingLabels
    ].filter(Boolean).join(' | ').toLowerCase();
    // เลขที่พิมพ์มีขีด/ช่องว่างก็หาเจอ (เทียบแบบตัดตัวคั่นออกด้วย)
    const compactQuery = query.replace(/[\s-]/g, '');
    return haystack.includes(query) || (compactQuery.length >= 4 && haystack.replace(/[\s-]/g, '').includes(compactQuery));
}

function renderMissingDocsOverview() {
    const tbody = document.getElementById("dashboard-missing-docs-tbody");
    if (!tbody) return;

    const missingWorkers = workers.filter(w => isWorkerMissingDocs(w));

    // อัปเดตการ์ด KPI ด้านบนด้วยยอดจริงทั้งหมดเสมอ ไม่ผูกกับตัวกรองค้นหาของตารางด้านล่าง
    const cardNum = document.getElementById("stat-missing-docs");
    if (cardNum) cardNum.innerText = missingWorkers.length;

    const searchInput = document.getElementById("search-dashboard-missing-docs");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const filteredWorkers = missingWorkers.filter(w => !query || missingDocsWorkerMatchesQuery(w, query));

    const badge = document.getElementById("missing-docs-count-badge");
    if (badge) badge.innerText = `${filteredWorkers.length} คน`;

    if (filteredWorkers.length === 0) {
        const emptyMsg = query ? "" + icon("bad") + " ไม่พบคนงานตามคำค้นหา" : "" + icon("ok") + " คนงานทุกคนมีเอกสารแนบในระบบครบถ้วนแล้ว!";
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-muted" style="text-align: center; padding: 20px;">
                    ${emptyMsg}
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredWorkers.map(w => {
        const emp = customers.find(c => c.id === w.employerId);
        const empName = emp ? emp.companyName : "ไม่ระบุนายจ้าง";

        // ช่องติ๊กเอกสารที่ขาด — ✅ มีแล้ว / ❌ ยังไม่มี ต่อเอกสารแต่ละประเภท ดูครบทุกอย่างในแถวเดียว
        const docCells = REQUIRED_WORKER_DOCS.map(doc => {
            const has = getAttachments(w, doc.type).length > 0;
            return has
                ? `<td style="text-align: center; color: #16a34a;" title="${doc.label}: มีแล้ว">${icon("ok")}</td>`
                : `<td style="text-align: center; color: #dc2626;" title="${doc.label}: ขาด">${icon("bad")}</td>`;
        }).join('');

        const avatarUrl = w.photo ? w.photo : 'data:image/svg+xml;utf8,<svg xmlns=%22http:' + '/' + '/www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 width=%2232%22 height=%2232%22 fill=%22%2394a3b8%22><path d=%22M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 3.58-8 8v1h16v-1c0-4.42-3.58-8-8-8z%22/></svg>';

        // ดับเบิลคลิกแถวเพื่อเปิดดูข้อมูลคนงาน เหมือนตารางคนงานหลัก (ปุ่มเปิดแฟ้มใช้ stopPropagation ไม่ให้เปิดซ้อน)
        return `
            <tr class="clickable-row" ondblclick="handleRowDblClick(event) && openWorkerModal('${w.id}')" title="ดับเบิลคลิกเพื่อดูรายละเอียดคนงาน">
                <td style="width: 50px; text-align: center;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background-color: #f1f5f9; border: 1px solid #cbd5e1; display: inline-flex; align-items: center; justify-content: center;">
                        <img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                </td>
                <td>
                    <div><strong>${w.title ? w.title + ' ' : ''}${w.firstName} ${w.lastName || ''}</strong></div>
                    <small class="text-muted">เลขประจำตัว: ${w.workerUid || '-'}</small>
                </td>
                <td><span class="badge badge-gold">${w.nationality}</span></td>
                <td>${empName}</td>
                ${docCells}
                <td style="text-align: center;" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-gold btn-open-folder" onclick="openWorkerFolderModal('${w.id}')">
                        ${icon("folder")} เปิดแฟ้มเอกสาร
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== KANBAN BOARD SYSTEM ====================

// มุมมองหน้าระบบแจ้งงาน: table (ตาราง) / kanban (คัมบัง) / summary (สรุปงานสำหรับ Operation Manager)
function switchJobView(viewType) {
    currentJobView = viewType;
    const views = {
        table: { btn: "btn-job-view-table", box: "jobs-table-container" },
        kanban: { btn: "btn-job-view-kanban", box: "jobs-kanban-container" },
        summary: { btn: "btn-job-view-summary", box: "jobs-summary-container" }
    };
    Object.entries(views).forEach(([key, v]) => {
        const btn = document.getElementById(v.btn);
        const box = document.getElementById(v.box);
        const on = key === viewType;
        if (btn) {
            btn.className = on ? "btn btn-gold btn-sm" : "btn btn-outline btn-sm";
            btn.style.borderColor = on ? "" : "transparent";
            btn.style.color = on ? "" : "var(--text-dark)";
            btn.style.background = on ? "" : "transparent";
        }
        if (box) box.classList.toggle("hidden", !on);
    });
    const paginationBar = document.getElementById("jobs-pagination-bar");
    if (paginationBar) paginationBar.classList.toggle("hidden", viewType !== 'table');
    renderJobs();
}

function renderJobsKanban(filtered) {
    const containers = {
        "รอดำเนินการ": document.getElementById("kanban-pending"),
        "กำลังดำเนินการ": document.getElementById("kanban-progress"),
        "รอเอกสารเพิ่มเติม": document.getElementById("kanban-docs"),
        "ปิดงานแล้ว": document.getElementById("kanban-completed")
    };

    // Clear columns
    Object.values(containers).forEach(c => { if (c) c.innerHTML = ""; });

    // Group jobs by status
    const counts = {
        "รอดำเนินการ": 0,
        "กำลังดำเนินการ": 0,
        "รอเอกสารเพิ่มเติม": 0,
        "ปิดงานแล้ว": 0
    };
    let closedUnbilledCount = 0;

    filtered.forEach(j => {
        const displayStatus = j.status;

        // จบครบแล้วจริงๆ (ปิดงาน + ลูกค้าชำระเงินครบแล้ว) ไม่ต้องค้างโชว์บนบอร์ด Kanban อีกต่อไป —
        // ดูย้อนหลังได้ที่หน้ารายการ (ตาราง) หรือแท็บ "ออกบิล/รับเงิน" > ตัวกรอง "ชำระแล้ว"/"ทั้งหมด" แทน
        if (displayStatus === 'ปิดงานแล้ว' && (j.paymentStatus === 'ชำระเงินแล้ว' || isJobNoCharge(j))) return; // ไม่เรียกเก็บเงิน = จบครบเหมือนชำระแล้ว

        const container = containers[displayStatus] || containers["รอดำเนินการ"];
        if (container) {
            counts[displayStatus]++;
            const cust = customers.find(c => c.id === j.customerId);
            const work = workers.find(w => w.id === j.workerId);
            const custName = cust ? cust.companyName : "ไม่พบนายจ้าง";
            const custIdTitle = buildEmployerIdText(cust);
            const workName = work ? `${work.firstName} ${work.lastName} (${work.nationality})` : "ไม่พบคนงาน";
            const jobAgent = j.agentId ? agents.find(a => a.id === j.agentId) : null;

            // Payment badge — เป็นอิสระจากสถานะขั้นตอนงาน ออกบิลได้ตั้งแต่เปิดงาน
            const paymentStatus = j.paymentStatus || 'ยังไม่ออกบิล';
            // ปิดงานแล้วแต่ยังไม่ได้รับชำระ (ไม่ว่าจะออกบิลไปแล้วหรือยังไม่ออกก็ตาม) ถือเป็นเรื่องเร่งด่วนกว่างานที่ยังเปิดอยู่
            // (ซึ่งยังไม่ออกบิลถือว่าปกติ) — ต้องยังโชว์เด่นไว้จนกว่าลูกค้าจะชำระเงินครบจริง ๆ เท่านั้น
            const isClosedUnpaid = displayStatus === 'ปิดงานแล้ว' && paymentStatus !== 'ชำระเงินแล้ว' && paymentStatus !== JOB_NO_CHARGE;
            if (isClosedUnpaid) closedUnbilledCount++;

            let paymentBadge = `<span class="badge badge-warning" style="font-size: 11.5px; padding: 2px 6px;">${icon("hourglass")} ยังไม่ออกบิล</span>`;
            if (isClosedUnpaid && paymentStatus === 'ยังไม่ออกบิล') {
                paymentBadge = `<span class="badge badge-danger" style="font-size: 11.5px; padding: 2px 6px;">${icon("warn")} ยังไม่ออกบิล/ยังไม่ชำระ</span>`;
            } else if (isClosedUnpaid && paymentStatus === 'ออกบิลแล้ว') {
                paymentBadge = `<span class="badge badge-danger" style="font-size: 11.5px; padding: 2px 6px;">${icon("warn")} ออกบิลแล้ว รอชำระ</span>`;
            } else if (paymentStatus === 'ออกบิลแล้ว') {
                paymentBadge = `<span class="badge" style="font-size: 11.5px; padding: 2px 6px; background-color: #3b82f6; color: white;">${icon("receipt")} ออกบิลแล้ว</span>`;
            } else if (paymentStatus === 'ชำระเงินแล้ว') {
                paymentBadge = `<span class="badge badge-success" style="font-size: 11.5px; padding: 2px 6px;">${icon("ok")} ชำระเงินแล้ว</span>`;
            } else if (paymentStatus === JOB_NO_CHARGE) {
                paymentBadge = noChargeBadgeHtml(j);
            }

            // นายจ้างบางรายตั้งไว้ว่าต้องออกบิล+รับชำระก่อนถึงจะเริ่ม "กำลังดำเนินการ" ได้ (customers.requirePrepayment)
            const prepaymentBadge = (cust && cust.requirePrepayment && paymentStatus !== 'ชำระเงินแล้ว' && paymentStatus !== JOB_NO_CHARGE)
                ? `<div style="font-size: 11.5px;"><span class="badge" style="background-color: #fffbeb; color: #92400e; border: 1px solid #fde68a; font-size: 11.5px; padding: 2px 6px;" title="นายจ้าง &quot;${custName}&quot; ตั้งไว้ว่าต้องออกบิลและรับชำระเงินก่อนย้ายเข้ากำลังดำเนินการ">${icon("moneybag")} ต้องออกบิลและรับชำระเงินก่อน</span></div>`
                : '';

            let badgeClass = 'badge-gold';
            if (displayStatus === 'รอดำเนินการ') badgeClass = 'badge-warning';
            if (displayStatus === 'กำลังดำเนินการ') badgeClass = 'badge-gold';
            if (displayStatus === 'รอเอกสารเพิ่มเติม') badgeClass = 'badge-danger';
            if (displayStatus === 'ปิดงานแล้ว') badgeClass = 'badge-success';

            let actionBtns = "";
            if (canEditJob(j)) {
                actionBtns += `<button onclick="openJobModal('${j.id}')" style="background: none; border: none; cursor: pointer; font-size: 13.5px;" title="แก้ไขใบงาน">${icon("edit")}</button>`;
            }
            if (displayStatus === 'ปิดงานแล้ว') {
                actionBtns += `<button onclick="reopenJob('${j.id}')" style="background: none; border: none; cursor: pointer; font-size: 13.5px;" title="เปิดงานอีกครั้ง">${icon("unlock")}</button>`;
            } else if (canEditJob(j)) {
                actionBtns += `<button onclick="openJobCloseModal('${j.id}')" style="background: none; border: none; cursor: pointer; font-size: 13.5px;" title="แนบเอกสารและปิดงาน">${icon("clip")}</button>`;
            }

            // Strip prices for clean display of types
            const cleanJobType = (j.jobType || "").replace(/\s*\(\d+\)/g, "");

            // ป้ายบอกว่าใบงานนี้ถูกเปิดมาพร้อมกับงานอื่นในชุดเดียวกัน (batch เดียวกัน)
            const siblings = getJobBatchSiblings(j, true); // เฉพาะงานของคนงานคนนี้
            const batchTag = siblings.length > 0
                ? `<div style="font-size:11.5px; color:#4338ca; display:flex; align-items:center; gap:4px; flex-wrap:wrap;">${icon("clip")} ชุดเดียวกัน (${siblings.length + 1} งาน):
                    ${siblings.map(s => {
                        const sClean = (s.jobType || "").replace(/\s*\(\d+\)/g, "");
                        const dotColor = isJobStatusOpen(s.status) ? '#f59e0b' : '#22c55e';
                        return `<span title="${sClean}: ${s.status}" style="display:inline-flex; align-items:center; gap:3px; background:#eef2ff; border-radius:8px; padding:1px 6px;"><span style="width:5px;height:5px;border-radius:50%;background:${dotColor};display:inline-block;"></span>${sClean}</span>`;
                    }).join('')}
                   </div>`
                : '';

            const cardBorder = isClosedUnpaid ? '1px solid #fca5a5' : '1px solid #e2e8f0';
            const cardBg = isClosedUnpaid ? '#fef2f2' : 'white';
            container.innerHTML += `
                <div class="kanban-card" draggable="true" ondragstart="onKanbanDragStart(event, '${j.id}')" style="background: ${cardBg}; border-radius: 6px; padding: 12px; border: ${cardBorder}; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: grab; display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
                        <span style="font-weight: 700; font-size: 11.5px; color: var(--gold-dark);">${getJobDisplayNo(j)}</span>
                        <span class="badge badge-sm ${badgeClass}" style="font-size: 11.5px; padding: 1px 6px;">${cleanJobType}</span>
                    </div>
                    <div style="font-weight: 600; font-size: 13px; color: #1e293b; line-height: 1.4;">${icon("user")} ${workName}</div>
                    ${work && work.workerUid ? `<div style="font-size: 11.5px; color: #94a3b8; margin-top:-4px;">เลขประจำตัว: ${work.workerUid}</div>` : ''}
                    <div style="font-size: 12px; color: #64748b;" ${custIdTitle ? `title="${custIdTitle}"` : ''}>${icon("building")} ${custName}</div>
                    ${prepaymentBadge}
                    ${jobAgent ? `<div style="font-size: 11.5px; color: #64748b;">${icon("user")} Agent: ${jobAgent.name}</div>` : ''}
                    <div style="font-size: 11.5px; color: #94a3b8;">${icon("edit")} เปิดงานโดย: ${getUserNameById(j.openedBy)}${j.closedBy ? ` • ${icon("lock")} ปิดโดย: ${getUserNameById(j.closedBy)}` : ''}</div>
                    ${batchTag}
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 8px; border-top: 1px solid #f1f5f9;">
                        <div style="font-size: 12.5px; font-weight: 700; color: #0f172a;">${icon("moneybag")} ${j.fee.toLocaleString()} บ.</div>
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
    if (document.getElementById("count-kanban-completed")) document.getElementById("count-kanban-completed").innerText = counts["ปิดงานแล้ว"];

    const unbilledBadge = document.getElementById("count-kanban-completed-unbilled");
    if (unbilledBadge) {
        if (closedUnbilledCount > 0) {
            unbilledBadge.innerHTML = `${icon("warn")} ${closedUnbilledCount} ยังไม่ได้ชำระ`;
            unbilledBadge.style.display = "inline-block";
        } else {
            unbilledBadge.style.display = "none";
        }
    }
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
        if (!canEditJob(job)) {
            showToast("❌ ย้ายได้เฉพาะงานที่ตัวเองเปิดหรือได้รับมอบหมาย", "danger");
            return;
        }

        // "ปิดงานแล้ว" เข้าได้เฉพาะผ่านปุ่ม 📎 ปิดงาน (ต้องแนบเอกสารก่อน) ลากเข้าคอลัมน์นี้ตรงๆ ไม่ได้
        if (targetStatus === 'ปิดงานแล้ว') {
            showToast("📎 ปิดงานต้องแนบเอกสารก่อน — กดปุ่ม \"ปิดงาน\" ที่ใบงานแทนการลาก", "warning");
            renderJobs();
            return;
        }

        // ลูกค้าที่ตั้ง "ต้องชำระก่อนดำเนินการ" ไว้ — บล็อกการลากเข้า "กำลังดำเนินการ"
        // จนกว่าใบงานนี้จะออกบิล+รับชำระแล้วจริง
        const gateBlockReason = jobPrepaymentBlockReason(job.customerId, targetStatus, job.paymentStatus);
        if (gateBlockReason) {
            showToast(gateBlockReason, "danger");
            renderJobs();
            return;
        }

        // ป้องกันเปิดงานประเภทเดียวกันซ้อนกัน: ถ้าลากใบงานนี้กลับเข้าสถานะ "เปิดอยู่"
        // (เช่น ดึงงานที่ปิดแล้วกลับมาทำต่อ) และคนงานคนนี้มีงานประเภทเดียวกัน
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
        const oldClosedAt = job.closedAt;
        const oldClosedBy = job.closedBy;
        job.status = targetStatus;
        job.updatedAt = new Date().toISOString().split('T')[0];
        // ลากออกจาก "ปิดงานแล้ว" กลับมาทำต่อ = เปิดงานอีกครั้ง เคลียร์ข้อมูลการปิดงานเดิมทิ้ง
        if (oldStatus === 'ปิดงานแล้ว') {
            job.closedAt = null;
            job.closedBy = null;
        }

        showToast("🔄 กำลังอัปเดตสถานะในคลาวด์...", "warning");
        const res = await callCloudAPI("saveJob", { jobData: job });

        if (!res || res.status === "error") {
            // Revert the local status change since the cloud save failed
            job.status = oldStatus;
            job.closedAt = oldClosedAt;
            job.closedBy = oldClosedBy;
            renderJobs();
            showToast("❌ ย้ายสถานะไม่สำเร็จ: " + (res && res.message ? res.message : "ยังไม่ถูกบันทึกลงคลาวด์ กรุณาลองใหม่"), "danger");
            return;
        }

        saveData();
        renderJobs();
        showToast(`📋 ย้ายงาน ${getJobDisplayNo(job)} เป็น "${targetStatus}" สำเร็จ`, "success");
    }
}


// ==================== ACCOUNTING MODULE (บิล / รับเงิน / ใบเสร็จ / ยกเลิก) ====================
// ข้อมูล: invoices (บิลทุกใบ), payments (รับเงินหลายงวดต่อบิล), servicePrices (ราคามาตรฐานภายใน)
// ตาราง/คอลัมน์: supabase/migrations/20261001082230_accounting_ledger.sql
// หลักการ:
//   - สถานะบิล issued/partial/paid คำนวณจากยอดรับเงินที่ไม่ถูกยกเลิก (deriveInvoiceStatus) — void ตั้งเองตอนยกเลิกบิล
//   - ใบงานในบิลตามสถานะบิลเสมอ (syncJobsWithInvoice): ครบ → 'ชำระเงินแล้ว' + paidAt, ยกเลิก → ปลดออกจากบิล
//   - รายรับรายเดือนนับตาม payments.paidDate (วันที่เงินเข้าจริง) ไม่ใช่วันเปิดงาน
//   - เลขที่บิล/ใบเสร็จออกจากฐานข้อมูล (rpc next_doc_no) เรียงต่อเนื่องรายปี พ.ศ.

const INVOICE_STATUS_META = {
    draft:   { label: 'ร่าง (ยังไม่ออกบิล)', cls: 'badge-warning', icon: 'edit' },
    issued:  { label: 'ออกบิลแล้ว รอชำระ',   cls: 'badge-gold',    icon: 'receipt' },
    partial: { label: 'ชำระบางส่วน',          cls: 'badge-warning', icon: 'hourglass' },
    paid:    { label: 'ชำระครบแล้ว',          cls: 'badge-success', icon: 'ok' },
    void:    { label: 'ยกเลิกแล้ว',           cls: 'badge-danger',  icon: 'ban' }
};

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function fmtMoney(n) { return (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// วันที่ตามเวลาเครื่อง (ไม่ใช่ UTC) รูปแบบ YYYY-MM-DD — toISOString() จะเลื่อนวันผิดช่วงเช้ามืดเวลาไทย
function localDateISO(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// จำนวนเงินเป็นตัวอักษรภาษาไทย เช่น 12500.50 → "หนึ่งหมื่นสองพันห้าร้อยบาทห้าสิบสตางค์"
function bahtText(amount) {
    const n = round2(amount);
    const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
    const readGroup = (numStr) => {           // อ่านเลขไม่เกิน 6 หลัก
        let out = '';
        const len = numStr.length;
        for (let i = 0; i < len; i++) {
            const d = +numStr[i];
            const pos = len - i - 1;
            if (d === 0) continue;
            if (pos === 0 && d === 1 && len > 1) out += 'เอ็ด';
            else if (pos === 1 && d === 2) out += 'ยี่';
            else if (pos === 1 && d === 1) out += '';
            else out += digits[d];
            out += units[pos];
        }
        return out;
    };
    const readInt = (intStr) => {
        intStr = intStr.replace(/^0+/, '');
        if (!intStr) return '';
        if (intStr.length > 6) {
            const rest = intStr.slice(-6).replace(/^0+/, '');
            return readInt(intStr.slice(0, -6)) + 'ล้าน' + (rest === '1' ? 'เอ็ด' : readGroup(rest)); // 1,000,001 = หนึ่งล้านเอ็ด
        }
        return readGroup(intStr);
    };
    const [intPart, decPart] = n.toFixed(2).split('.');
    const bahtStr = readInt(intPart);
    const satang = parseInt(decPart, 10);
    if (!bahtStr && !satang) return 'ศูนย์บาทถ้วน';
    return (bahtStr ? bahtStr + 'บาท' : '') + (satang ? readInt(decPart) + 'สตางค์' : 'ถ้วน');
}

function livePaymentsOf(invoiceId) {
    return payments.filter(p => p.invoiceId === invoiceId && !p.voided);
}

function invoicePaidAmount(inv) {
    return inv ? round2(livePaymentsOf(inv.id).reduce((s, p) => s + (Number(p.amount) || 0), 0)) : 0;
}

function invoiceBalance(inv) {
    return inv ? Math.max(0, round2((Number(inv.grandTotal) || 0) - invoicePaidAmount(inv))) : 0;
}

function deriveInvoiceStatus(inv) {
    if (inv.status === 'void') return 'void';
    const paid = invoicePaidAmount(inv);
    if (paid <= 0) return 'issued';
    return paid + 0.005 >= (Number(inv.grandTotal) || 0) ? 'paid' : 'partial';
}

// บิลที่ใบงานนี้ผูกอยู่ (ไม่นับบิลที่ยกเลิกแล้ว)
function getJobInvoice(j) {
    if (!j || !j.invoiceId) return null;
    const inv = invoices.find(i => i.id === j.invoiceId);
    return inv && inv.status !== 'void' ? inv : null;
}

// ---------- งาน "ไม่เรียกเก็บเงิน" (2026-10-06) ----------
// งานที่ตั้งใจไม่คิดเงินลูกค้า — ไม่ต้องออกบิล 0 บาท, ไม่ขึ้นเตือนค้างออกบิล, ไม่มีค่าคอม Agent
// กด/ยกเลิกได้เฉพาะ Admin / Account Manager (can('finance')) — ฐานข้อมูลบังคับซ้ำด้วย trigger ใน 20261006090000_job_no_charge.sql
const JOB_NO_CHARGE = 'ไม่เรียกเก็บเงิน';
function isJobNoCharge(j) {
    return !!(j && j.paymentStatus === JOB_NO_CHARGE);
}

// ใบงานที่ยังต้องออกบิล = ยังไม่อยู่ในบิลใด และไม่ได้ตั้งเป็น "ไม่เรียกเก็บเงิน"
function jobAwaitingBill(j) {
    return !getJobInvoice(j) && !isJobNoCharge(j);
}

function noChargeBadgeHtml(j) {
    const tip = `ไม่เรียกเก็บเงิน: ${j.noChargeReason || '-'}${j.noChargeBy ? ` • โดย ${getUserNameById(j.noChargeBy)}` : ''}${j.noChargeAt ? ` • ${formatThaiDate(j.noChargeAt, true)}` : ''}`;
    return `<span class="badge badge-nocharge" title="${escapeHtml(tip)}">${icon("ok")} ไม่เรียกเก็บเงิน</span>`;
}

async function markJobNoCharge(jobId) {
    if (!can('finance')) return;
    const j = jobs.find(x => x.id === jobId);
    if (!j) return;
    if (getJobInvoice(j)) { uiAlert(`ใบงาน ${getJobDisplayNo(j)} อยู่ในบิลแล้ว — ต้องยกเลิกบิลก่อนถึงจะตั้งเป็น "ไม่เรียกเก็บเงิน" ได้`); return; }
    const reason = await uiPrompt(`ใบงาน ${getJobDisplayNo(j)} • ${getCleanJobTypeName(j.jobType)}\nจะไม่ออกบิลและไม่มีค่าคอม Agent สำหรับงานนี้ — กรุณาระบุเหตุผล`, {
        title: 'ไม่เรียกเก็บเงิน', okText: 'บันทึก', placeholder: 'เช่น แถมลูกค้าประจำ / แก้งานที่เราผิดเอง / รวมในบิลอื่นแล้ว' });
    if (reason === null || reason === undefined) return;
    if (!String(reason).trim()) { uiAlert('กรุณาระบุเหตุผลที่ไม่เรียกเก็บเงิน'); return; }
    const before = { ...j };
    j.paymentStatus = JOB_NO_CHARGE;
    j.noChargeReason = String(reason).trim();
    j.noChargeBy = currentUser.id || null;
    j.noChargeAt = new Date().toISOString();
    j.updatedAt = localDateISO(new Date());
    const r = await callCloudAPI("saveJob", { jobData: j });
    if (!r || r.status === "error") {
        Object.assign(j, before);
        showToast(`บันทึกไม่สำเร็จ: ${(r && r.message) || 'เชื่อมต่อไม่ได้'}`, "danger");
        return;
    }
    saveData();
    renderBillingTab();
    renderJobs();
    renderDashboard();
    showToast(`ตั้งใบงาน ${getJobDisplayNo(j)} เป็น "ไม่เรียกเก็บเงิน" แล้ว`, "success");
}

async function unmarkJobNoCharge(jobId) {
    if (!can('finance')) return;
    const j = jobs.find(x => x.id === jobId);
    if (!j || !isJobNoCharge(j)) return;
    if (!(await uiConfirm(`ยกเลิก "ไม่เรียกเก็บเงิน" ของใบงาน ${getJobDisplayNo(j)}?\nใบงานจะกลับเป็น "ยังไม่ออกบิล" และออกบิลได้ตามปกติ`, {
        title: 'กลับไปเรียกเก็บเงิน', okText: 'ยืนยัน', danger: false }))) return;
    const before = { ...j };
    j.paymentStatus = 'ยังไม่ออกบิล';
    j.noChargeReason = null;
    j.noChargeBy = null;
    j.noChargeAt = null;
    j.updatedAt = localDateISO(new Date());
    const r = await callCloudAPI("saveJob", { jobData: j });
    if (!r || r.status === "error") {
        Object.assign(j, before);
        showToast(`บันทึกไม่สำเร็จ: ${(r && r.message) || 'เชื่อมต่อไม่ได้'}`, "danger");
        return;
    }
    saveData();
    renderBillingTab();
    renderJobs();
    renderDashboard();
    showToast(`ใบงาน ${getJobDisplayNo(j)} กลับเป็น "ยังไม่ออกบิล" แล้ว`, "success");
}

function paymentMethodLabel(p) {
    if (!p || p.method === 'cash') return 'เงินสด';
    const b = banks.find(x => x.id === p.bankId);
    return b ? b.bankName : 'โอนเข้าบัญชี';
}

// ---------- ใบเสร็จ (เงินเข้า 1 ก้อน) / มัดจำ / เครดิตลูกค้า ----------
// receipts = เงินที่รับเข้าจริง 1 ครั้ง (สลิป 1 ชุด, เลข RC 1 เลข) → ตัดเข้าบิลได้หลายใบ (payments.receiptId)
// ส่วนที่ยังไม่ได้ตัดเข้าบิล = มัดจำ/เครดิตของลูกค้า หักบิลถัดไปได้ (applyCustomerCredit)
// payments เก่าที่ไม่มี receiptId = เงินเข้าของตัวเอง (เลข RC/สลิปอยู่ในแถวนั้น)
function paymentReceipt(p) {
    return p && p.receiptId ? receipts.find(r => r.id === p.receiptId) || null : null;
}

function paymentReceiptNo(p) {
    const r = paymentReceipt(p);
    return r ? r.receiptNo : (p ? p.receiptNo : '');
}

// ---------- สลิปรับเงิน (หน้าบิล "pay" / หน้าต่างรับเงิน-มัดจำ "receive") ----------
// แบบเดียวกับสลิปรายจ่าย: เลือกไฟล์ปุ๊บ อัปโหลด + AI (ocr-document, docType "payment-slip") อ่านทันที
// แล้วเติมยอดเงิน/วันที่โอน/บัญชีที่เงินเข้าในฟอร์มให้ตรวจก่อนบันทึก — ข้อมูลที่ AI อ่าน (เลขอ้างอิง/ผู้โอน/ธนาคาร)
// เก็บติดไปกับไฟล์ใน receipts.proof_urls[].slip
const paymentSlipState = { pay: [], receive: [] };
const PAYMENT_SLIP_FIELDS = {
    pay: { amount: 'pay-amount', date: 'pay-date', method: 'pay-method', customerId: () => (invoices.find(i => i.id === currentInvoiceId) || {}).customerId },
    receive: { amount: 'receive-amount', date: 'receive-date', method: 'receive-method', customerId: () => receiveCustomerId, after: () => distributeReceiveAmount() }
};

function paymentSlipBoxHtml(prefix) {
    return `
        <div class="upload-box highlight-box payment-slip-box" id="drop-${prefix}-slip" ondragover="dragOverHandler(event)" ondragleave="dragLeaveHandler(event)" ondrop="dropPaymentSlipHandler(event, '${prefix}')">
            <div class="upload-box-trigger">
                <input type="file" id="file-${prefix}-slip" class="file-input" accept="image/*,application/pdf" multiple onchange="paymentSlipFileSelected(event, '${prefix}')">
                <div class="upload-icon">${icon('receipt')}</div>
                <span class="doc-title">สลิปการโอนเงิน</span>
                <span class="upload-hint">ลากไฟล์วางที่นี่ หรือคลิกเพื่ออัปโหลด — AI อ่านยอดเงิน วันที่โอน และบัญชีที่เงินเข้าให้</span>
            </div>
            <div class="ocr-status" id="status-${prefix}-slip"></div>
        </div>
        <div class="payment-slip-list" id="${prefix}-slip-list">${paymentSlipListHtml(prefix)}</div>`;
}

function paymentSlipListHtml(prefix) {
    return paymentSlipState[prefix].map((s, i) => {
        const d = s.slip || {};
        const info = [d.amount ? `${fmtMoney(parseFloat(String(d.amount).replace(/,/g, '')) || 0)} บาท` : '', d.date || '', d.fromName ? `จาก ${d.fromName}` : '', d.transactionRef ? `อ้างอิง ${d.transactionRef}` : '']
            .filter(Boolean).join(' • ');
        return `<div class="payment-slip-item">
            <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${icon('clip')} ${escapeHtml(s.name)}</a>
            ${info ? `<small class="text-muted">${escapeHtml(info)}</small>` : ''}
            <button type="button" class="btn btn-sm btn-outline delete-btn" onclick="removePaymentSlip('${prefix}', ${i})">ลบ</button>
        </div>`;
    }).join('');
}

function resetPaymentSlips(prefix) {
    paymentSlipState[prefix] = [];
    const list = document.getElementById(`${prefix}-slip-list`);
    if (list) list.innerHTML = '';
    const status = document.getElementById(`status-${prefix}-slip`);
    if (status) status.innerHTML = '';
    const box = document.getElementById(`drop-${prefix}-slip`);
    if (box) box.classList.remove('success-upload');
    const input = document.getElementById(`file-${prefix}-slip`);
    if (input) input.value = '';
}

function removePaymentSlip(prefix, idx) {
    paymentSlipState[prefix].splice(idx, 1);
    const list = document.getElementById(`${prefix}-slip-list`);
    if (list) list.innerHTML = paymentSlipListHtml(prefix);
    if (!paymentSlipState[prefix].length) resetPaymentSlips(prefix);
}

function dropPaymentSlipHandler(e, prefix) {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length) processPaymentSlipFiles(prefix, Array.from(e.dataTransfer.files));
}

function paymentSlipFileSelected(e, prefix) {
    if (e.target.files && e.target.files.length) processPaymentSlipFiles(prefix, Array.from(e.target.files));
    e.target.value = ''; // เลือกไฟล์เดิมซ้ำได้ (ไฟล์ที่แนบแล้วอยู่ใน paymentSlipState)
}

async function processPaymentSlipFiles(prefix, files) {
    const f = PAYMENT_SLIP_FIELDS[prefix];
    const statusEl = document.getElementById(`status-${prefix}-slip`);
    const box = document.getElementById(`drop-${prefix}-slip`);
    let added = 0, readByAi = 0;
    for (const file of files) {
        if (statusEl) statusEl.innerHTML = `<span class="ai-processing">${icon("bot")} กำลังอัปโหลดและให้ AI อ่านสลิป "${escapeHtml(file.name)}"...</span>`;
        const dataUrl = await readFileAsDataUrl(file);
        const up = await uploadDocumentFile(dataUrl, file.name, f.customerId() || "", "", "payment-slip");
        if (!up || up.aiRejected || !up.fileUrl) {
            if (statusEl) statusEl.innerHTML = up && up.aiRejected
                ? `<span class="ai-error">${icon("warn", "amber")} ${getAiRejectedMessage(up.ocrError)}</span>`
                : `<span class="ai-error">${icon("bad")} อัปโหลด "${escapeHtml(file.name)}" ไม่สำเร็จ</span>`;
            continue;
        }
        paymentSlipState[prefix].push({ name: file.name, url: up.fileUrl, slip: up.parsedData || null });
        added++;
        if (up.parsedData) readByAi++;
    }
    const list = document.getElementById(`${prefix}-slip-list`);
    if (list) list.innerHTML = paymentSlipListHtml(prefix);
    if (!added) return;
    if (box) box.classList.add('success-upload');
    if (statusEl) statusEl.innerHTML = `<span class="ai-success">${icon("ok")} แนบสลิปแล้ว ${paymentSlipState[prefix].length} ไฟล์${readByAi ? ' — AI กรอกข้อมูลให้แล้ว กรุณาตรวจสอบ' : ''}</span>`;
    if (readByAi) applyPaymentSlipsToForm(prefix);
    warnDuplicatePaymentSlips(prefix);
}

// เติมฟอร์มจากสลิปทุกใบที่แนบ: ยอดเงิน = ผลรวมยอดทุกสลิป, วันที่ = วันที่โอนล่าสุด, บัญชีเงินเข้า = จับคู่เลขบัญชี/ชื่อธนาคาร
function applyPaymentSlipsToForm(prefix) {
    const f = PAYMENT_SLIP_FIELDS[prefix];
    const slips = paymentSlipState[prefix].map(s => s.slip).filter(Boolean);
    if (!slips.length) return;
    const amounts = slips.map(s => parseFloat(String(s.amount || '').replace(/,/g, ''))).filter(n => n > 0);
    if (amounts.length) document.getElementById(f.amount).value = round2(amounts.reduce((a, b) => a + b, 0));
    const dates = slips.map(s => parseDateInput(s.date || '')).filter(Boolean).sort();
    const today = localDateISO(new Date());
    if (dates.length) document.getElementById(f.date).value = dates[dates.length - 1] > today ? today : dates[dates.length - 1];
    const bank = slips.map(matchBankFromSlip).find(Boolean);
    const methodEl = document.getElementById(f.method);
    if (bank && methodEl && Array.from(methodEl.options).some(o => o.value === bank.id)) {
        methodEl.value = bank.id;
        methodEl.dispatchEvent(new Event('change'));
    }
    if (f.after) f.after();
}

// สลิปมักปิดเลขบัญชีบางหลัก (xxx-x-x1234-x) — เทียบเลขท้ายที่อ่านได้กับบัญชีของเรา ถ้าไม่ได้ค่อยเทียบชื่อธนาคาร
function matchBankFromSlip(slip) {
    if (!slip) return null;
    const digits = String(slip.toAccount || '').replace(/\D/g, '');
    if (digits.length >= 3) {
        const tail = digits.slice(-4);
        const hits = banks.filter(b => String(b.accountNumber || '').replace(/\D/g, '').includes(tail));
        if (hits.length === 1) return hits[0];
    }
    const name = String(slip.toBank || '').toLowerCase().replace(/\s+/g, '');
    if (name) {
        const hits = banks.filter(b => {
            const bn = String(b.bankName || '').toLowerCase().replace(/\s+/g, '');
            return bn && (bn.includes(name) || name.includes(bn));
        });
        if (hits.length === 1) return hits[0];
    }
    return null;
}

// สลิปเดียวกันเคยบันทึกรับเงินไปแล้ว (เลขอ้างอิงซ้ำ) → เตือน กันบันทึกเงินเข้าซ้ำ
function warnDuplicatePaymentSlips(prefix) {
    for (const s of paymentSlipState[prefix]) {
        const ref = s.slip && String(s.slip.transactionRef || '').trim();
        if (!ref) continue;
        const dup = receipts.find(r => !r.voided && (r.proofUrls || []).some(u => u.slip && String(u.slip.transactionRef || '').trim() === ref));
        if (dup) uiAlert(`สลิป "${s.name}" (เลขอ้างอิง ${ref}) เคยบันทึกรับเงินไปแล้วในใบเสร็จ ${dup.receiptNo || '-'} — ตรวจสอบก่อนบันทึกซ้ำ`, { title: 'สลิปนี้อาจถูกบันทึกแล้ว' });
    }
}

function paymentProofUrls(p) {
    const r = paymentReceipt(p);
    return [...(r ? r.proofUrls || [] : []), ...(p.proofUrls || [])];
}

function liveAllocationsOf(receiptId) {
    return payments.filter(p => p.receiptId === receiptId && !p.voided);
}

function receiptAppliedAmount(r) {
    return round2(liveAllocationsOf(r.id).reduce((s, p) => s + (Number(p.amount) || 0), 0));
}

function receiptUnapplied(r) {
    return !r || r.voided ? 0 : Math.max(0, round2((Number(r.amount) || 0) - receiptAppliedAmount(r)));
}

// ใบเสร็จที่ยังมีมัดจำเหลือของนายจ้างรายนี้ เก่าสุดก่อน (หักมัดจำเก่าก่อน)
function customerCreditReceipts(customerId) {
    if (!customerId) return [];
    return receipts.filter(r => r.customerId === customerId && receiptUnapplied(r) > 0)
        .sort((a, b) => (a.paidDate || '').localeCompare(b.paidDate || '') || (a.createdAt || '').localeCompare(b.createdAt || ''));
}

function customerCredit(customerId) {
    return round2(customerCreditReceipts(customerId).reduce((s, r) => s + receiptUnapplied(r), 0));
}

// เงินเข้าจริงทุกก้อน (ใช้นับยอดแบงค์/เงินสด) = ใบเสร็จที่ไม่ถูกยกเลิก + การรับเงินแบบเก่าที่ไม่มีใบเสร็จแยก
function moneyInEntries() {
    return [
        ...receipts.filter(r => !r.voided),
        ...payments.filter(p => !p.voided && !p.receiptId)
    ];
}

// ชื่อ/ที่อยู่/เลขภาษีของนายจ้างสำหรับหัวเอกสาร (สำนักงานใหญ่ หรือสาขาแรก)
function customerDocSnapshot(cust) {
    if (!cust) return { name: '', addr: '', tax: '' };
    const branches = cust.branches || [];
    const hq = branches.find(b => (b.name || '').includes("สำนักงานใหญ่")) || branches[0];
    return {
        name: cust.companyName || '',
        addr: hq ? `เลขที่ ${hq.houseNo} ม.${hq.moo} ต.${hq.subdistrict} อ.${hq.district} จ.${hq.province} ${hq.postalCode}` : "ไม่ระบุที่อยู่",
        tax: cust.taxId ? `เลขผู้เสียภาษี: ${cust.taxId}` : ''
    };
}

// หลังตัดยอด/ยกเลิกยอดของบิล → คำนวณสถานะใหม่ บันทึกบิล และให้ใบงานตามสถานะบิล คืนจำนวนใบงานที่อัปเดตไม่สำเร็จ
async function refreshInvoiceAfterPaymentChange(inv) {
    inv.status = deriveInvoiceStatus(inv);
    inv.updatedAt = new Date().toISOString();
    await callCloudAPI("saveInvoice", { invoiceData: { id: inv.id, invoiceNo: inv.invoiceNo, status: inv.status, updatedAt: inv.updatedAt } });
    return await syncJobsWithInvoice(inv);
}

function newPaymentId() { return 'pay-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// บันทึกเงินเข้า 1 ก้อน: อัปโหลดสลิป → ออกเลข RC → บันทึกใบเสร็จ → ตัดยอดเข้าบิลตาม allocations [{inv, amount}]
// ส่วนที่ไม่ได้ตัดเข้าบิลเป็นมัดจำของลูกค้า — ถ้าตัดเข้าบิลไหนไม่สำเร็จ เงินส่วนนั้นก็ยังอยู่เป็นมัดจำ ไม่หาย
// คืน { receipt, failedAllocs, jobFails } หรือ null ถ้ายังไม่ได้บันทึกอะไรเลย
// proofUploads = สลิปที่อัปโหลด + AI อ่านไว้แล้วตอนเลือกไฟล์ (paymentSlipState) — [{ name, url, slip }]
async function createReceiptWithAllocations({ customerId, snapshot, amount, paidDate, methodVal, note, proofUploads, allocations }) {
    const proofUrls = (proofUploads || []).map(u => u.slip ? { name: u.name, url: u.url, slip: u.slip } : { name: u.name, url: u.url });

    const noRes = await callCloudAPI("nextDocNo", { prefix: "RC" });
    if (!noRes || !noRes.docNo) return null;
    const method = methodVal === 'cash' ? 'cash' : 'bank';
    const bankId = methodVal === 'cash' ? null : methodVal;
    const receipt = {
        id: 'rcp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        receiptNo: noRes.docNo,
        customerId: customerId || null,
        customerName: snapshot.name || null,
        customerAddr: snapshot.addr || null,
        customerTax: snapshot.tax || null,
        amount: round2(amount),
        paidDate,
        method,
        bankId,
        proofUrls,
        note: note || null,
        voided: false,
        recordedBy: currentUser.id || null,
        createdAt: new Date().toISOString()
    };
    const res = await callCloudAPI("saveReceipt", { receiptData: receipt });
    if (!res || res.status === "error") return null;
    receipts.push(receipt);

    let failedAllocs = 0, jobFails = 0;
    for (const { inv, amount: allocAmount } of allocations || []) {
        const p = {
            id: newPaymentId(),
            invoiceId: inv.id,
            receiptId: receipt.id,
            amount: round2(allocAmount),
            paidDate,
            method,
            bankId,
            proofUrls: [],
            note: note || null,
            voided: false,
            recordedBy: currentUser.id || null,
            createdAt: new Date().toISOString()
        };
        const r = await callCloudAPI("savePayment", { paymentData: p });
        if (!r || r.status === "error") { failedAllocs++; continue; }
        payments.push(p);
        jobFails += await refreshInvoiceAfterPaymentChange(inv);
    }
    saveData();
    return { receipt, failedAllocs, jobFails };
}

// หักมัดจำ/เครดิตของนายจ้างเข้าบิล (มัดจำเก่าสุดก่อน) ไม่เกิน maxAmount — ไม่ออกใบเสร็จใหม่ เพราะออกตอนรับเงินมัดจำไปแล้ว
// วันที่ตัดยอด = วันนี้ (รายรับของบิลนับวันที่หักมัดจำ ส่วนยอดแบงค์นับตั้งแต่วันที่รับมัดจำจริง)
async function applyCustomerCredit(inv, maxAmount) {
    let remaining = round2(Math.min(maxAmount, invoiceBalance(inv)));
    let applied = 0;
    for (const r of customerCreditReceipts(inv.customerId)) {
        if (remaining <= 0) break;
        const take = round2(Math.min(remaining, receiptUnapplied(r)));
        if (take <= 0) continue;
        const p = {
            id: newPaymentId(),
            invoiceId: inv.id,
            receiptId: r.id,
            amount: take,
            paidDate: localDateISO(new Date()),
            method: r.method,
            bankId: r.bankId || null,
            proofUrls: [],
            note: `หักจากมัดจำ ${r.receiptNo || ''}`.trim(),
            voided: false,
            recordedBy: currentUser.id || null,
            createdAt: new Date().toISOString()
        };
        const res = await callCloudAPI("savePayment", { paymentData: p });
        if (!res || res.status === "error") break;
        payments.push(p);
        remaining = round2(remaining - take);
        applied = round2(applied + take);
    }
    const jobFails = applied > 0 ? await refreshInvoiceAfterPaymentChange(inv) : 0;
    saveData();
    return { applied, jobFails };
}

// ให้ใบงานทุกใบในบิลมีสถานะการเงินตรงกับบิล — บันทึกเฉพาะใบที่เปลี่ยนจริง
async function syncJobsWithInvoice(inv) {
    const live = livePaymentsOf(inv.id).sort((a, b) => (a.paidDate || '').localeCompare(b.paidDate || ''));
    const last = live[live.length - 1];
    let failCount = 0;
    for (const jobId of inv.jobIds || []) {
        const j = jobs.find(x => x.id === jobId);
        if (!j) continue;
        const before = { ...j };
        if (inv.status === 'void') {
            if (j.invoiceId === inv.id) { j.invoiceId = null; j.paymentStatus = 'ยังไม่ออกบิล'; j.paidAt = null; j.paidBy = null; j.paymentMethod = null; }
        } else if (inv.status === 'paid') {
            j.invoiceId = inv.id;
            j.paymentStatus = 'ชำระเงินแล้ว';
            j.paidAt = last ? new Date(`${last.paidDate}T12:00:00`).toISOString() : new Date().toISOString();
            j.paidBy = last ? (last.recordedBy || null) : (currentUser.id || null);
            j.paymentMethod = paymentMethodLabel(last);
        } else {
            j.invoiceId = inv.id;
            j.paymentStatus = 'ออกบิลแล้ว';
            j.paidAt = null;
            j.paidBy = null;
        }
        const changed = ['invoiceId', 'paymentStatus', 'paidAt', 'paidBy', 'paymentMethod'].some(k => (before[k] || null) !== (j[k] || null));
        if (!changed) continue;
        j.updatedAt = localDateISO(new Date());
        const r = await callCloudAPI("saveJob", { jobData: j });
        if (!r || r.status === "error") { Object.assign(j, before); failCount++; }
    }
    return failCount;
}

// หัวบิล (ตราประทับ) + ปุ่มท้ายหน้าต่าง + แผงรับเงิน ตามสถานะของบิลที่เปิดอยู่
function renderInvoiceStatusUi() {
    const inv = currentInvoiceId ? invoices.find(i => i.id === currentInvoiceId) : null;
    const status = inv ? inv.status : 'draft';
    const canManage = can('finance');
    const editable = isCurrentInvoiceEditable();

    const stamp = document.getElementById("inv-stamp");
    if (stamp) {
        stamp.className = 'invoice-stamp' + (status === 'paid' ? ' is-paid' : status === 'void' ? ' is-void' : ' hidden');
        stamp.textContent = status === 'paid' ? 'ชำระเงินครบแล้ว' : status === 'void' ? 'ยกเลิก' : '';
    }

    const meta = INVOICE_STATUS_META[status];
    const statusEl = document.getElementById("invoice-footer-status");
    if (statusEl) {
        const extra = status === 'void' && inv.voidReason ? ` — เหตุผล: ${escapeHtml(inv.voidReason)}`
            : status === 'draft' ? ' — ตรวจรายการและราคาแล้วกด "ออกบิล" เพื่อรับเลขที่'
            : (status === 'issued' || status === 'partial') ? ` — คงเหลือ ${fmtMoney(invoiceBalance(inv))} บาท` : '';
        statusEl.innerHTML = `<span class="badge badge-lg ${meta.cls}">${icon(meta.icon)} ${meta.label}</span><span class="invoice-footer-hint">${extra}</span>`;
    }

    const show = (id, on) => { const el = document.getElementById(id); if (el) el.classList.toggle('hidden', !on); };
    show('btn-issue-invoice', !inv && canManage);
    show('btn-save-invoice-edits', !!inv && editable && canManage);
    show('btn-void-invoice', !!inv && status !== 'void' && canManage);
    show('btn-delete-void-invoice', !!inv && status === 'void' && currentUser.role === 'admin');
    show('btn-restore-void-invoice', !!inv && status === 'void' && currentUser.role === 'admin');

    // ช่องแก้ไขข้อความบนหัวบิล (ชื่อ/ที่อยู่/กำหนดชำระ/หมายเหตุ) แก้ได้เฉพาะตอนแก้ไขบิลได้
    ['inv-cust-name', 'inv-cust-addr', 'inv-cust-tax', 'inv-due-date', 'inv-notes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('contenteditable', editable ? 'true' : 'false');
    });
    const bankSelect = document.getElementById("invoice-bank-select");
    if (bankSelect) bankSelect.disabled = !editable;

    renderInvoicePaymentsPanel(inv);
}

// แผง "การรับเงิน" ในบิลที่ออกแล้ว: ยอดบิล/รับแล้ว/คงเหลือ + ประวัติการรับเงิน (พิมพ์ใบเสร็จ/ยกเลิก) + ฟอร์มรับเงินงวดใหม่
function renderInvoicePaymentsPanel(inv) {
    const panel = document.getElementById("invoice-payments-panel");
    if (!panel) return;
    if (!inv) { panel.classList.add('hidden'); panel.innerHTML = ''; return; }
    panel.classList.remove('hidden');

    const canManage = can('finance');
    const isAdmin = can('voidMoney'); // ปุ่มยกเลิก/ถอนยอด — admin + account_manager
    const paid = invoicePaidAmount(inv);
    const balance = invoiceBalance(inv);
    const list = payments.filter(p => p.invoiceId === inv.id)
        .sort((a, b) => (a.paidDate || '').localeCompare(b.paidDate || '') || (a.createdAt || '').localeCompare(b.createdAt || ''));

    const rows = list.map((p, i) => {
        const r = paymentReceipt(p);
        // ใบเสร็จก้อนนี้ตัดหลายบิล / เป็นการหักมัดจำที่รับไว้ก่อน → บอกให้รู้ว่าเงินมาจากก้อนไหน
        const others = r ? payments.filter(x => x.receiptId === r.id && x.id !== p.id && !x.voided).length : 0;
        const fromDeposit = r && r.paidDate !== p.paidDate;
        const tag = fromDeposit ? `<br><small class="text-muted">หักจากมัดจำรับเมื่อ ${formatThaiDate(r.paidDate)}</small>`
            : others > 0 ? `<br><small class="text-muted">โอนรวม ${fmtMoney(r.amount)} บาท (ตัดบิลอื่นอีก ${others} ใบ)</small>` : '';
        const proofs = paymentProofUrls(p);
        return `
        <tr class="${p.voided ? 'is-voided' : ''}">
            <td>${i + 1}</td>
            <td>${formatThaiDate(p.paidDate)}</td>
            <td><strong>${escapeHtml(paymentReceiptNo(p) || '-')}</strong>${tag}${p.voided ? `<br><small class="text-danger">ยกเลิก: ${escapeHtml(p.voidReason || '-')}</small>` : ''}</td>
            <td>${p.method === 'cash' ? `${icon('cash')} เงินสด` : `${renderBankLogoBadge(paymentMethodLabel(p), 18)} ${escapeHtml(paymentMethodLabel(p))}`}</td>
            <td class="inv-num"><strong>${fmtMoney(p.amount)}</strong></td>
            <td>${proofs.map((f, k) => `<a href="${escapeHtml(f.url)}" target="_blank" rel="noopener" title="${escapeHtml(f.slip ? [f.slip.fromName && `ผู้โอน ${f.slip.fromName}`, f.slip.fromBank, f.slip.transactionRef && `อ้างอิง ${f.slip.transactionRef}`].filter(Boolean).join(' • ') : '')}">${icon('clip')} สลิป ${k + 1}</a>${f.slip && f.slip.transactionRef ? `<br><small class="text-muted">อ้างอิง ${escapeHtml(f.slip.transactionRef)}</small>` : ''}`).join(' ') || '-'}</td>
            <td class="pay-actions">
                ${p.voided ? '' : `<button type="button" class="btn btn-sm btn-outline" onclick="openReceiptModal('${p.id}')">${icon('print')} ใบเสร็จ</button>`}
                ${!p.voided && isAdmin && r && r.customerId ? `<button type="button" class="btn btn-sm btn-outline" onclick="unapplyPayment('${p.id}')" title="เงินยังอยู่ ย้ายไปเป็นมัดจำของลูกค้า">${icon('refresh')} ถอนออกจากบิล</button>` : ''}
                ${!p.voided && isAdmin ? `<button type="button" class="btn btn-sm btn-outline btn-danger-outline" onclick="${r ? `voidReceipt('${r.id}')` : `voidPayment('${p.id}')`}">${icon('ban')} ยกเลิก${r ? 'ใบเสร็จ' : ''}</button>` : ''}
            </td>
        </tr>`;
    }).join('');

    const canReceive = canManage && (inv.status === 'issued' || inv.status === 'partial') && balance > 0;
    const bankOptions = banks.map(b => bankOptionHtml(b)).join('');
    const credit = canReceive ? customerCredit(inv.customerId) : 0;
    const creditBox = credit > 0 ? `
        <div class="pay-credit-box">
            <div>${icon('cash')} นายจ้างรายนี้มี <strong>มัดจำ/เงินรับล่วงหน้าคงเหลือ ${fmtMoney(credit)} บาท</strong>
                <small class="text-muted">(${customerCreditReceipts(inv.customerId).map(r => escapeHtml(r.receiptNo || '-')).join(', ')})</small></div>
            <button type="button" class="btn btn-sm btn-gold" id="btn-apply-credit" onclick="applyCreditToCurrentInvoice()">${icon('ok')} หักมัดจำเข้าบิลนี้ ${fmtMoney(Math.min(credit, balance))} บาท</button>
        </div>` : '';
    const openInvoicesOfCustomer = inv.customerId ? invoices.filter(i => i.customerId === inv.customerId && (i.status === 'issued' || i.status === 'partial')).length : 0;

    panel.innerHTML = `
        <div class="pay-summary">
            <div><span>ยอดบิล</span><strong>${fmtMoney(inv.grandTotal)}</strong></div>
            <div class="is-paid"><span>รับแล้ว</span><strong>${fmtMoney(paid)}</strong></div>
            <div class="${balance > 0 ? 'is-due' : 'is-done'}"><span>คงเหลือ</span><strong>${fmtMoney(balance)}</strong></div>
        </div>
        <h4 class="pay-title">${icon('cash')} ประวัติการรับเงิน</h4>
        ${list.length ? `<div class="table-container pay-table-wrap"><table class="data-table pay-table">
            <thead><tr><th>#</th><th>วันที่รับ</th><th>เลขที่ใบเสร็จ</th><th>ช่องทาง</th><th class="inv-num">จำนวนเงิน</th><th>หลักฐาน</th><th></th></tr></thead>
            <tbody>${rows}</tbody></table></div>` : '<p class="text-muted pay-empty">ยังไม่มีการรับเงินสำหรับบิลนี้</p>'}
        ${creditBox}
        ${canReceive ? `
        <div class="pay-form">
            <h4 class="pay-title">${icon('plus')} บันทึกรับเงิน${paid > 0 ? ' (งวดถัดไป)' : ''}
                ${openInvoicesOfCustomer > 1 ? `<button type="button" class="btn btn-sm btn-outline pay-multi-btn" onclick="openReceiveMoneyModal('${inv.customerId}', '${inv.id}')">${icon('receipt')} ลูกค้าโอนรวมหลายบิล? รับเงินรวม</button>` : ''}</h4>
            <div class="pay-form-grid">
                <div class="form-group"><label for="pay-amount">จำนวนเงิน (บาท)</label>
                    <input type="number" id="pay-amount" min="0.01" step="0.01" value="${balance}"></div>
                <div class="form-group"><label for="pay-date">วันที่รับเงินจริง</label>
                    <input type="date" id="pay-date" value="${localDateISO(new Date())}" max="${localDateISO(new Date())}"></div>
                <div class="form-group"><label for="pay-method">รับเงินทาง</label>
                    <select id="pay-method">
                        ${BANK_SELECT_HEAD}${cashOptionHtml()}${bankOptions}</select></div>
                <div class="form-group"><label for="pay-note">หมายเหตุ</label>
                    <input type="text" id="pay-note" placeholder="เช่น มัดจำงวดแรก"></div>
            </div>
            <div class="form-group" id="pay-proof-wrap"><label>${icon('clip')} แนบหลักฐานการโอน (สลิป — AI อ่านและกรอกด้านบนให้อัตโนมัติ)</label>
                ${paymentSlipBoxHtml('pay')}</div>
            <div class="pay-form-actions">
                <span class="text-muted">รับไม่ครบยอดได้ (แบ่งจ่าย) ออกใบเสร็จให้ทุกงวด • รับเกินยอดได้ ส่วนเกินเก็บเป็นมัดจำของนายจ้างไว้หักบิลถัดไป</span>
                <button type="button" class="btn btn-gold" id="btn-record-payment" onclick="recordInvoicePayment()">${icon('ok')} บันทึกรับเงิน</button>
            </div>
        </div>` : ''}`;
}

// บันทึกรับเงินของบิลที่เปิดอยู่ → ใบเสร็จ 1 ใบ (RC-ปปปป-NNNN) → อัปเดตสถานะบิล + ใบงาน
// รับเกินยอดคงเหลือได้ — ส่วนเกินเก็บเป็นมัดจำของนายจ้าง (ต้องเป็นบิลที่ผูกนายจ้างในระบบ)
async function recordInvoicePayment() {
    const inv = currentInvoiceId ? invoices.find(i => i.id === currentInvoiceId) : null;
    if (!inv || !can('finance')) return;
    const balance = invoiceBalance(inv);
    const amount = round2(document.getElementById("pay-amount").value);
    const paidDate = document.getElementById("pay-date").value;
    const methodVal = document.getElementById("pay-method").value;
    const note = document.getElementById("pay-note").value.trim();
    const proofUploads = paymentSlipState.pay.slice();

    if (!(amount > 0)) { uiAlert("กรุณากรอกจำนวนเงินที่รับมากกว่า 0 บาท"); return; }
    if (!paidDate) { uiAlert("กรุณาเลือกวันที่รับเงิน"); return; }
    const excess = round2(amount - balance);
    if (excess > 0.005) {
        if (!inv.customerId) { uiAlert(`จำนวนเงินเกินยอดคงเหลือของบิล (${fmtMoney(balance)} บาท)\nบิลนี้ไม่ได้ผูกกับนายจ้างในระบบ จึงเก็บส่วนเกินเป็นมัดจำไม่ได้`); return; }
        if (!(await uiConfirm(`รับเงิน ${fmtMoney(amount)} บาท มากกว่ายอดคงเหลือของบิล ${fmtMoney(balance)} บาท\nส่วนเกิน ${fmtMoney(excess)} บาท จะเก็บเป็นมัดจำของ "${inv.customerName || '-'}" ไว้หักบิลถัดไป`, {
            title: 'รับเงินเกินยอดบิล', okText: 'บันทึก (เก็บส่วนเกินเป็นมัดจำ)', danger: false }))) return;
    }
    if (methodVal !== 'cash' && proofUploads.length === 0) {
        const bank = banks.find(b => b.id === methodVal);
        if (!(await uiConfirm("ยังไม่ได้แนบหลักฐานการโอนเงิน ต้องการบันทึกรับเงินโดยไม่มีหลักฐานหรือไม่?", { okText: "บันทึกรับเงิน", card: dialogCardForBank(bank) }))) return;
    }
    if (!(await confirmBeforeSave(document.querySelector(".pay-form"), `ตรวจสอบก่อนรับเงินบิล ${inv.invoiceNo}`, [{ label: "ยอดคงเหลือของบิล", value: `${fmtMoney(balance)} บาท` }]))) return;

    const btn = document.getElementById("btn-record-payment");
    if (btn) btn.disabled = true;
    try {
        const result = await createReceiptWithAllocations({
            customerId: inv.customerId,
            snapshot: { name: inv.customerName, addr: inv.customerAddr, tax: inv.customerTax },
            amount, paidDate, methodVal, note, proofUploads,
            allocations: [{ inv, amount: Math.min(amount, balance) }]
        });
        if (!result) return;
        resetPaymentSlips('pay');
        afterReceiptSaved(result);
    } finally {
        if (btn) btn.disabled = false;
    }
}

// รีเฟรชหน้าจอ + แจ้งผล + ถามพิมพ์ใบเสร็จ หลังบันทึกเงินเข้า 1 ก้อน
async function afterReceiptSaved({ receipt, failedAllocs, jobFails }) {
    renderBillingTab();
    renderJobs();
    renderDashboard();
    if (currentInvoiceId) { renderInvoiceItemsTable(); renderInvoiceStatusUi(); }
    const deposit = receiptUnapplied(receipt);
    if (failedAllocs > 0) {
        showToast(`⚠️ บันทึกใบเสร็จ ${receipt.receiptNo} แล้ว แต่ตัดยอดเข้าบิลไม่สำเร็จ ${failedAllocs} ใบ — ยอดส่วนนั้นอยู่ในมัดจำของลูกค้า กดหักมัดจำในบิลได้`, "danger");
    } else if (jobFails > 0) {
        showToast(`⚠️ บันทึกรับเงินแล้ว แต่อัปเดตใบงานไม่สำเร็จ ${jobFails} ใบ`, "danger");
    } else {
        showToast(`✅ บันทึกรับเงิน ${fmtMoney(receipt.amount)} บาท — ใบเสร็จเลขที่ ${receipt.receiptNo}${deposit > 0 ? ` (มัดจำ ${fmtMoney(deposit)} บาท)` : ''}`, "success");
    }
    if (await uiConfirm(`บันทึกรับเงินเรียบร้อยแล้ว\nใบเสร็จเลขที่ ${receipt.receiptNo}`, { title: 'พิมพ์ใบเสร็จเลยไหม?', okText: 'เปิดใบเสร็จ', cancelText: 'ไว้ทีหลัง', danger: false })) {
        openReceiptDoc(receipt.id);
    }
}

// ปุ่ม "หักมัดจำเข้าบิลนี้" ในแผงรับเงิน
async function applyCreditToCurrentInvoice() {
    const inv = currentInvoiceId ? invoices.find(i => i.id === currentInvoiceId) : null;
    if (!inv || !can('finance')) return;
    const take = Math.min(customerCredit(inv.customerId), invoiceBalance(inv));
    if (!(take > 0)) return;
    if (!(await uiConfirm(`หักมัดจำของ "${inv.customerName || '-'}" เข้าบิล ${inv.invoiceNo} จำนวน ${fmtMoney(take)} บาท`, {
        title: 'หักมัดจำเข้าบิล', okText: 'หักมัดจำ', danger: false }))) return;
    const btn = document.getElementById("btn-apply-credit");
    if (btn) btn.disabled = true;
    const { applied, jobFails } = await applyCustomerCredit(inv, take);
    renderBillingTab();
    renderJobs();
    renderDashboard();
    renderInvoiceItemsTable();
    renderInvoiceStatusUi();
    if (applied <= 0) showToast("❌ หักมัดจำไม่สำเร็จ", "danger");
    else showToast(jobFails > 0 ? `⚠️ หักมัดจำ ${fmtMoney(applied)} บาทแล้ว แต่อัปเดตใบงานไม่สำเร็จ ${jobFails} ใบ` : `✅ หักมัดจำ ${fmtMoney(applied)} บาท เข้าบิล ${inv.invoiceNo} แล้ว`, jobFails > 0 ? "danger" : "success");
}

function voidPatch(p, reason) {
    return { id: p.id, invoiceId: p.invoiceId, amount: p.amount, voided: true, voidReason: reason, voidedAt: new Date().toISOString(), voidedBy: currentUser.id || null };
}

function rerenderAfterVoid() {
    saveData();
    renderBillingTab();
    renderJobs();
    renderDashboard();
    if (currentInvoiceId) { renderInvoiceItemsTable(); renderInvoiceStatusUi(); }
}

// ยกเลิกการรับเงินแบบเก่า (ไม่มีใบเสร็จแยก) 1 งวด (admin) — ใบเสร็จเลขเดิมถูกยกเลิก ไม่ลบทิ้ง เพื่อให้ตรวจย้อนหลังได้
async function voidPayment(paymentId) {
    if (!can('voidMoney')) return;
    const p = payments.find(x => x.id === paymentId);
    const inv = p ? invoices.find(i => i.id === p.invoiceId) : null;
    if (!p || !inv || p.voided) return;
    const reason = await uiPrompt(`ยกเลิกการรับเงิน ${fmtMoney(p.amount)} บาท (ใบเสร็จ ${p.receiptNo || '-'})\nกรุณาระบุเหตุผล`, {
        title: 'ยกเลิกการรับเงิน', okText: 'ยกเลิกการรับเงิน', placeholder: 'เช่น บันทึกยอดผิด, เช็คเด้ง'
    });
    if (reason === null) return;
    if (!reason.trim()) { uiAlert("ต้องระบุเหตุผลในการยกเลิก"); return; }

    const patch = voidPatch(p, reason.trim());
    const res = await callCloudAPI("savePayment", { paymentData: patch });
    if (!res || res.status === "error") return;
    Object.assign(p, patch);
    await refreshInvoiceAfterPaymentChange(inv);
    await rerenderAfterVoid();
    showToast(`🗑️ ยกเลิกการรับเงินใบเสร็จ ${p.receiptNo || ''} แล้ว`, "success");
}

// ถอนยอดที่ตัดเข้าบิลออก (admin) — เงินยังอยู่ กลับไปเป็นมัดจำของนายจ้าง ใช้ตอนตัดผิดบิล/ต้องยกเลิกบิลไปออกใหม่
async function unapplyPayment(paymentId) {
    if (!can('voidMoney')) return;
    const p = payments.find(x => x.id === paymentId);
    const r = paymentReceipt(p);
    const inv = p ? invoices.find(i => i.id === p.invoiceId) : null;
    if (!p || !r || !inv || p.voided || !r.customerId) return;
    if (!(await uiConfirm(`ถอนยอด ${fmtMoney(p.amount)} บาท ออกจากบิล ${inv.invoiceNo}\nเงินยังอยู่ (ใบเสร็จ ${r.receiptNo || '-'}) และจะกลับไปเป็นมัดจำของ "${r.customerName || inv.customerName || '-'}" ไว้หักบิลอื่น`, {
        title: 'ถอนออกจากบิล', okText: 'ถอนออกจากบิล', danger: false }))) return;

    const patch = voidPatch(p, 'ถอนออกจากบิล (ย้ายไปเป็นมัดจำ)');
    const res = await callCloudAPI("savePayment", { paymentData: patch });
    if (!res || res.status === "error") return;
    Object.assign(p, patch);
    await refreshInvoiceAfterPaymentChange(inv);
    await rerenderAfterVoid();
    showToast(`↩️ ถอน ${fmtMoney(p.amount)} บาท ออกจากบิล ${inv.invoiceNo} แล้ว — มัดจำคงเหลือ ${fmtMoney(customerCredit(r.customerId))} บาท`, "success");
}

// ยกเลิกใบเสร็จทั้งใบ (admin) — เงินก้อนนี้ถือว่าไม่ได้รับจริง: ยกเลิกยอดที่ตัดเข้าทุกบิล + มัดจำที่เหลือ
async function voidReceipt(receiptId) {
    if (!can('voidMoney')) return;
    const r = receipts.find(x => x.id === receiptId);
    if (!r || r.voided) return;
    const allocs = liveAllocationsOf(r.id);
    const invNos = [...new Set(allocs.map(p => (invoices.find(i => i.id === p.invoiceId) || {}).invoiceNo).filter(Boolean))];
    const reason = await uiPrompt(`ยกเลิกใบเสร็จ ${r.receiptNo || '-'} ยอด ${fmtMoney(r.amount)} บาท\n${invNos.length ? `ยอดที่ตัดเข้าบิล ${invNos.join(', ')} จะถูกยกเลิกด้วย` : 'เป็นเงินมัดจำที่ยังไม่ได้หักบิล'}\n(ถ้าแค่ตัดผิดบิล ให้ใช้ "ถอนออกจากบิล" แทน)\nกรุณาระบุเหตุผล`, {
        title: 'ยกเลิกใบเสร็จ', okText: 'ยกเลิกใบเสร็จ', placeholder: 'เช่น บันทึกยอดผิด, เงินไม่เข้าจริง, คืนเงินลูกค้าแล้ว'
    });
    if (reason === null) return;
    if (!reason.trim()) { uiAlert("ต้องระบุเหตุผลในการยกเลิก"); return; }

    const touched = new Set();
    for (const p of allocs) {
        const patch = voidPatch(p, `ยกเลิกใบเสร็จ: ${reason.trim()}`);
        const res = await callCloudAPI("savePayment", { paymentData: patch });
        if (!res || res.status === "error") { showToast(`❌ ยกเลิกยอดในบิลไม่สำเร็จ — ใบเสร็จยังไม่ถูกยกเลิก`, "danger"); await rerenderAfterVoid(); return; }
        Object.assign(p, patch);
        touched.add(p.invoiceId);
    }
    const rPatch = { id: r.id, amount: r.amount, voided: true, voidReason: reason.trim(), voidedAt: new Date().toISOString(), voidedBy: currentUser.id || null };
    const res = await callCloudAPI("saveReceipt", { receiptData: rPatch });
    if (res && res.status !== "error") Object.assign(r, rPatch);
    for (const invId of touched) {
        const inv = invoices.find(i => i.id === invId);
        if (inv) await refreshInvoiceAfterPaymentChange(inv);
    }
    await rerenderAfterVoid();
    showToast(r.voided ? `🗑️ ยกเลิกใบเสร็จ ${r.receiptNo || ''} แล้ว` : `⚠️ ยกเลิกยอดในบิลแล้ว แต่บันทึกยกเลิกใบเสร็จไม่สำเร็จ`, r.voided ? "success" : "danger");
}

// ---------- รับเงินรวมหลายบิล / รับมัดจำ (หน้าต่าง receive-money-modal) ----------
// เลือกนายจ้าง → ติ๊กบิลค้างชำระ → กรอกยอดที่โอนจริง ระบบกระจายเข้าบิลเก่าสุดก่อน (แก้ยอดรายบิลเองได้)
// → ใบเสร็จ 1 ใบ สลิป 1 ชุด ส่วนที่เหลือเป็นมัดจำ
let receiveCustomerId = null;

function receiveOpenInvoices() {
    if (!receiveCustomerId) return [];
    return invoices.filter(i => i.customerId === receiveCustomerId && (i.status === 'issued' || i.status === 'partial') && invoiceBalance(i) > 0)
        .sort((a, b) => (a.issueDate || '').localeCompare(b.issueDate || '') || (a.invoiceNo || '').localeCompare(b.invoiceNo || ''));
}

function openReceiveMoneyModal(customerId, invoiceId) {
    if (!can('finance')) { showToast("❌ เฉพาะ Admin / Account Manager เท่านั้นที่บันทึกรับเงินได้", "danger"); return; }
    receiveCustomerId = null;
    document.getElementById("receive-cust-search").value = '';
    document.getElementById("receive-amount").value = '';
    document.getElementById("receive-date").value = localDateISO(new Date());
    document.getElementById("receive-date").max = localDateISO(new Date());
    document.getElementById("receive-method").innerHTML = BANK_SELECT_HEAD + cashOptionHtml() + banks.map(b => bankOptionHtml(b)).join('');
    document.getElementById("receive-note").value = '';
    paymentSlipState.receive = [];
    document.getElementById("receive-slip-box").innerHTML = paymentSlipBoxHtml('receive');
    document.getElementById("receive-body").classList.add('hidden');
    document.getElementById("btn-confirm-receive").disabled = true;
    document.getElementById("receive-money-modal").classList.remove("hidden");
    if (customerId) {
        selectSearchSelectItem('receive-customer', customerId);
        if (invoiceId) {
            // เปิดจากในบิล → ติ๊กบิลนั้นไว้ให้ก่อน
            document.querySelectorAll('input[name="receive-inv"]').forEach(cb => { cb.checked = cb.value === invoiceId; });
            onReceiveInvoiceToggle();
        }
    } else {
        document.getElementById("receive-cust-search").focus();
    }
}

function closeReceiveMoneyModal() {
    document.getElementById("receive-money-modal").classList.add("hidden");
    receiveCustomerId = null;
}

function renderReceiveInvoiceList() {
    const body = document.getElementById("receive-body");
    if (!receiveCustomerId) { body.classList.add('hidden'); document.getElementById("btn-confirm-receive").disabled = true; return; }
    body.classList.remove('hidden');
    const list = receiveOpenInvoices();
    document.getElementById("receive-invoice-list").innerHTML = list.length ? list.map(inv => `
        <label class="commission-job-row">
            <input type="checkbox" name="receive-inv" value="${inv.id}" onchange="onReceiveInvoiceToggle()">
            <span class="commission-job-info"><strong>${escapeHtml(inv.invoiceNo)} • ค้าง ${fmtMoney(invoiceBalance(inv))} บาท</strong>
                <small>ออกบิล ${formatThaiDate(inv.issueDate)} • ยอดบิล ${fmtMoney(inv.grandTotal)}${invoicePaidAmount(inv) > 0 ? ` • รับแล้ว ${fmtMoney(invoicePaidAmount(inv))}` : ''}${inv.bankId ? ` • บนบิลให้โอนเข้า ${escapeHtml((banks.find(b => b.id === inv.bankId) || {}).bankName || '-')}` : ''}</small></span>
            <input type="number" class="commission-amount-input" id="receive-alloc-${inv.id}" min="0" step="0.01" max="${invoiceBalance(inv)}" value="0" disabled oninput="updateReceiveSummary()">
        </label>`).join('')
        : `<p class="text-muted pay-empty">นายจ้างรายนี้ไม่มีบิลค้างชำระ — ยอดที่รับจะเก็บเป็นมัดจำทั้งหมด</p>`;

    const credit = customerCredit(receiveCustomerId);
    const note = document.getElementById("receive-credit-note");
    note.classList.toggle('hidden', credit <= 0);
    note.innerHTML = credit > 0 ? `${icon('cash')} นายจ้างรายนี้มีมัดจำคงเหลืออยู่แล้ว <strong>${fmtMoney(credit)} บาท</strong> — ถ้าจะใช้หักบิล ให้เปิดบิลนั้นแล้วกด "หักมัดจำเข้าบิลนี้"` : '';
    updateReceiveSummary();
}

// ติ๊ก/เอาติ๊กออก → ถ้ายังไม่ได้กรอกยอดรับ ตั้งเป็นยอดค้างรวมของบิลที่ติ๊ก แล้วกระจายยอดใหม่
function onReceiveInvoiceToggle() {
    const amountEl = document.getElementById("receive-amount");
    const checked = Array.from(document.querySelectorAll('input[name="receive-inv"]:checked'));
    if (!(Number(amountEl.value) > 0) || amountEl.dataset.auto === '1') {
        const sum = round2(checked.reduce((s, cb) => s + invoiceBalance(invoices.find(i => i.id === cb.value)), 0));
        amountEl.value = sum > 0 ? sum : '';
        amountEl.dataset.auto = '1';
    }
    distributeReceiveAmount(true);
}

// กระจายยอดที่รับเข้าบิลที่ติ๊ก เรียงบิลเก่าสุดก่อน (แต่ละบิลไม่เกินยอดค้าง)
function distributeReceiveAmount(fromToggle) {
    const amountEl = document.getElementById("receive-amount");
    if (!fromToggle) amountEl.dataset.auto = '0';
    let remaining = round2(amountEl.value);
    receiveOpenInvoices().forEach(inv => {
        const cb = document.querySelector(`input[name="receive-inv"][value="${inv.id}"]`);
        const input = document.getElementById(`receive-alloc-${inv.id}`);
        if (!cb || !input) return;
        input.disabled = !cb.checked;
        if (!cb.checked) { input.value = 0; return; }
        const take = Math.max(0, round2(Math.min(invoiceBalance(inv), remaining)));
        input.value = take;
        remaining = round2(remaining - take);
    });
    updateReceiveSummary();
}

function readReceiveAllocations() {
    return receiveOpenInvoices().map(inv => {
        const cb = document.querySelector(`input[name="receive-inv"][value="${inv.id}"]`);
        const input = document.getElementById(`receive-alloc-${inv.id}`);
        return { inv, amount: cb && cb.checked && input ? round2(input.value) : 0 };
    }).filter(a => a.amount > 0);
}

function updateReceiveSummary() {
    const amount = round2(document.getElementById("receive-amount").value);
    const allocs = readReceiveAllocations();
    const allocTotal = round2(allocs.reduce((s, a) => s + a.amount, 0));
    const over = allocs.find(a => a.amount > invoiceBalance(a.inv) + 0.005);
    const deposit = round2(amount - allocTotal);
    const el = document.getElementById("receive-summary");
    let err = '';
    if (over) err = `ยอดที่ตัดเข้าบิล ${over.inv.invoiceNo} เกินยอดค้าง (${fmtMoney(invoiceBalance(over.inv))} บาท)`;
    else if (deposit < -0.005) err = `ยอดที่ตัดเข้าบิลรวม ${fmtMoney(allocTotal)} บาท มากกว่ายอดเงินที่รับ ${fmtMoney(amount)} บาท`;
    el.innerHTML = err ? `<div class="receive-summary-error">${icon('warn')} ${err}</div>` : `
        <div><span>เงินที่รับ</span><strong>${fmtMoney(amount)}</strong></div>
        <div><span>ตัดเข้าบิล ${allocs.length} ใบ</span><strong>${fmtMoney(allocTotal)}</strong></div>
        <div class="${deposit > 0 ? 'is-deposit' : ''}"><span>เก็บเป็นมัดจำ</span><strong>${fmtMoney(Math.max(0, deposit))}</strong></div>`;
    document.getElementById("btn-confirm-receive").disabled = !!err || !(amount > 0);
}

async function confirmReceiveMoney() {
    const cust = customers.find(c => c.id === receiveCustomerId);
    if (!cust) { uiAlert("กรุณาเลือกนายจ้าง/ลูกค้า"); return; }
    const amount = round2(document.getElementById("receive-amount").value);
    const paidDate = document.getElementById("receive-date").value;
    const methodVal = document.getElementById("receive-method").value;
    const note = document.getElementById("receive-note").value.trim();
    const proofUploads = paymentSlipState.receive.slice();
    const allocs = readReceiveAllocations();
    const allocTotal = round2(allocs.reduce((s, a) => s + a.amount, 0));
    const deposit = round2(amount - allocTotal);

    if (!(amount > 0)) { uiAlert("กรุณากรอกยอดเงินที่ได้รับมากกว่า 0 บาท"); return; }
    if (!paidDate) { uiAlert("กรุณาเลือกวันที่เงินเข้า"); return; }
    if (deposit < -0.005 || allocs.some(a => a.amount > invoiceBalance(a.inv) + 0.005)) { updateReceiveSummary(); return; }
    const bank = banks.find(b => b.id === methodVal);
    const rows = [['ยอดรับ', `${fmtMoney(amount)} บาท`], ['รับทาง', bank ? bank.bankName : 'เงินสด'], ['วันที่', formatThaiDate(paidDate)]];
    if (allocs.length) rows.push(['ตัดบิล', allocs.map(a => `${a.inv.invoiceNo} (${fmtMoney(a.amount)})`).join(', ')]);
    if (deposit > 0) rows.push(['เก็บเป็นมัดจำ', `${fmtMoney(deposit)} บาท`]);
    if (!(await uiConfirm(methodVal !== 'cash' && proofUploads.length === 0 ? "ยังไม่ได้แนบสลิปการโอน — ยืนยันบันทึกรับเงินโดยไม่มีหลักฐานหรือไม่?" : "ตรวจสอบยอดก่อนบันทึก ระบบจะออกใบเสร็จ 1 ใบสำหรับเงินก้อนนี้", {
        title: 'ยืนยันรับเงิน', okText: 'บันทึกรับเงิน', danger: false,
        card: { imageIcon: 'cash', imageIconColor: 'teal', title: cust.companyName, subtitle: cust.taxId ? `ภาษี ${cust.taxId}` : '', rows }
    }))) return;

    const btn = document.getElementById("btn-confirm-receive");
    btn.disabled = true;
    try {
        // ใช้ชื่อ/ที่อยู่ตามบิลล่าสุดของนายจ้าง (ตรงกับที่ลูกค้าเห็นบนบิล) ถ้าไม่มีบิลใช้ข้อมูลนายจ้าง
        const refInv = allocs.length ? allocs[allocs.length - 1].inv : null;
        const snapshot = refInv ? { name: refInv.customerName, addr: refInv.customerAddr, tax: refInv.customerTax } : customerDocSnapshot(cust);
        const result = await createReceiptWithAllocations({
            customerId: cust.id, snapshot, amount, paidDate, methodVal,
            note: note || (allocs.length === 0 ? 'มัดจำ' : ''), proofUploads, allocations: allocs
        });
        if (!result) return;
        closeReceiveMoneyModal();
        afterReceiptSaved(result);
    } finally {
        btn.disabled = false;
    }
}

// แผง "มัดจำ / เงินรับล่วงหน้าคงค้าง" บนแท็บออกบิล — ใบเสร็จที่ยังมียอดไม่ได้หักบิล
function renderBillingCreditPanel() {
    const panel = document.getElementById("billing-credit-panel");
    if (!panel) return;
    const open = receipts.filter(r => receiptUnapplied(r) > 0)
        .sort((a, b) => (a.paidDate || '').localeCompare(b.paidDate || ''));
    if (open.length === 0) { panel.classList.add('hidden'); panel.innerHTML = ''; return; }
    const isAdmin = can('voidMoney');
    const total = round2(open.reduce((s, r) => s + receiptUnapplied(r), 0));
    panel.classList.remove('hidden');
    panel.innerHTML = `
        <h4 class="pay-title">${icon('cash')} มัดจำ / เงินรับล่วงหน้าคงค้าง <span class="badge badge-gold">${fmtMoney(total)} บาท</span></h4>
        <div class="table-container pay-table-wrap"><table class="data-table pay-table">
            <thead><tr><th>นายจ้าง</th><th>ใบเสร็จ</th><th>วันที่รับ</th><th class="inv-num">รับมา</th><th class="inv-num">หักบิลแล้ว</th><th class="inv-num">คงเหลือ</th><th></th></tr></thead>
            <tbody>${open.map(r => `
                <tr>
                    <td><strong>${escapeHtml(r.customerName || (customers.find(c => c.id === r.customerId) || {}).companyName || '-')}</strong></td>
                    <td>${escapeHtml(r.receiptNo || '-')}${r.note ? `<br><small class="text-muted">${escapeHtml(r.note)}</small>` : ''}</td>
                    <td>${formatThaiDate(r.paidDate)}</td>
                    <td class="inv-num">${fmtMoney(r.amount)}</td>
                    <td class="inv-num">${fmtMoney(receiptAppliedAmount(r))}</td>
                    <td class="inv-num"><strong>${fmtMoney(receiptUnapplied(r))}</strong></td>
                    <td class="pay-actions">
                        <button type="button" class="btn btn-sm btn-outline" onclick="openReceiptDoc('${r.id}')">${icon('print')} ใบเสร็จ</button>
                        ${isAdmin ? `<button type="button" class="btn btn-sm btn-outline btn-danger-outline" onclick="voidReceipt('${r.id}')">${icon('ban')} ยกเลิก</button>` : ''}
                    </td>
                </tr>`).join('')}</tbody>
        </table></div>
        <p class="text-muted pay-empty">หักมัดจำ: เปิดบิลของนายจ้างรายนั้นแล้วกด "หักมัดจำเข้าบิลนี้" — ระบบจะถามให้อัตโนมัติตอนออกบิลใหม่ด้วย</p>`;
}

function registerReceiveMoneySearchSelect() {
    registerSearchSelect('receive-customer', {
        inputId: 'receive-cust-search',
        getValue: () => receiveCustomerId,
        setValue: (v) => { receiveCustomerId = v || null; },
        getPool: () => customers,
        getId: c => c.id,
        getLabel: c => c.companyName,
        getSub: c => c.taxId ? 'ภาษี ' + c.taxId : '',
        getBadge: c => {
            const n = invoices.filter(i => i.customerId === c.id && (i.status === 'issued' || i.status === 'partial')).length;
            return n ? `ค้าง ${n} บิล` : '';
        },
        emptyText: 'ไม่พบนายจ้างที่ตรงกับคำค้นหา',
        onSelect: () => { document.getElementById("receive-amount").value = ''; renderReceiveInvoiceList(); },
        onClear: () => renderReceiveInvoiceList()
    });
}

// ยกเลิกบิล (admin/manager) — ต้องยกเลิกการรับเงินทุกงวดก่อน; ใบงานกลับเป็น "ยังไม่ออกบิล" ออกบิลใหม่ได้
// Admin กู้คืนบิลที่ยกเลิกไปแล้ว (ยกเลิกผิดใบ) — บิลกลับมาเป็น "ออกบิลแล้ว" + ผูกใบงานกลับ (syncJobsWithInvoice)
// ตรวจก่อนเสมอ: ใบงานในบิลต้องยังอยู่ ยังไม่ถูกออกบิลใหม่ไปแล้ว และไม่ได้ตั้งเป็น "ไม่เรียกเก็บเงิน" ไม่งั้นใบงานจะซ้ำใน 2 บิล
// การรับเงินที่ยกเลิก/ถอนออกไปก่อนยกเลิกบิลไม่กลับมาเอง — เงินที่ถอนไว้ยังเป็นมัดจำ หักเข้าบิลนี้ได้ตอนกู้คืน
async function restoreVoidInvoice(invoiceId) {
    if (currentUser.role !== 'admin') { showToast("❌ เฉพาะ Admin เท่านั้น", "danger"); return; }
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv || inv.status !== 'void') { uiAlert("กู้คืนได้เฉพาะบิลที่ยกเลิกแล้ว"); return; }

    const problems = [];
    const jobList = [];
    (inv.jobIds || []).forEach(id => {
        const j = jobs.find(x => x.id === id);
        if (!j) { problems.push(`• ใบงาน ${id} ถูกลบไปแล้ว`); return; }
        const other = getJobInvoice(j);
        if (other && other.id !== inv.id) problems.push(`• ${getJobDisplayNo(j)} ถูกออกบิลใหม่แล้ว (${other.invoiceNo})`);
        else if (isJobNoCharge(j)) problems.push(`• ${getJobDisplayNo(j)} ตั้งเป็น "ไม่เรียกเก็บเงิน" แล้ว`);
        jobList.push(`${getJobDisplayNo(j)} • ${getCleanJobTypeName(j.jobType)}`);
    });
    if (problems.length) {
        uiAlert(`กู้คืนบิล ${inv.invoiceNo} ไม่ได้ — ใบงานในบิลนี้จะซ้ำกับบิลอื่น:\n\n${problems.join('\n')}\n\nถ้าต้องการใช้บิลนี้จริง ให้ยกเลิกบิลใหม่ (หรือยกเลิก "ไม่เรียกเก็บเงิน") ของใบงานเหล่านี้ก่อน`, { title: 'กู้คืนบิลไม่ได้' });
        return;
    }

    if (!(await uiConfirm(`กู้คืนบิล ${inv.invoiceNo} ให้กลับมาใช้งาน?\n` +
        `บิลจะกลับเป็น "ออกบิลแล้ว (รอชำระ)" และใบงานในบิลจะถูกผูกกลับ — ลูกค้าจะเห็นยอดค้างของบิลนี้อีกครั้ง\n` +
        `การรับเงินที่ยกเลิก/ถอนออกไปก่อนหน้า จะไม่กลับมาเอง`, {
        title: '⚠️ กู้คืนบิลที่ยกเลิก', okText: 'กู้คืนบิล', cancelText: 'ไม่กู้คืน', danger: false,
        card: { imageIcon: 'receipt', imageIconColor: 'amber', title: `${inv.invoiceNo} • ${fmtMoney(inv.grandTotal)} บาท`, subtitle: inv.customerName || '',
            rows: [['ยกเลิกเมื่อ', inv.voidedAt ? formatThaiDate(inv.voidedAt, true) : ''], ['เหตุผลที่ยกเลิก', inv.voidReason || ''], ['ยกเลิกโดย', inv.voidedBy ? getUserNameById(inv.voidedBy) : '']],
            list: jobList }
    }))) return;

    const restored = { ...inv, status: 'issued' };
    const status = deriveInvoiceStatus(restored);
    const patch = { id: inv.id, invoiceNo: inv.invoiceNo, status, voidReason: null, voidedAt: null, voidedBy: null, updatedAt: new Date().toISOString() };
    const res = await callCloudAPI("saveInvoice", { invoiceData: patch });
    if (!res || res.status === "error") { showToast("❌ กู้คืนบิลไม่สำเร็จ: " + (res && res.message ? res.message : "กรุณาลองใหม่"), "danger"); return; }
    Object.assign(inv, patch);
    const failCount = await syncJobsWithInvoice(inv);

    saveData();
    renderBillingTab();
    renderJobs();
    renderDashboard();
    if (currentInvoiceId === inv.id) { renderInvoiceItemsTable(); renderInvoiceStatusUi(); }
    showToast(failCount > 0 ? `⚠️ กู้คืนบิล ${inv.invoiceNo} แล้ว แต่ผูกใบงานไม่สำเร็จ ${failCount} ใบ` : `♻️ กู้คืนบิล ${inv.invoiceNo} แล้ว`, failCount > 0 ? "danger" : "success");

    // นายจ้างมีมัดจำค้าง (เช่น เงินที่ถอนออกจากบิลนี้ก่อนยกเลิก) → ถามหักเข้าบิลที่กู้คืนทันที
    const credit = inv.customerId ? customerCredit(inv.customerId) : 0;
    if (credit > 0 && invoiceBalance(inv) > 0) {
        const take = Math.min(credit, invoiceBalance(inv));
        if (await uiConfirm(`"${inv.customerName || '-'}" มีมัดจำคงเหลือ ${fmtMoney(credit)} บาท\nต้องการหักเข้าบิล ${inv.invoiceNo} จำนวน ${fmtMoney(take)} บาท เลยไหม?`, {
            title: 'หักมัดจำเข้าบิลนี้?', okText: 'หักมัดจำ', cancelText: 'ไว้ทีหลัง', danger: false })) {
            await applyCustomerCredit(inv, take);
            renderBillingTab();
            renderJobs();
            renderDashboard();
            if (currentInvoiceId === inv.id) renderInvoiceStatusUi();
        }
    }
}

// Admin ลบบิลที่ยกเลิกแล้วออกจากระบบถาวร (รวมรายการรับเงินที่ยกเลิกไปแล้วของบิลนั้น) — กู้คืนไม่ได้
async function deleteVoidInvoice(invoiceId) {
    if (currentUser.role !== 'admin') { showToast("❌ เฉพาะ Admin เท่านั้น", "danger"); return; }
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv || inv.status !== 'void') { uiAlert("ลบได้เฉพาะบิลที่ยกเลิกแล้ว"); return; }
    if (payments.some(p => p.invoiceId === inv.id && !p.voided)) { uiAlert("บิลนี้ยังมีการรับเงินที่ยังไม่ได้ยกเลิก — ยกเลิกการรับเงินก่อน"); return; }
    // แนวทาง (เจ้าของระบบเลือก 2026-10-06): ยกเลิกบิลไว้เป็นหลักฐานเป็นหลัก — ลบเฉพาะบิลที่ออกผิดจริง ๆ
    // เลขที่บิลไม่ถูกนำกลับมาใช้ (next_doc_no นับขึ้นอย่างเดียว) ลบแล้วเลขจะขาดช่วงโดยไม่มีหลักฐานว่าทำไม
    if (!(await uiConfirm(`ลบบิล ${inv.invoiceNo} (${inv.customerName || '-'}) ยอด ${fmtMoney(inv.grandTotal)} บาท ออกจากระบบถาวร?\n\n` +
        `แนะนำ: ปล่อยบิลที่ยกเลิกไว้เป็นหลักฐาน (ไม่แสดงในรายการไหนอยู่แล้ว) — ลบเฉพาะบิลที่ออกผิดจริง ๆ\n` +
        `เลข ${inv.invoiceNo} จะไม่ถูกนำกลับมาใช้ ลบแล้วเลขบิลจะขาดช่วงโดยไม่เหลือหลักฐานเหตุผลที่ยกเลิก${inv.voidReason ? ` ("${inv.voidReason}")` : ''} และกู้คืนไม่ได้`, {
        title: 'ลบบิลที่ยกเลิก — แน่ใจหรือไม่?', okText: 'บิลออกผิด ลบถาวร', cancelText: 'เก็บไว้เป็นหลักฐาน', danger: true }))) return;
    const res = await callCloudAPI("deleteVoidInvoice", { invoiceId: inv.id });
    if (!res || res.status === "error") { showToast("❌ ลบบิลไม่สำเร็จ: " + (res && res.message ? res.message : "กรุณาลองใหม่"), "danger"); return; }
    invoices = invoices.filter(i => i.id !== inv.id);
    payments = payments.filter(p => p.invoiceId !== inv.id);
    jobs.forEach(j => { if (j.invoiceId === inv.id) j.invoiceId = null; });
    saveData();
    if (currentInvoiceId === inv.id) closeInvoiceModal();
    renderBillingTab();
    renderDashboard();
    showToast(`🗑️ ลบบิล ${inv.invoiceNo} ออกจากระบบแล้ว`, "success");
}

async function voidCurrentInvoice() {
    const inv = currentInvoiceId ? invoices.find(i => i.id === currentInvoiceId) : null;
    if (!inv || !can('finance')) return;
    if (invoicePaidAmount(inv) > 0) {
        uiAlert(`บิล ${inv.invoiceNo} มีการรับเงินแล้ว ${fmtMoney(invoicePaidAmount(inv))} บาท\nต้องกด "ถอนออกจากบิล" (เงินกลับไปเป็นมัดจำ) หรือยกเลิกการรับเงินทุกงวดก่อน (เฉพาะ Admin) จึงจะยกเลิกบิลได้`);
        return;
    }
    const reason = await uiPrompt(`ยกเลิกบิล ${inv.invoiceNo} ยอด ${fmtMoney(inv.grandTotal)} บาท\nใบงานในบิลจะกลับเป็น "ยังไม่ออกบิล" และออกบิลใหม่ได้\nกรุณาระบุเหตุผล`, {
        title: 'ยกเลิกบิล', okText: 'ยกเลิกบิล', placeholder: 'เช่น ราคาผิด, ลูกค้าขอแก้ชื่อบนบิล'
    });
    if (reason === null) return;
    if (!reason.trim()) { uiAlert("ต้องระบุเหตุผลในการยกเลิกบิล"); return; }

    const patch = { id: inv.id, invoiceNo: inv.invoiceNo, status: 'void', voidReason: reason.trim(), voidedAt: new Date().toISOString(), voidedBy: currentUser.id || null, updatedAt: new Date().toISOString() };
    const res = await callCloudAPI("saveInvoice", { invoiceData: patch });
    if (!res || res.status === "error") return;
    Object.assign(inv, patch);
    const failCount = await syncJobsWithInvoice(inv);

    saveData();
    renderBillingTab();
    renderJobs();
    renderDashboard();
    renderInvoiceItemsTable();
    renderInvoiceStatusUi();
    showToast(failCount > 0 ? `⚠️ ยกเลิกบิลแล้ว แต่ปลดใบงานไม่สำเร็จ ${failCount} ใบ` : `ยกเลิกบิล ${inv.invoiceNo} เรียบร้อยแล้ว`, failCount > 0 ? "danger" : "success");
}

// ---------- ใบเสร็จรับเงิน (พิมพ์ได้ทุกงวด) ----------
function openReceiptModal(paymentId) {
    const p = payments.find(x => x.id === paymentId);
    if (!p) return;
    if (p.receiptId) { openReceiptDoc(p.receiptId); return; }
    const inv = invoices.find(i => i.id === p.invoiceId);
    if (!inv) return;
    // การรับเงินแบบเก่า (ก่อนมีตาราง receipts) — 1 แถว = ใบเสร็จ 1 ใบของบิล 1 ใบ
    renderReceiptSheet({
        receiptNo: p.receiptNo, paidDate: p.paidDate, refText: inv.invoiceNo,
        name: inv.customerName, addr: inv.customerAddr, tax: inv.customerTax,
        itemRows: invoiceReceiptLine(inv, p, 1, true), amount: p.amount, method: p.method, methodLabel: paymentMethodLabel(p),
        note: p.note, recordedBy: p.recordedBy
    });
}

// แถวรายการของบิล 1 ใบในใบเสร็จ: จ่ายครบงวดเดียว → แสดงรายการในบิล, แบ่งจ่าย → "รับชำระตามใบแจ้งหนี้ (งวดที่ n)"
function invoiceReceiptLine(inv, p, startNo, allowItems) {
    const livePays = livePaymentsOf(inv.id).sort((a, b) => (a.paidDate || '').localeCompare(b.paidDate || '') || (a.createdAt || '').localeCompare(b.createdAt || ''));
    const seq = livePays.findIndex(x => x.id === p.id) + 1;
    const paidToDate = round2(livePays.slice(0, seq).reduce((s, x) => s + Number(x.amount || 0), 0));
    const remaining = Math.max(0, round2(Number(inv.grandTotal || 0) - paidToDate));
    if (allowItems && seq === 1 && remaining === 0) {
        return { rows: (inv.items || []).map((it, i) => `
            <tr><td style="text-align:center;">${i + 1}</td>
                <td><div class="inv-item-title">${escapeHtml(it.title)}</div><div class="inv-item-desc">${escapeHtml(it.desc || '')}</div></td>
                <td class="inv-num inv-amount">${fmtMoney(it.fee)}</td></tr>`).join(''), count: (inv.items || []).length, full: true };
    }
    const fromDeposit = p.receiptId && paymentReceipt(p) && paymentReceipt(p).paidDate !== p.paidDate;
    return { rows: `<tr><td style="text-align:center;">${startNo}</td>
           <td><div class="inv-item-title">รับชำระตามใบแจ้งหนี้เลขที่ ${escapeHtml(inv.invoiceNo)}${livePays.length > 1 || remaining > 0 ? ` (งวดที่ ${seq})` : ''}</div>
               <div class="inv-item-desc">ยอดตามใบแจ้งหนี้ ${fmtMoney(inv.grandTotal)} บาท • ชำระสะสมถึงงวดนี้ ${fmtMoney(paidToDate)} บาท • คงเหลือ ${fmtMoney(remaining)} บาท${fromDeposit ? ` • หักจากมัดจำเมื่อ ${formatThaiDate(p.paidDate)}` : ''}</div></td>
           <td class="inv-num inv-amount">${fmtMoney(p.amount)}</td></tr>`, count: 1, full: false };
}

// ใบเสร็จของเงินเข้า 1 ก้อน: รายการ = ยอดที่ตัดเข้าแต่ละบิล + มัดจำที่ยังไม่ได้หักบิล รวมเท่ากับยอดเงินที่รับ
function openReceiptDoc(receiptId) {
    const r = receipts.find(x => x.id === receiptId);
    if (!r) return;
    const allocs = liveAllocationsOf(r.id).sort((a, b) => (a.paidDate || '').localeCompare(b.paidDate || '') || (a.createdAt || '').localeCompare(b.createdAt || ''));
    const unapplied = receiptUnapplied(r);
    let rowsHtml = '';
    let no = 1;
    if (allocs.length === 1 && unapplied === 0) {
        const inv = invoices.find(i => i.id === allocs[0].invoiceId);
        if (inv) { rowsHtml = invoiceReceiptLine(inv, allocs[0], 1, true).rows; no = 2; }
    } else {
        allocs.forEach(p => {
            const inv = invoices.find(i => i.id === p.invoiceId);
            if (!inv) return;
            rowsHtml += invoiceReceiptLine(inv, p, no, false).rows;
            no++;
        });
    }
    if (unapplied > 0) {
        rowsHtml += `<tr><td style="text-align:center;">${no}</td>
            <td><div class="inv-item-title">เงินมัดจำ / รับล่วงหน้า</div>
                <div class="inv-item-desc">ยังไม่ได้หักบิล — จะนำไปหักจากใบแจ้งหนี้ครั้งถัดไป</div></td>
            <td class="inv-num inv-amount">${fmtMoney(unapplied)}</td></tr>`;
    }
    const invNos = [...new Set(allocs.map(p => (invoices.find(i => i.id === p.invoiceId) || {}).invoiceNo).filter(Boolean))];
    renderReceiptSheet({
        receiptNo: r.receiptNo, paidDate: r.paidDate,
        refText: invNos.length ? invNos.join(', ') : 'มัดจำ',
        title: invNos.length === 0 ? 'ใบรับเงินมัดจำ' : null,
        name: r.customerName, addr: r.customerAddr, tax: r.customerTax,
        itemRows: { rows: rowsHtml }, amount: r.amount, method: r.method, methodLabel: paymentMethodLabel(r),
        note: r.note, recordedBy: r.recordedBy
    });
}

function renderReceiptSheet({ receiptNo, paidDate, refText, title, name, addr, tax, itemRows, amount, method, methodLabel, note, recordedBy }) {
    const recorder = users.find(u => u.id === recordedBy);
    const issuer = document.querySelector('#invoice-sheet-container .invoice-brand');
    document.getElementById("receipt-sheet").innerHTML = `
        <div class="invoice-sheet-header">
            ${issuer ? issuer.outerHTML : ''}
            <div class="invoice-meta-title">
                <h1>${title || 'ใบเสร็จรับเงิน'}</h1>
                <p class="invoice-meta-sub">RECEIPT</p>
                <div class="invoice-meta-box">
                    <div><span>เลขที่</span> <strong>${escapeHtml(receiptNo || '-')}</strong></div>
                    <div><span>วันที่</span> <strong>${formatThaiDate(paidDate)}</strong></div>
                    <div><span>อ้างอิงบิล</span> <strong>${escapeHtml(refText || '-')}</strong></div>
                </div>
            </div>
        </div>
        <div class="invoice-stamp is-paid">ได้รับเงินแล้ว</div>
        <div class="invoice-addresses-row">
            <div class="inv-addr-block">
                <h5>ได้รับเงินจาก</h5>
                <p><strong>${escapeHtml(name || '-')}</strong></p>
                <p>${escapeHtml(addr || '')}</p>
                <p>${escapeHtml(tax || '')}</p>
            </div>
        </div>
        <table class="invoice-table">
            <thead><tr><th style="width:50px; text-align:center;">ลำดับ</th><th>รายการ</th><th style="width:150px; text-align:right;">จำนวนเงิน (บาท)</th></tr></thead>
            <tbody>${itemRows.rows}</tbody>
            <tfoot>
                <tr class="inv-summary-row grand-total"><td colspan="2" class="sum-label">รวมรับเงินครั้งนี้</td><td class="sum-value">${fmtMoney(amount)}</td></tr>
                <tr class="inv-words-row"><td colspan="3">(${bahtText(amount)})</td></tr>
            </tfoot>
        </table>
        <div class="receipt-method">
            <span>ชำระโดย</span>
            <strong>${method === 'cash' ? 'เงินสด' : `โอนเข้าบัญชี ${escapeHtml(methodLabel)}`}</strong>
            ${note ? `<span class="receipt-note">หมายเหตุ: ${escapeHtml(note)}</span>` : ''}
        </div>
        <div class="invoice-signature-row">
            <div class="invoice-signature-block">
                <div class="signature-line"></div>
                <p>ผู้รับเงิน (Collector)</p>
                <p class="signature-date">${escapeHtml(recorder ? recorder.name : '')} • วันที่ ${formatThaiDate(paidDate)}</p>
            </div>
            <div class="invoice-signature-block">
                <div class="signature-line"></div>
                <p>ผู้จ่ายเงิน (Payer)</p>
                <p class="signature-date">วันที่ ....... /....... /..........</p>
            </div>
        </div>`;
    setPrintPageSize(INVOICE_PAGE_CSS);
    document.getElementById("receipt-modal").classList.remove("hidden");
}

function closeReceiptModal() {
    document.getElementById("receipt-modal").classList.add("hidden");
}

// ==================== ACCOUNTING MODULE ส่วนที่ 2 (สรุปภายใน / ลูกหนี้ / ส่งออก / ค่าคอม / ยอดคงเหลือ / ราคามาตรฐาน) ====================
const GOV_FEE_EXPENSE_CATEGORY = 'ค่าธรรมเนียมราชการ/กรมจัดหางาน';
const COMMISSION_EXPENSE_CATEGORY = 'ค่าคอมมิชชั่น Agent';

// ราคาประมาณของใบงานที่ยังไม่ออกบิล — ราคาในใบงาน หรือราคามาตรฐาน (ค่าธรรมเนียมรัฐ + ค่าบริการ) ถ้ายังไม่ได้ตั้งราคา
function jobEstimatedFee(j) {
    if (j.fee > 0) return Number(j.fee);
    return parseJobTypeItems(j.jobType, 0).reduce((s, it) => {
        const std = getServicePrice(it.name);
        return s + (std ? std.govFee + std.serviceFee : 0);
    }, 0);
}

// ส่วนแบ่งค่าธรรมเนียมรัฐในยอดที่รับมา — เฉลี่ยตามสัดส่วนของบิล (govFeeTotal / grandTotal)
function paymentGovShare(p) {
    const inv = invoices.find(i => i.id === p.invoiceId);
    if (!inv || !(Number(inv.grandTotal) > 0)) return 0;
    return round2((Number(p.amount) || 0) * Math.min(1, (Number(inv.govFeeTotal) || 0) / Number(inv.grandTotal)));
}

// แผงภายใน "รายได้จริง vs เงินเก็บแทนรัฐ" ในหน้าสรุปการเงิน
function renderFinanceInternalSplit(periodPayments, periodExpenses) {
    const el = document.getElementById("finance-internal-split");
    if (!el) return;
    const received = periodPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const govCollected = periodPayments.reduce((s, p) => s + paymentGovShare(p), 0);
    const serviceIncome = received - govCollected;
    const govPaid = periodExpenses.filter(x => x.category === GOV_FEE_EXPENSE_CATEGORY).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const govPending = govCollected - govPaid;
    const depositHeld = round2(receipts.reduce((s, r) => s + receiptUnapplied(r), 0));
    el.innerHTML = `
        <div class="fin-tile tile-service"><span>รายได้ค่าบริการจริง</span><strong>${fmtMoney(serviceIncome)}</strong><small>เงินที่รับมา − ส่วนที่เป็นค่าธรรมเนียมรัฐ</small></div>
        <div class="fin-tile tile-gov"><span>เงินเก็บแทนรัฐที่รับมา</span><strong>${fmtMoney(govCollected)}</strong><small>ตามสัดส่วนค่าธรรมเนียมรัฐในบิลที่รับเงิน</small></div>
        <div class="fin-tile tile-govpaid"><span>จ่ายค่าธรรมเนียมรัฐแล้ว</span><strong>${fmtMoney(govPaid)}</strong><small>รายจ่ายหมวด "${GOV_FEE_EXPENSE_CATEGORY}"</small></div>
        <div class="fin-tile ${govPending > 0.005 ? 'tile-warn' : 'tile-ok'}"><span>${govPending >= 0 ? 'เงินเก็บแทนรัฐที่ยังไม่ได้นำจ่าย' : 'จ่ายค่าธรรมเนียมรัฐล่วงหน้าไปแล้ว'}</span><strong>${fmtMoney(Math.abs(govPending))}</strong><small>${govPending > 0.005 ? 'รับเงินลูกค้ามาแล้ว แต่ยังไม่ได้บันทึกจ่ายรัฐ' : 'ไม่มีเงินเก็บแทนค้างอยู่'}</small></div>
        <div class="fin-tile tile-gov"><span>มัดจำ/เงินรับล่วงหน้าคงค้าง</span><strong>${fmtMoney(depositHeld)}</strong><small>รับเงินแล้วแต่ยังไม่ได้หักบิล (ทุกช่วงเวลา) — ยังไม่นับเป็นรายได้</small></div>`;
}

// ลูกหนี้ค้างชำระตามอายุหนี้ (นับจากวันออกบิล ณ วันนี้) + มูลค่างานที่ยังไม่ออกบิล แยกรายนายจ้าง
function renderReceivablesAging() {
    const tbody = document.getElementById("finance-aging-tbody");
    if (!tbody) return;
    const today = new Date();
    const rows = {};
    const rowOf = (custId, name) => (rows[custId || name] = rows[custId || name] || { name, b0: 0, b31: 0, b61: 0, b91: 0, unbilled: 0, unbilledCount: 0, customerId: custId });

    invoices.filter(i => i.status === 'issued' || i.status === 'partial').forEach(inv => {
        const bal = invoiceBalance(inv);
        if (bal <= 0) return;
        const days = Math.floor((today - (safeParseDate(inv.issueDate) || today)) / 86400000);
        const cust = customers.find(c => c.id === inv.customerId);
        const r = rowOf(inv.customerId, cust ? cust.companyName : (inv.customerName || 'ไม่ระบุนายจ้าง'));
        if (days <= 30) r.b0 += bal; else if (days <= 60) r.b31 += bal; else if (days <= 90) r.b61 += bal; else r.b91 += bal;
    });
    jobs.filter(jobAwaitingBill).forEach(j => {
        const cust = customers.find(c => c.id === j.customerId);
        const r = rowOf(j.customerId, cust ? cust.companyName : 'ไม่ระบุนายจ้าง');
        r.unbilled += jobEstimatedFee(j);
        r.unbilledCount++;
    });

    const list = Object.values(rows).map(r => ({ ...r, total: r.b0 + r.b31 + r.b61 + r.b91 }))
        .filter(r => r.total > 0 || r.unbilledCount > 0)
        .sort((a, b) => b.b91 - a.b91 || b.total - a.total);
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align:center; padding:25px;">${icon("ok")} ไม่มีลูกหนี้ค้างชำระ และไม่มีงานค้างออกบิล</td></tr>`;
        return;
    }
    const cell = (v, cls = '') => `<td class="inv-num ${v > 0 ? cls : 'text-muted'}">${v > 0 ? fmtMoney(v) : '-'}</td>`;
    const sum = k => list.reduce((s, r) => s + r[k], 0);
    tbody.innerHTML = list.map(r => `
        <tr>
            <td><strong>${escapeHtml(r.name)}</strong></td>
            ${cell(r.b0)}${cell(r.b31, 'text-warning')}${cell(r.b61, 'text-danger')}${cell(r.b91, 'text-danger aging-critical')}
            <td class="inv-num"><strong>${fmtMoney(r.total)}</strong></td>
            <td class="inv-num">${r.unbilledCount > 0 ? `${fmtMoney(r.unbilled)}<br><small class="text-muted">${r.unbilledCount} ใบงาน</small>` : '-'}</td>
        </tr>`).join('') + `
        <tr class="aging-total-row">
            <td>รวมทั้งหมด</td>
            <td class="inv-num">${fmtMoney(sum('b0'))}</td><td class="inv-num">${fmtMoney(sum('b31'))}</td>
            <td class="inv-num">${fmtMoney(sum('b61'))}</td><td class="inv-num">${fmtMoney(sum('b91'))}</td>
            <td class="inv-num">${fmtMoney(sum('total'))}</td><td class="inv-num">${fmtMoney(sum('unbilled'))}</td>
        </tr>`;
}

// ---------- ส่งออก Excel (CSV, UTF-8 BOM ให้ Excel อ่านภาษาไทยได้) ----------
function downloadCsv(filename, header, rows) {
    const esc = v => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = '﻿' + [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportFinanceCsv(kind) {
    const period = (document.getElementById("db-finance-period-select") || {}).value || '';
    const inPeriod = d => !period || (d || '').startsWith(period);
    const tag = period || 'ทั้งหมด';
    const userName = id => (users.find(u => u.id === id) || {}).name || '';
    const custName = id => (customers.find(c => c.id === id) || {}).companyName || '';
    let header, rows;

    if (kind === 'payments') {
        header = ['วันที่รับเงิน', 'เลขที่ใบเสร็จ', 'เลขที่บิล', 'นายจ้าง/ลูกค้า', 'จำนวนเงิน', 'ส่วนค่าธรรมเนียมรัฐ', 'ส่วนค่าบริการ', 'ช่องทาง', 'บัญชี', 'หมายเหตุ', 'ผู้บันทึก'];
        rows = payments.filter(p => !p.voided && inPeriod(p.paidDate)).sort((a, b) => (a.paidDate || '').localeCompare(b.paidDate || '')).map(p => {
            const inv = invoices.find(i => i.id === p.invoiceId) || {};
            const gov = paymentGovShare(p);
            const b = banks.find(x => x.id === p.bankId);
            return [formatThaiDate(p.paidDate), paymentReceiptNo(p), inv.invoiceNo, inv.customerName, round2(p.amount), gov, round2(p.amount - gov),
                p.method === 'cash' ? 'เงินสด' : 'โอน', b ? `${b.bankName} ${b.accountNumber || ''}` : '', p.note, userName(p.recordedBy)];
        });
    } else if (kind === 'invoices') {
        header = ['เลขที่บิล', 'วันที่ออกบิล', 'ประเภท', 'นายจ้าง/ลูกค้า', 'ยอดบิล', 'ค่าธรรมเนียมรัฐ (ภายใน)', 'รับแล้ว', 'คงเหลือ', 'อายุหนี้ (วัน)', 'สถานะ', 'เหตุผลยกเลิก'];
        const today = new Date();
        rows = invoices.filter(i => i.status !== 'void' && inPeriod(i.issueDate)).sort((a, b) => (a.invoiceNo || '').localeCompare(b.invoiceNo || '')).map(i => {
            const bal = i.status === 'void' ? 0 : invoiceBalance(i);
            const days = bal > 0 ? Math.floor((today - (safeParseDate(i.issueDate) || today)) / 86400000) : '';
            return [i.invoiceNo, formatThaiDate(i.issueDate), { job: 'บิลใบงาน', combined: 'บิลรวม', free: 'บิลอิสระ' }[i.kind] || i.kind,
                i.customerName, round2(i.grandTotal), round2(i.govFeeTotal), invoicePaidAmount(i), bal, days,
                (INVOICE_STATUS_META[i.status] || {}).label || i.status, i.voidReason || ''];
        });
    } else if (kind === 'expenses') {
        header = ['วันที่', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน', 'จ่ายจาก', 'Agent'];
        rows = expenses.filter(x => inPeriod(x.expenseDate)).sort((a, b) => (a.expenseDate || '').localeCompare(b.expenseDate || '')).map(x => [
            formatThaiDate(x.expenseDate), x.category, x.description, round2(x.amount), expenseSourceLabel(x),
            x.agentId ? (agents.find(a => a.id === x.agentId) || {}).name || '' : '']);
    } else if (kind === 'commissions') {
        header = ['Agent', 'เลขที่ใบงาน', 'นายจ้าง', 'ประเภทงาน', 'ค่าบริการงาน', 'ค่าคอม', 'สถานะลูกค้า', 'จ่ายค่าคอมแล้วเมื่อ'];
        rows = jobs.filter(j => j.agentId).filter(j => inPeriod(((j.paidAt || j.createdAt || '') + '').split('T')[0])).map(j => [
            (agents.find(a => a.id === j.agentId) || {}).name || '', getJobDisplayNo(j), custName(j.customerId), getCleanJobTypeName(j.jobType),
            round2(j.fee), jobCommissionAmount(j), j.paymentStatus || '', j.commissionPaidAt ? formatThaiDate(j.commissionPaidAt) : 'ยังไม่จ่าย']);
    } else return;

    if (rows.length === 0) { showToast("ไม่มีข้อมูลในช่วงเวลาที่เลือก", "warning"); return; }
    const names = { payments: 'รายรับ', invoices: 'บิลและลูกหนี้', expenses: 'รายจ่าย', commissions: 'ค่าคอม-Agent' };
    downloadCsv(`WorkerOS-${names[kind]}-${tag}.csv`, header, rows);
    showToast(`📥 ส่งออก${names[kind]} ${rows.length} รายการแล้ว`, "success");
}

// ---------- ค่าคอมมิชชั่น Agent ----------
// ค่าคอมของใบงาน = ยอดที่ตั้งไว้ในใบงาน (commissionAmount) หรือค่าคอมเริ่มต้นของ Agent
function jobCommissionAmount(j) {
    if (!j || !j.agentId || isJobNoCharge(j)) return 0; // งานไม่เรียกเก็บเงินไม่มีค่าคอม
    if (Number(j.commissionAmount) > 0) return Number(j.commissionAmount);
    const ag = agents.find(a => a.id === j.agentId);
    return ag ? Number(ag.defaultCommission) || 0 : 0;
}

// งานที่ถึงกำหนดจ่ายค่าคอม = ลูกค้าชำระครบแล้ว และยังไม่ได้จ่ายค่าคอม
function commissionDueJobs(agentId) {
    return jobs.filter(j => j.agentId === agentId && isJobPaid(j) && !j.commissionPaidAt && jobCommissionAmount(j) > 0);
}

function agentCommissionSummary(agentId) {
    const all = jobs.filter(j => j.agentId === agentId);
    const due = commissionDueJobs(agentId);
    const paidOut = all.filter(j => j.commissionPaidAt).reduce((s, j) => s + jobCommissionAmount(j), 0);
    const waiting = all.filter(j => !isJobPaid(j) && !j.commissionPaidAt).reduce((s, j) => s + jobCommissionAmount(j), 0);
    return { due: due.reduce((s, j) => s + jobCommissionAmount(j), 0), dueCount: due.length, paidOut, waiting };
}

let commissionModalAgentId = null;
function openCommissionPayoutModal(agentId) {
    if (!can('commission')) return;
    const ag = agents.find(a => a.id === agentId);
    const due = commissionDueJobs(agentId);
    if (!ag) return;
    if (due.length === 0) { uiAlert(`${ag.name} ยังไม่มีค่าคอมที่ถึงกำหนดจ่าย (ต้องเป็นงานที่ลูกค้าชำระเงินครบแล้ว)`); return; }
    commissionModalAgentId = agentId;
    document.getElementById("commission-modal-title").innerText = `จ่ายค่าคอมมิชชั่น — ${ag.name}`;
    document.getElementById("commission-job-list").innerHTML = due.map(j => {
        const cust = customers.find(c => c.id === j.customerId);
        const w = workers.find(x => x.id === j.workerId);
        return `
            <label class="commission-job-row">
                <input type="checkbox" name="commission-job" value="${j.id}" checked onchange="updateCommissionPayoutTotal()">
                <span class="commission-job-info"><strong>${getJobDisplayNo(j)} • ${escapeHtml(getCleanJobTypeName(j.jobType))}</strong>
                    <small>${escapeHtml(cust ? cust.companyName : '-')} • ${escapeHtml(w ? `${w.firstName} ${w.lastName}` : '-')} • ชำระแล้ว ${formatThaiDate(j.paidAt)}</small></span>
                <input type="number" class="commission-amount-input" id="commission-amt-${j.id}" min="0" step="0.01" value="${jobCommissionAmount(j)}" oninput="updateCommissionPayoutTotal()">
            </label>`;
    }).join('');
    document.getElementById("commission-pay-date").value = localDateISO(new Date());
    document.getElementById("commission-pay-bank").innerHTML = BANK_SELECT_HEAD + cashOptionHtml() +
        banks.map(b => bankOptionHtml(b)).join('');
    updateCommissionPayoutTotal();
    document.getElementById("commission-modal").classList.remove("hidden");
}

function closeCommissionPayoutModal() {
    document.getElementById("commission-modal").classList.add("hidden");
    commissionModalAgentId = null;
}

function updateCommissionPayoutTotal() {
    let total = 0;
    document.querySelectorAll('input[name="commission-job"]:checked').forEach(cb => {
        total += Number(document.getElementById(`commission-amt-${cb.value}`).value) || 0;
    });
    document.getElementById("commission-pay-total").innerText = fmtMoney(total);
    document.getElementById("btn-confirm-commission").disabled = total <= 0;
}

// บันทึกจ่ายค่าคอม → สร้างรายจ่าย (หมวดค่าคอม, ผูก agent + ใบงาน + บัญชีที่จ่าย) แล้วตั้ง commissionPaidAt ให้ใบงาน
async function confirmCommissionPayout() {
    const ag = agents.find(a => a.id === commissionModalAgentId);
    if (!ag) return;
    const picked = Array.from(document.querySelectorAll('input[name="commission-job"]:checked')).map(cb => ({
        job: jobs.find(j => j.id === cb.value),
        amount: round2(document.getElementById(`commission-amt-${cb.value}`).value)
    })).filter(x => x.job && x.amount > 0);
    const total = round2(picked.reduce((s, x) => s + x.amount, 0));
    const payDate = document.getElementById("commission-pay-date").value || localDateISO(new Date());
    const bankVal = document.getElementById("commission-pay-bank").value;
    const bank = banks.find(b => b.id === bankVal);
    if (picked.length === 0 || total <= 0) return;

    if (!(await uiConfirm(`จ่ายค่าคอมให้ ${ag.name} รวม ${fmtMoney(total)} บาท (${picked.length} งาน)\nระบบจะบันทึกเป็นรายจ่ายหมวด "${COMMISSION_EXPENSE_CATEGORY}"`, {
        title: 'ยืนยันการจ่ายค่าคอม', okText: 'บันทึกการจ่าย', danger: false,
        card: { imageIcon: 'users', imageIconColor: 'teal', title: ag.name, subtitle: ag.phone || '', rows: [['ยอดจ่าย', `${fmtMoney(total)} บาท`], ['จ่ายจาก', bank ? bank.bankName : 'เงินสด'], ['วันที่จ่าย', formatThaiDate(payDate)]] }
    }))) return;

    const btn = document.getElementById("btn-confirm-commission");
    btn.disabled = true;
    try {
        const expense = {
            id: 'expense-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
            expenseDate: payDate,
            category: COMMISSION_EXPENSE_CATEGORY,
            amount: total,
            description: `ค่าคอม ${ag.name}: ${picked.map(x => getJobDisplayNo(x.job)).join(', ')}`,
            paymentMethod: bank ? bank.bankName : 'เงินสด',
            bankId: bank ? bank.id : null,
            agentId: ag.id,
            jobIds: picked.map(x => x.job.id),
            attachment: {}
        };
        const res = await callCloudAPI("saveExpense", { expenseData: expense });
        if (!res || res.status === "error") return;
        expenses.push(expense);

        let failCount = 0;
        for (const { job, amount } of picked) {
            const before = { ...job };
            job.commissionAmount = amount;
            job.commissionPaidAt = new Date(`${payDate}T12:00:00`).toISOString();
            job.commissionExpenseId = expense.id;
            const r = await callCloudAPI("saveJob", { jobData: job });
            if (!r || r.status === "error") { Object.assign(job, before); failCount++; }
        }
        saveData();
        closeCommissionPayoutModal();
        renderAgentsList();
        renderExpenses();
        showToast(failCount > 0 ? `⚠️ บันทึกรายจ่ายแล้ว แต่อัปเดตใบงานไม่สำเร็จ ${failCount} ใบ` : `💵 บันทึกจ่ายค่าคอม ${ag.name} ${fmtMoney(total)} บาท แล้ว`, failCount > 0 ? "danger" : "success");
    } finally {
        btn.disabled = false;
    }
}

// ---------- ยอดคงเหลือรายบัญชี ----------
// ยอดคงเหลือ = ยอดยกมา + เงินรับเข้า (ใบเสร็จ + payments แบบเก่า — moneyInEntries) − รายจ่ายที่จ่ายจากบัญชีนี้ (expenses.bankId) นับตั้งแต่วันยกมา
function expenseSourceLabel(x) {
    if (x.bankId) { const b = banks.find(y => y.id === x.bankId); if (b) return `${b.bankName} - ${b.accountName || ''}`; }
    return x.paymentMethod || '';
}

// รายจ่ายเก่าที่บันทึกก่อนมี bankId เก็บแค่ชื่อธนาคาร — ผูกให้ถ้ามีบัญชีของธนาคารนั้นแค่บัญชีเดียว
function expenseBankId(x) {
    if (x.bankId) return x.bankId;
    if (!x.paymentMethod || x.paymentMethod === 'เงินสด') return null;
    const same = banks.filter(b => b.bankName === x.paymentMethod);
    return same.length === 1 ? same[0].id : null;
}

function bankAccountBalance(bankId) {
    const b = banks.find(x => x.id === bankId);
    const since = b && b.openingDate ? b.openingDate : '';
    const after = d => !since || (d || '') >= since;
    const opening = b ? Number(b.openingBalance) || 0 : 0;
    const inflow = moneyInEntries().filter(p => p.method === 'bank' && p.bankId === bankId && after(p.paidDate)).reduce((s, p) => s + Number(p.amount || 0), 0);
    const outflow = expenses.filter(x => expenseBankId(x) === bankId && after(x.expenseDate)).reduce((s, x) => s + Number(x.amount || 0), 0);
    return { opening, inflow, outflow, balance: round2(opening + inflow - outflow) };
}

function cashBalance() {
    const inflow = moneyInEntries().filter(p => p.method === 'cash').reduce((s, p) => s + Number(p.amount || 0), 0);
    const outflow = expenses.filter(x => x.paymentMethod === 'เงินสด' && !x.bankId).reduce((s, x) => s + Number(x.amount || 0), 0);
    return { inflow, outflow, balance: round2(inflow - outflow) };
}

// ---------- ราคามาตรฐาน (ภายใน): ค่าธรรมเนียมรัฐ + ค่าบริการ + ต้นทุน ต่อประเภทงาน ----------
// ต้นทุน (costItems) = รายจ่ายของบริษัทต่องาน ที่ไม่ใช่ค่าธรรมเนียมรัฐ เช่น ค่าตรวจโรค ค่าแปล ค่าเดินทาง
// กำไรต่องานโดยประมาณ = ค่าบริการ − ต้นทุนรวม (ค่าธรรมเนียมรัฐเป็นเงินเก็บแทน ไม่นับเป็นรายได้/ต้นทุน)
const COST_ITEM_SUGGESTIONS = ['ค่าตรวจโรค/ใบรับรองแพทย์', 'ค่าแปลเอกสาร', 'ค่าเดินทาง', 'ค่าส่งเอกสาร/ไปรษณีย์', 'ค่าถ่ายเอกสาร/ปริ้น', 'ค่ารูปถ่าย', 'ค่าประกันสุขภาพ', 'ค่าคอม Agent', 'ค่านายหน้า/ผู้ประสานงาน'];
// ชื่อที่ไม่แนะนำเป็นต้นทุน: "อื่นๆ" (กว้างเกินไป) และค่าธรรมเนียมรัฐ (มีช่อง "ค่าธรรมเนียมรัฐ (เก็บแทน)" ของตัวเองแล้ว ไม่นับเป็นต้นทุน)
const COST_ITEM_EXCLUDED = /^(อื่น\s*ๆ|อื่นๆ)$|ค่าธรรมเนียม\s*(รัฐ|ราชการ)/;

// รายชื่อต้นทุนที่แนะนำ = รายการสำเร็จรูป + ชื่อที่เคยพิมพ์ไว้ในประเภทงานอื่น
function costItemSuggestions() {
    const names = new Set(COST_ITEM_SUGGESTIONS);
    servicePrices.forEach(p => (p.costItems || []).forEach(c => c.name && names.add(c.name.trim())));
    return [...names].filter(n => n && !COST_ITEM_EXCLUDED.test(n));
}

// ช่องชื่อต้นทุน: dropdown แนะนำแบบเดียวกับช่องค้นหาอื่นในระบบ (.search-suggest-dropdown) แทน <datalist> ของเบราว์เซอร์
// ช่องถูกสร้างใหม่ทุกครั้งที่วาดแถวต้นทุน จึงผูกทีละช่องหลังวาด (data-suggest-bound กันผูกซ้ำ)
function bindCostNameSuggest(root) {
    (root || document).querySelectorAll('input.price-cost-name:not([data-suggest-bound])').forEach(input => {
        input.dataset.suggestBound = '1';
        if (input.disabled) return;
        const box = input.closest('.search-box');
        if (!box) return;
        const dropdown = document.createElement('div');
        dropdown.className = 'search-suggest-dropdown hidden';
        box.appendChild(dropdown);
        let matches = [];
        const hide = () => { dropdown.classList.add('hidden'); dropdown.innerHTML = ''; };
        const pick = (idx) => { input.value = matches[idx] || input.value; hide(); input.focus(); };
        const show = () => {
            const q = input.value.trim().toLowerCase();
            matches = costItemSuggestions().filter(n => !q || n.toLowerCase().includes(q)).slice(0, 30);
            if (!matches.length) { hide(); return; }
            dropdown.innerHTML = matches.map((n, idx) => `<div class="search-suggest-item" data-idx="${idx}"><span class="search-suggest-label">${escapeHtml(n)}</span></div>`).join('');
            dropdown.classList.remove('hidden');
            Array.from(dropdown.children).forEach((el, idx) => el.addEventListener('mousedown', (e) => { e.preventDefault(); pick(idx); }));
        };
        input.addEventListener('input', show);
        input.addEventListener('focus', show);
        input.addEventListener('blur', () => setTimeout(hide, 150));
        attachSuggestKeyboard(input, dropdown, pick, hide, show);
    });
}

function costItemsTotal(items) {
    return round2((items || []).reduce((s, c) => s + (Number(c.amount) || 0), 0));
}

function renderServicePrices() {
    const tbody = document.getElementById("service-prices-tbody");
    if (!tbody) return;
    const canEdit = can('finance');
    const types = Array.from(document.querySelectorAll("input[name='job-type-checkbox']")).map(cb => cb.value);
    servicePrices.forEach(p => { if (!types.includes(p.jobType)) types.push(p.jobType); });

    tbody.innerHTML = types.map((t, i) => {
        const p = getServicePrice(t) || { govFee: 0, serviceFee: 0, costItems: [] };
        const dis = canEdit ? '' : 'disabled';
        const costs = p.costItems || [];
        return `
            <tr data-job-type="${escapeHtml(t)}">
                <td><strong>${escapeHtml(t)}</strong></td>
                <td class="inv-num"><input type="number" min="0" step="0.01" class="price-input price-gov" id="sp-gov-${i}" value="${p.govFee}" ${dis} oninput="updateServicePriceTotal(${i})"></td>
                <td class="inv-num"><input type="number" min="0" step="0.01" class="price-input" id="sp-svc-${i}" value="${p.serviceFee}" ${dis} oninput="updateServicePriceTotal(${i})"></td>
                <td class="inv-num"><strong id="sp-total-${i}">${fmtMoney(p.govFee + p.serviceFee)}</strong></td>
                <td class="inv-num">
                    <button type="button" class="btn btn-sm btn-outline price-cost-toggle" id="sp-cost-btn-${i}" onclick="toggleServicePriceCosts(${i})">${icon('cash')} <span id="sp-cost-total-${i}">${fmtMoney(costItemsTotal(costs))}</span> <small id="sp-cost-count-${i}">(${costs.length})</small></button>
                </td>
                <td class="inv-num"><strong id="sp-profit-${i}"></strong></td>
                <td class="actions-col">${canEdit ? `<button type="button" class="btn btn-sm btn-gold" onclick="saveServicePriceRow(${i}, '${escapeHtml(t).replace(/'/g, "\\'")}')">${icon('save')} บันทึก</button>` : ''}</td>
            </tr>
            <tr class="price-cost-row hidden" id="sp-cost-row-${i}">
                <td colspan="7"><div class="price-cost-panel" id="sp-cost-panel-${i}" data-can-edit="${canEdit ? 1 : 0}">${renderCostItemsEditor(i, costs, canEdit)}</div></td>
            </tr>`;
    }).join('');
    types.forEach((t, i) => updateServicePriceTotal(i));
    bindCostNameSuggest(tbody);
}

function renderCostItemsEditor(i, costs, canEdit) {
    const dis = canEdit ? '' : 'disabled';
    const rows = costs.map((c, k) => `
        <div class="price-cost-item">
            <div class="search-box price-cost-name-box"><input type="text" class="price-cost-name" id="sp-cost-name-${i}-${k}" placeholder="ชื่อต้นทุน เช่น ค่าตรวจโรค" autocomplete="off" value="${escapeHtml(c.name || '')}" ${dis}></div>
            <input type="number" min="0" step="0.01" class="price-input" id="sp-cost-amt-${i}-${k}" value="${Number(c.amount) || 0}" ${dis} oninput="updateServicePriceTotal(${i})">
            ${canEdit ? `<button type="button" class="btn btn-sm btn-outline btn-danger-outline" onclick="removeServicePriceCost(${i}, ${k})" title="ลบรายการนี้">${icon('trash')}</button>` : ''}
        </div>`).join('');
    return `
        <div class="price-cost-head">${icon('cash')} ต้นทุนต่องาน (ภายใน — ไม่ใช่ค่าธรรมเนียมรัฐ และไม่พิมพ์ลงบิล)</div>
        ${rows || '<p class="text-muted pay-empty">ยังไม่มีรายการต้นทุน</p>'}
        ${canEdit ? `<button type="button" class="btn btn-sm btn-outline" onclick="addServicePriceCost(${i})">${icon('plus')} เพิ่มรายการต้นทุน</button>
            <span class="text-muted price-cost-hint">แก้แล้วกด "บันทึก" ที่แถวของประเภทงานนี้</span>` : ''}`;
}

// อ่านรายการต้นทุนจากช่องกรอกของแถว i (ตัดแถวที่ไม่มีทั้งชื่อและยอดทิ้ง)
function readServicePriceCosts(i, keepEmpty) {
    const out = [];
    for (let k = 0; ; k++) {
        const nameEl = document.getElementById(`sp-cost-name-${i}-${k}`);
        if (!nameEl) break;
        const name = nameEl.value.trim();
        const amount = round2(document.getElementById(`sp-cost-amt-${i}-${k}`).value);
        if (keepEmpty || name || amount > 0) out.push({ name, amount });
    }
    return out;
}

function rerenderServicePriceCosts(i, costs) {
    const panel = document.getElementById(`sp-cost-panel-${i}`);
    panel.innerHTML = renderCostItemsEditor(i, costs, panel.dataset.canEdit === '1');
    bindCostNameSuggest(panel);
    updateServicePriceTotal(i);
}

function toggleServicePriceCosts(i) {
    const row = document.getElementById(`sp-cost-row-${i}`);
    row.classList.toggle('hidden');
    document.getElementById(`sp-cost-btn-${i}`).classList.toggle('is-open', !row.classList.contains('hidden'));
}

function addServicePriceCost(i) {
    const costs = readServicePriceCosts(i, true);
    costs.push({ name: '', amount: 0 });
    rerenderServicePriceCosts(i, costs);
    const nameEl = document.getElementById(`sp-cost-name-${i}-${costs.length - 1}`);
    if (nameEl) nameEl.focus();
}

function removeServicePriceCost(i, k) {
    const costs = readServicePriceCosts(i, true);
    costs.splice(k, 1);
    rerenderServicePriceCosts(i, costs);
}

function updateServicePriceTotal(i) {
    const gov = Number(document.getElementById(`sp-gov-${i}`).value) || 0;
    const svc = Number(document.getElementById(`sp-svc-${i}`).value) || 0;
    document.getElementById(`sp-total-${i}`).innerText = fmtMoney(gov + svc);
    const costs = readServicePriceCosts(i);
    const cost = costItemsTotal(costs);
    document.getElementById(`sp-cost-total-${i}`).innerText = fmtMoney(cost);
    document.getElementById(`sp-cost-count-${i}`).innerText = `(${costs.length})`;
    const profit = round2(svc - cost);
    const profitEl = document.getElementById(`sp-profit-${i}`);
    profitEl.innerText = fmtMoney(profit);
    profitEl.className = profit < 0 ? 'text-danger' : profit > 0 ? 'text-success' : 'text-muted';
}

async function saveServicePriceRow(i, jobType) {
    const costItems = readServicePriceCosts(i);
    if (costItems.some(c => !c.name)) { uiAlert("กรุณาใส่ชื่อรายการต้นทุนให้ครบทุกบรรทัด (หรือลบบรรทัดที่ไม่ใช้)"); return; }
    const priceData = {
        jobType,
        govFee: round2(document.getElementById(`sp-gov-${i}`).value),
        serviceFee: round2(document.getElementById(`sp-svc-${i}`).value),
        costItems,
        updatedAt: new Date().toISOString()
    };
    if (!(await confirmBeforeSave(null, `ตรวจสอบราคามาตรฐาน "${jobType}"`, [
        { label: "ค่าธรรมเนียมรัฐ (เก็บแทน)", value: `${fmtMoney(priceData.govFee)} บาท` },
        { label: "ค่าบริการ", value: `${fmtMoney(priceData.serviceFee)} บาท` },
        ...costItems.map(c => ({ label: `ต้นทุน: ${c.name}`, value: `${fmtMoney(c.amount || c.cost || 0)} บาท` }))
    ]))) return;
    const res = await callCloudAPI("saveServicePrice", { priceData });
    if (!res || res.status === "error") return;
    const idx = servicePrices.findIndex(p => p.jobType === jobType);
    const oldPrice = idx === -1 ? null : servicePrices[idx];
    if (idx === -1) servicePrices.push(priceData); else servicePrices[idx] = priceData;
    const updatedJobs = oldPrice ? await syncUnbilledJobsToServicePrice(jobType, oldPrice, priceData) : 0;
    saveData();
    rerenderServicePriceCosts(i, costItems);
    if (updatedJobs > 0) { renderJobs(); renderBillingTab(); }
    showToast(`💾 บันทึกราคามาตรฐาน "${jobType}" แล้ว — กำไรต่องานประมาณ ${fmtMoney(priceData.serviceFee - costItemsTotal(costItems))} บาท`
        + (updatedJobs > 0 ? ` (อัปเดตราคาใบงานที่ยังไม่ออกบิล ${updatedJobs} ใบ)` : ''), "success");
}

// แก้ราคามาตรฐานแล้ว → ใบงานที่ยังรอออกบิลซึ่งราคายังเท่าราคามาตรฐานเดิม ปรับเป็นราคาใหม่ตาม
// (ใบงาน fee = 0 ใช้ราคามาตรฐานล่าสุดอยู่แล้ว ไม่ต้องแก้; ใบงานที่ตั้งราคาเองไม่เท่าราคาเดิม / ออกบิลแล้ว / ไม่เรียกเก็บเงิน ไม่แตะ)
async function syncUnbilledJobsToServicePrice(jobType, oldPrice, newPrice) {
    const oldTotal = round2((oldPrice.govFee || 0) + (oldPrice.serviceFee || 0));
    const newTotal = round2((newPrice.govFee || 0) + (newPrice.serviceFee || 0));
    if (oldTotal === newTotal && (oldPrice.govFee || 0) === (newPrice.govFee || 0)) return 0;
    let count = 0;
    for (const j of jobs) {
        if (!(j.fee > 0) || !jobAwaitingBill(j)) continue;
        const items = parseJobTypeItems(j.jobType, j.fee);
        const hits = items.filter(it => it.name === jobType && round2(it.price) === oldTotal);
        if (hits.length === 0) continue;
        const prev = { ...j };
        hits.forEach(it => { it.price = newTotal; });
        j.fee = round2(items.reduce((s, it) => s + it.price, 0));
        j.jobType = items.map(it => `${it.name} (${Math.round(it.price)})`).join(', ');
        j.govFee = Math.max(0, round2((j.govFee || 0) + hits.length * ((newPrice.govFee || 0) - (oldPrice.govFee || 0))));
        j.updatedAt = localDateISO(new Date());
        const r = await callCloudAPI("saveJob", { jobData: j });
        if (!r || r.status === "error") { Object.assign(j, prev); continue; }
        count++;
    }
    return count;
}

// ---------- เลือกคนงานหลายคนให้รายการในบิลอิสระ ----------
// จำนวน = จำนวนคนที่เลือก, ราคารวม = ราคาต่อคน × จำนวน, ค่าธรรมเนียมรัฐปรับตามจำนวนคน, รายละเอียด = รายชื่อคนงาน
let itemWorkersTargetId = null;
let itemWorkersSelected = new Set();

function itemWorkersPool() {
    const base = workers.filter(w => w.status !== 'deleted');
    return freeInvoiceCustomerId ? base.filter(w => w.employerId === freeInvoiceCustomerId) : base;
}

function openItemWorkersPicker(itemId) {
    const item = currentInvoiceItems.find(x => x.id === itemId);
    if (!item) return;
    currentInvoiceItems.forEach(x => syncInvoiceItemTextFields(x));
    itemWorkersTargetId = itemId;
    itemWorkersSelected = new Set(item.workerIds || []);
    const cust = freeInvoiceCustomerId ? customers.find(c => c.id === freeInvoiceCustomerId) : null;
    document.getElementById("item-workers-title").innerText = `เลือกคนงาน — ${item.serviceName || stripEditHint(item.title) || 'รายการนี้'}`;
    document.getElementById("item-workers-hint").innerText = cust
        ? `แสดงเฉพาะคนงานของ ${cust.companyName} — จำนวนในบิลจะเท่ากับจำนวนคนที่เลือก`
        : 'ยังไม่ได้เลือกนายจ้าง จึงแสดงคนงานทุกคน — เลือกนายจ้างด้านบนก่อนเพื่อกรองรายชื่อ';
    document.getElementById("item-workers-search").value = '';
    renderItemWorkersChecklist();
    document.getElementById("item-workers-modal").classList.remove("hidden");
    document.getElementById("item-workers-search").focus();
}

function closeItemWorkersPicker() {
    document.getElementById("item-workers-modal").classList.add("hidden");
    itemWorkersTargetId = null;
}

function renderItemWorkersChecklist() {
    const pool = itemWorkersPool();
    const q = (document.getElementById("item-workers-search").value || '').trim().toLowerCase();
    const list = pool.filter(w => !q || `${w.firstName} ${w.lastName}`.toLowerCase().includes(q) || (w.workerUid || '').toLowerCase().includes(q));
    const listEl = document.getElementById("item-workers-checklist");
    listEl.innerHTML = list.length === 0
        ? `<div class="job-worker-empty">--- ${pool.length === 0 ? 'ไม่พบคนงานของนายจ้างรายนี้' : 'ไม่พบคนงานที่ตรงกับคำค้นหา'} ---</div>`
        : list.map(w => `
            <label class="job-worker-row">
                <input type="checkbox" ${itemWorkersSelected.has(w.id) ? 'checked' : ''} onchange="toggleItemWorker('${w.id}', this.checked)">
                <span class="job-worker-row-name">${escapeHtml(workerFullName(w))}</span>
                <span class="job-worker-row-uid">${w.workerUid ? `เลขประจำตัว ${escapeHtml(w.workerUid)}` : 'ไม่มีเลขประจำตัว'}</span>
                <span class="job-worker-row-nat">${escapeHtml(w.nationality || '')}</span>
            </label>`).join('');

    const chipsEl = document.getElementById("item-workers-chips");
    chipsEl.style.display = itemWorkersSelected.size ? 'flex' : 'none';
    chipsEl.innerHTML = Array.from(itemWorkersSelected).map(id => {
        const w = workers.find(x => x.id === id);
        return `<span class="job-worker-chip">${escapeHtml(w ? `${w.firstName} ${w.lastName}` : id)}<button type="button" onclick="toggleItemWorker('${id}', false)">&times;</button></span>`;
    }).join('');
    document.getElementById("item-workers-count").innerText = `เลือกแล้ว ${itemWorkersSelected.size} คน`;
}

function toggleItemWorker(workerId, isChecked) {
    if (isChecked) itemWorkersSelected.add(workerId); else itemWorkersSelected.delete(workerId);
    renderItemWorkersChecklist();
}

function confirmItemWorkers() {
    const item = currentInvoiceItems.find(x => x.id === itemWorkersTargetId);
    if (!item) { closeItemWorkersPicker(); return; }
    const ids = Array.from(itemWorkersSelected);
    const oldQty = item.qty || 1;
    const unit = item.unitPrice !== undefined ? Number(item.unitPrice) : (Number(item.fee) || 0) / oldQty;
    const govUnit = (Number(item.govFee) || 0) / oldQty;
    const qty = Math.max(1, ids.length);

    item.workerIds = ids;
    item.qty = qty;
    item.unitPrice = unit;
    item.fee = round2(unit * qty);
    item.govFee = round2(govUnit * qty);
    if (ids.length) {
        item.desc = ids.map((id, i) => {
            const w = workers.find(x => x.id === id);
            return w ? `${i + 1}. ${invoiceWorkerLine(w)}` : '';
        }).filter(Boolean).join('\n');
    }
    delete item.placeholder;

    // ยังไม่ได้เลือกนายจ้าง และคนที่เลือกมีนายจ้างเดียวกันทั้งหมด → เติมนายจ้างบนบิลให้
    if (!freeInvoiceCustomerId && ids.length) {
        const empIds = new Set(ids.map(id => (workers.find(w => w.id === id) || {}).employerId).filter(Boolean));
        if (empIds.size === 1) selectSearchSelectItem('free-invoice-customer', [...empIds][0]);
    }
    closeItemWorkersPicker();
    renderInvoiceItemsTable();
}

// ==================== หน้าตาแบบ iOS: แท็บเลื่อนไหล / dropdown / กราฟ magic move ====================
// ทั้งหมดเป็นแค่ชั้นหน้าตา ไม่แตะตรรกะเดิม: แท็บยังสลับด้วย btn-gold/btn-outline หรือ .active เหมือนเดิม,
// <select> ยังเป็นตัวเก็บค่าจริง (onchange/validation เดิมใช้ได้), กราฟยัง render ด้วย innerHTML เหมือนเดิม
const IOS_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const iosReducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- แท็บ: ตัวเลือกเลื่อนไปใต้ปุ่มที่เลือก ----------
// host = กล่องกลุ่มแท็บ, getActive = หาปุ่มที่เลือกอยู่ (null = ไม่มี)
function attachTabSlider(host, getActive) {
    if (!host || host._tabSlider) return;
    const slider = document.createElement('div');
    slider.className = 'tab-slider';
    slider.setAttribute('aria-hidden', 'true');
    host.insertBefore(slider, host.firstChild);
    host._tabSlider = slider;

    let animated = false;
    const place = () => {
        const btn = getActive();
        if (!btn || !btn.offsetWidth) {
            if (slider.classList.contains('is-on')) slider.classList.remove('is-on');
            return;
        }
        slider.style.width = btn.offsetWidth + 'px';
        slider.style.height = btn.offsetHeight + 'px';
        slider.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;
        if (!slider.classList.contains('is-on')) slider.classList.add('is-on');
        // ครั้งแรกวางเฉย ๆ ไม่ต้องเลื่อน (ไม่งั้นจะเห็นมันวิ่งมาจากมุมซ้ายบนตอนเปิดหน้า)
        if (!animated && !iosReducedMotion()) {
            animated = true;
            requestAnimationFrame(() => requestAnimationFrame(() => slider.classList.add('is-animated')));
        }
    };

    // ปุ่มเปลี่ยน class (เลือกแท็บใหม่ / ซ่อนเมนูตามสิทธิ์) → เลื่อนตาม
    new MutationObserver(place).observe(host, { subtree: true, attributes: true, attributeFilter: ['class'] });
    // ขนาดเปลี่ยน (ย่อแถบเมนู / จอหมุน / กลุ่มแท็บเพิ่งถูกแสดงจากที่ซ่อนไว้) → วางใหม่ทันทีโดยไม่เลื่อน
    // (ถ้าเลื่อนตาม ตัวเลือกจะวิ่งไล่หลังแถบเมนูที่กำลังหด = ดูกระตุก)
    let resizeTimer = null;
    const placeNow = () => {
        slider.style.transition = 'none';
        place();
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { slider.style.transition = ''; }, 80);
    };
    if (window.ResizeObserver) new ResizeObserver(placeNow).observe(host);
    place();
}

function setupSlidingTabs() {
    const sidebarMenu = document.querySelector('.sidebar-menu');
    if (sidebarMenu) {
        sidebarMenu.classList.add('has-slider');
        attachTabSlider(sidebarMenu, () => sidebarMenu.querySelector(':scope > .menu-item.active:not(.hidden)'));
    }
    // ปุ่มสลับ ตาราง/กราฟวงกลม อยู่ใน div เปล่า ๆ — ติดป้ายให้เป็นกลุ่มแท็บด้วย
    document.querySelectorAll('.btn-chart-toggle').forEach(b => b.parentElement && b.parentElement.classList.add('seg-chart-toggle'));
    document.querySelectorAll('.dashboard-tabs, .view-toggle-bar, .seg-chart-toggle').forEach(host => {
        host.classList.add('seg-host');
        attachTabSlider(host, () => host.querySelector(':scope > .btn.btn-gold'));
    });
}

// ---------- Dropdown (<select>) แบบ iOS ----------
let _iosSelect = null; // { sel, menu, items, active }

function iosSelectSupported(sel) {
    return sel && !sel.multiple && !(sel.size > 1) && !sel.disabled
        && window.matchMedia && window.matchMedia('(pointer: fine)').matches;
}

function closeIosSelect() {
    if (!_iosSelect) return;
    _iosSelect.menu.remove();
    _iosSelect = null;
}

function setIosSelectActive(i) {
    const s = _iosSelect;
    if (!s || !s.items.length) return;
    if (s.active >= 0 && s.items[s.active]) s.items[s.active].classList.remove('is-active');
    s.active = Math.max(0, Math.min(s.items.length - 1, i));
    const el = s.items[s.active];
    el.classList.add('is-active');
    el.scrollIntoView({ block: 'nearest' });
}

function moveIosSelectActive(step) {
    const s = _iosSelect;
    if (!s) return;
    let i = s.active;
    for (let n = 0; n < s.items.length; n++) {
        i += step;
        if (i < 0 || i >= s.items.length) return;
        if (!s.items[i].classList.contains('is-disabled')) { setIosSelectActive(i); return; }
    }
}

function chooseIosSelect(optIndex) {
    const s = _iosSelect;
    if (!s) return;
    const sel = s.sel;
    closeIosSelect();
    if (sel.selectedIndex !== optIndex) {
        sel.selectedIndex = optIndex;
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    sel.focus();
}

function openIosSelect(sel) {
    closeIosSelect();
    const menu = document.createElement('div');
    menu.className = 'ios-select-menu';
    menu.setAttribute('role', 'listbox');
    const items = [];
    let selectedItem = -1;

    const addOption = (opt) => {
        if (opt.hidden || opt.style.display === 'none') return;
        const el = document.createElement('div');
        el.className = 'ios-select-option';
        el.setAttribute('role', 'option');
        // ตัวเลือกบัญชีธนาคาร/เงินสด (bankOptionHtml/cashOptionHtml) มีโลโก้ → แสดงโลโก้ในเมนูด้วย
        const text = ((opt.querySelector('.opt-bank-text') || opt).textContent || '').trim();
        if (opt.dataset.bank) el.innerHTML = `${renderBankLogoBadge(opt.dataset.bank, 16)}<span class="ios-select-text">${escapeHtml(text)}</span>`;
        else if (opt.dataset.icon) el.innerHTML = `${icon(opt.dataset.icon, 'green')}<span class="ios-select-text">${escapeHtml(text)}</span>`;
        else el.textContent = text;
        el.title = text;
        if (opt.disabled) el.classList.add('is-disabled');
        if (opt.selected) { el.classList.add('is-selected'); el.setAttribute('aria-selected', 'true'); selectedItem = items.length; }
        el.dataset.index = opt.index;
        el.addEventListener('mousedown', e => e.preventDefault()); // focus ค้างอยู่ที่ <select>
        el.addEventListener('click', () => { if (!opt.disabled) chooseIosSelect(opt.index); });
        el.addEventListener('mousemove', () => {
            const i = items.indexOf(el);
            if (_iosSelect && _iosSelect.active !== i && !opt.disabled) setIosSelectActive(i);
        });
        items.push(el);
        menu.appendChild(el);
    };
    Array.from(sel.children).forEach(child => {
        if (child.tagName === 'OPTGROUP') {
            const head = document.createElement('div');
            head.className = 'ios-select-group';
            head.textContent = child.label;
            menu.appendChild(head);
            Array.from(child.children).forEach(addOption);
        } else if (child.tagName === 'OPTION') {
            addOption(child);
        }
    });
    if (!items.length) return;

    document.body.appendChild(menu);
    const r = sel.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    menu.style.minWidth = r.width + 'px';
    if (below < 220 && above > below) {
        menu.classList.add('is-above');
        menu.style.bottom = (window.innerHeight - r.top + 6) + 'px';
        menu.style.maxHeight = Math.min(340, above) + 'px';
    } else {
        menu.style.top = (r.bottom + 6) + 'px';
        menu.style.maxHeight = Math.min(340, Math.max(below, 120)) + 'px';
    }
    const left = Math.min(r.left, window.innerWidth - menu.offsetWidth - 8);
    menu.style.left = Math.max(8, left) + 'px';

    _iosSelect = { sel, menu, items, active: -1 };
    setIosSelectActive(selectedItem >= 0 ? selectedItem : 0);
}

function setupIosSelects() {
    // คลิก <select> ด้วยเมาส์ → เปิดเมนูของเราแทนรายการของเบราว์เซอร์ (ผูกที่ document ครั้งเดียว ครอบ <select> ที่สร้างทีหลังด้วย)
    document.addEventListener('mousedown', e => {
        const sel = e.target.closest && e.target.closest('select');
        if (_iosSelect && !(e.target.closest && e.target.closest('.ios-select-menu')) && sel !== _iosSelect.sel) closeIosSelect();
        if (!sel || e.button !== 0 || !iosSelectSupported(sel)) return;
        e.preventDefault();
        sel.focus({ preventScroll: true }); // ห้ามเลื่อนหน้า (การเลื่อนจะไปปิดเมนูทันที)
        if (_iosSelect && _iosSelect.sel === sel) closeIosSelect();
        else openIosSelect(sel);
    }, true);

    document.addEventListener('keydown', e => {
        if (_iosSelect) {
            const k = e.key;
            if (k === 'ArrowDown') { e.preventDefault(); moveIosSelectActive(1); }
            else if (k === 'ArrowUp') { e.preventDefault(); moveIosSelectActive(-1); }
            else if (k === 'Home') { e.preventDefault(); setIosSelectActive(0); }
            else if (k === 'End') { e.preventDefault(); setIosSelectActive(_iosSelect.items.length - 1); }
            else if (k === 'Enter' || k === ' ') {
                e.preventDefault();
                const el = _iosSelect.items[_iosSelect.active];
                if (el && !el.classList.contains('is-disabled')) chooseIosSelect(Number(el.dataset.index));
            }
            else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); const sel = _iosSelect.sel; closeIosSelect(); sel.focus(); }
            else if (k === 'Tab') closeIosSelect();
            else if (k.length === 1) {
                // พิมพ์ตัวอักษร → กระโดดไปตัวเลือกแรกที่ขึ้นต้นด้วยตัวนั้น
                const q = k.toLowerCase();
                const i = _iosSelect.items.findIndex(el => (el.title || el.textContent).trim().toLowerCase().startsWith(q));
                if (i >= 0) setIosSelectActive(i);
            }
            return;
        }
        const sel = e.target;
        if (sel && sel.tagName === 'SELECT' && iosSelectSupported(sel)
            && (e.key === 'Enter' || e.key === ' ' || e.key === 'F4' || (e.altKey && e.key === 'ArrowDown'))) {
            e.preventDefault();
            openIosSelect(sel);
        }
    }, true);

    // เลื่อนหน้าจอ/ย่อขยายหน้าต่าง → ปิดเมนู (ไม่งั้นเมนูจะลอยค้างไม่ตรงช่อง)
    window.addEventListener('scroll', e => { if (_iosSelect && !_iosSelect.menu.contains(e.target)) closeIosSelect(); }, true);
    window.addEventListener('resize', closeIosSelect);
    window.addEventListener('blur', closeIosSelect);
}

// ---------- กราฟ magic move ----------
// แท่งกราฟ (.bar-fill) และกราฟวงกลม (svg.pie-chart) ที่ render ใหม่ จะไหลจากค่าเดิมไปค่าใหม่
// (ครั้งแรกงอกจาก 0) — เริ่มเล่นตอนกราฟโผล่บนจอจริง ๆ เพราะหลายกราฟ render ไว้ตอนยังซ่อนอยู่
const _chartPrev = new Map();
const _chartIO = window.IntersectionObserver ? new IntersectionObserver(entries => {
    entries.forEach(en => {
        if (!en.isIntersecting) return;
        _chartIO.unobserve(en.target);
        playChartMove(en.target);
    });
}) : null;

function chartKey(el, selector) {
    const owner = el.closest('[id]');
    if (!owner) return null;
    const idx = Array.prototype.indexOf.call(owner.querySelectorAll(selector), el);
    return `${owner.id}|${selector}|${idx}`;
}

function prepareChartMove(el) {
    if (el._chartPrepared) return;
    el._chartPrepared = true;
    if (el.classList.contains('bar-fill')) {
        const key = chartKey(el, '.bar-fill');
        const prev = key && _chartPrev.get(key);
        el._chartMove = { key, target: { width: el.style.width } };
        el.style.transition = 'none';
        el.style.width = prev ? prev.width : '0%';
    } else if (el.tagName.toLowerCase() === 'circle') {
        const key = chartKey(el, 'svg.pie-chart circle');
        const prev = key && _chartPrev.get(key);
        const circumference = 2 * Math.PI * Number(el.getAttribute('r') || 0);
        el._chartMove = { key, target: { dash: el.getAttribute('stroke-dasharray'), off: el.getAttribute('stroke-dashoffset') || '0' } };
        el.style.transition = 'none';
        el.style.strokeDasharray = prev ? prev.dash : `0 ${circumference}`;
        el.style.strokeDashoffset = prev ? prev.off : '0';
    }
    const watchEl = el.tagName.toLowerCase() === 'circle' ? el.ownerSVGElement : el;
    if (_chartIO && watchEl) _chartIO.observe(watchEl);
    else playChartMove(el);
}

function playChartMove(target) {
    const els = target.tagName.toLowerCase() === 'svg' ? Array.from(target.querySelectorAll('circle')) : [target];
    els.forEach(el => {
        const m = el._chartMove;
        if (!m) return;
        el._chartMove = null;
        el.getBoundingClientRect(); // บังคับให้ค่าเริ่มต้นถูกวาดก่อน แล้วค่อยเปลี่ยนเป็นค่าจริง
        if (el.tagName.toLowerCase() === 'circle') {
            el.style.transition = `stroke-dasharray 0.9s ${IOS_EASE}, stroke-dashoffset 0.9s ${IOS_EASE}`;
            el.style.strokeDasharray = m.target.dash;
            el.style.strokeDashoffset = m.target.off;
        } else {
            el.style.transition = `width 0.8s ${IOS_EASE}`;
            el.style.width = m.target.width;
        }
        if (m.key) _chartPrev.set(m.key, m.target);
    });
}

function setupChartMagicMove() {
    if (iosReducedMotion()) return;
    const scan = root => {
        if (!root.querySelectorAll) return;
        if (root.matches && root.matches('.bar-fill, svg.pie-chart circle')) prepareChartMove(root);
        root.querySelectorAll('.bar-fill, svg.pie-chart circle').forEach(prepareChartMove);
    };
    new MutationObserver(records => {
        records.forEach(r => r.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n); }));
    }).observe(document.body, { childList: true, subtree: true });
    scan(document.body);
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        setupSlidingTabs();
        setupIosSelects();
        setupChartMagicMove();
    } catch (err) {
        console.error('iOS UI setup failed:', err);
    }
});

// ==================== วิดเจ็ตแบบ iPad: จัดลำดับ/ปรับขนาดการ์ดในแดชบอร์ดและสรุปการเงิน ====================
// ห่อการ์ด/แผงที่มีอยู่แล้วเป็น .widget ใน .widget-board (ย้าย DOM เดิม id เดิม — โค้ด render เดิมไม่ต้องแก้)
// กด "แก้ไขหน้า" → การ์ดสั่นแบบ iOS ลากสลับที่ได้ เลือกขนาด เล็ก/กลาง/ใหญ่/เต็ม (ช่องในกริด 12 ช่อง)
// การจัดหน้าเก็บต่อบัญชีใน profiles.ui_layout (set_my_ui_layout) — ดู 20261002082104_profile_ui_layout.sql
const WIDGET_SPANS = {
    pill:  { s: 2, m: 3, l: 4, xl: 6 },
    block: { s: 4, m: 6, l: 8, xl: 12 }
};
const WIDGET_SIZE_LABELS = { s: 'เล็ก', m: 'กลาง', l: 'ใหญ่', xl: 'เต็ม' };

const pillOf = id => { const el = document.getElementById(id); return el ? el.closest('.stat-pill') : null; };
const panelOf = id => { const el = document.getElementById(id); return el ? el.closest('.dashboard-panel') : null; };

const WIDGET_BOARDS = {
    dashboard: {
        anchor: () => document.querySelector('#db-tab-overview .stat-pills'),
        widgets: [
            { id: 'pill-customers', kind: 'pill', size: 's', els: () => [pillOf('stat-total-customers')] },
            { id: 'pill-workers', kind: 'pill', size: 's', els: () => [pillOf('stat-total-workers')] },
            { id: 'pill-open-jobs', kind: 'pill', size: 's', els: () => [pillOf('stat-open-jobs')] },
            { id: 'pill-expiry', kind: 'pill', size: 's', els: () => [pillOf('stat-expiry-warnings')] },
            { id: 'pill-missing-docs', kind: 'pill', size: 's', els: () => [pillOf('stat-missing-docs')] },
            { id: 'pill-overdue', kind: 'pill', size: 's', els: () => [pillOf('stat-overdue-invoices')] },
            { id: 'panel-expiry', kind: 'block', size: 'xl', els: () => [document.querySelector('#db-tab-overview .panel-alerts')] },
            { id: 'panel-nationality', kind: 'block', size: 's', els: () => [document.querySelector('#db-tab-overview .panel-charts')] },
            { id: 'panel-worker-provinces', kind: 'block', size: 's', els: () => [document.querySelector('#db-tab-overview .panel-worker-provinces')] },
            { id: 'panel-job-status', kind: 'block', size: 's', els: () => [document.querySelector('#db-tab-overview .panel-job-status')] },
            { id: 'panel-missing-docs', kind: 'block', size: 'xl', els: () => [panelOf('search-dashboard-missing-docs')] }
        ]
    },
    finance: {
        anchor: () => document.querySelector('#finpage-tab-overview .fin-wallet-grid'),
        widgets: [
            { id: 'wallet', kind: 'block', size: 'l', els: () => [document.querySelector('#finpage-tab-overview .wallet-card')] },
            { id: 'profit-ranking', kind: 'block', size: 's', els: () => [document.querySelector('#finpage-tab-overview .fin-side')] },
            { id: 'pill-overdue', kind: 'pill', size: 'l', els: () => [pillOf('stat-finance-overdue')] },
            { id: 'pill-unbilled', kind: 'pill', size: 'l', els: () => [pillOf('stat-finance-unbilled')] },
            { id: 'pill-credit', kind: 'pill', size: 'l', els: () => [pillOf('stat-finance-credit')] },
            { id: 'panel-internal', kind: 'block', size: 'xl', els: () => [panelOf('finance-internal-split')] },
            { id: 'panel-aging', kind: 'block', size: 'xl', els: () => [panelOf('finance-aging-tbody')] },
            { id: 'accounts', kind: 'block', size: 'xl', els: () => {
                const btn = document.getElementById('btn-accounts-view-table');
                return [btn && btn.parentElement && btn.parentElement.parentElement,
                        document.getElementById('db-finance-accounts-table-wrap'),
                        document.getElementById('db-finance-accounts-chart-wrap')];
            } },
            { id: 'panel-jobtypes', kind: 'block', size: 'm', els: () => [panelOf('db-finance-jobtypes-table-wrap')] },
            { id: 'panel-payment-status', kind: 'block', size: 'm', els: () => [panelOf('db-finance-payment-breakdown-container')] },
            { id: 'panel-customers', kind: 'block', size: 'xl', els: () => [panelOf('db-finance-customers-table-wrap')] },
            { id: 'panel-expensecat', kind: 'block', size: 'xl', els: () => [panelOf('db-finance-expensecat-table-wrap')] }
        ]
    },
    // แดชบอร์ด > แท็บ "สรุปงานที่แจ้งสำเร็จ"
    completed: {
        anchor: () => document.querySelector('#db-tab-completed .completed-hero-grid'),
        widgets: [
            { id: 'wallet', kind: 'block', size: 'l', els: () => [document.querySelector('#db-tab-completed .completed-wallet')] },
            { id: 'this-month', kind: 'block', size: 's', els: () => [document.querySelector('#db-tab-completed .completed-month-card')] },
            { id: 'panel-monthly', kind: 'block', size: 'm', els: () => [panelOf('db-completed-monthly-tbody')] },
            { id: 'panel-jobtype', kind: 'block', size: 'm', els: () => [panelOf('db-completed-jobtype-tbody')] }
        ]
    },
    // หน้าสรุปงาน (ระบบแจ้งงาน): HTML สร้างใหม่ใน renderJobsSummary() ทุกครั้ง → dynamic, ผูกด้วย mountWidgetBoard('jobs')
    jobs: {
        dynamic: true,
        widgets: [
            { id: 'hero', kind: 'block', size: 'l' },
            { id: 'status', kind: 'block', size: 's' },
            { id: 'pill-unassigned', kind: 'pill', size: 'l' },
            { id: 'pill-stale', kind: 'pill', size: 'l' },
            { id: 'pill-appts', kind: 'pill', size: 'l' },
            { id: 'by-assignee', kind: 'block', size: 's' },
            { id: 'by-type', kind: 'block', size: 's' },
            { id: 'by-customer', kind: 'block', size: 's' },
            { id: 'list-appts', kind: 'block', size: 's' },
            { id: 'list-stale', kind: 'block', size: 's' },
            { id: 'list-unassigned', kind: 'block', size: 's' }
        ]
    }
};

function widgetSpan(kind, size) {
    const spans = WIDGET_SPANS[kind] || WIDGET_SPANS.block;
    return spans[size] || spans.m;
}

function setWidgetSize(widget, size) {
    widget.dataset.size = size;
    widget.style.setProperty('--span', widgetSpan(widget.dataset.kind, size));
    widget.querySelectorAll(':scope > .widget-edit-ui button').forEach(b => b.classList.toggle('is-active', b.dataset.size === size));
}

// FLIP: จำตำแหน่งก่อนเปลี่ยน → เปลี่ยน → เลื่อนจากที่เดิมไปที่ใหม่แบบนุ่ม ๆ (magic move)
function flipWidgets(board, change, skip) {
    const items = Array.from(board.querySelectorAll(':scope > .widget')).filter(w => w !== skip);
    const before = new Map(items.map(w => [w, w.getBoundingClientRect()]));
    change();
    if (iosReducedMotion()) return;
    items.forEach(w => {
        const a = before.get(w), b = w.getBoundingClientRect();
        const dx = a.left - b.left, dy = a.top - b.top;
        if (!dx && !dy) return;
        w.style.transition = 'none';
        w.style.transform = `translate(${dx}px, ${dy}px)`;
        w.getBoundingClientRect();
        w.style.transition = `transform 0.38s ${IOS_EASE}`;
        w.style.transform = '';
    });
}

function widgetLayoutState() {
    if (!currentUser) return {};
    if (!currentUser.uiLayout || typeof currentUser.uiLayout !== 'object') currentUser.uiLayout = {};
    return currentUser.uiLayout;
}

let _widgetSaveTimer = null;
function saveWidgetLayout(boardName) {
    const board = document.querySelector(`.widget-board[data-board="${boardName}"]`);
    if (!board || !currentUser) return;
    const widgets = Array.from(board.querySelectorAll(':scope > .widget'));
    const state = widgetLayoutState();
    state[boardName] = {
        order: widgets.map(w => w.dataset.widgetId),
        sizes: Object.fromEntries(widgets.map(w => [w.dataset.widgetId, w.dataset.size]))
    };
    persistWidgetLayout();
}

function persistWidgetLayout() {
    try { localStorage.setItem("mw_current_user", JSON.stringify(currentUser)); } catch (e) { /* ไม่เป็นไร */ }
    clearTimeout(_widgetSaveTimer);
    _widgetSaveTimer = setTimeout(() => {
        _widgetSaveTimer = null;
        if (currentUser && currentUser.id && window.supabaseAdapter) callCloudAPI("setMyUiLayout", { layout: currentUser.uiLayout || {} });
    }, 600);
}

function applyWidgetLayout(boardName) {
    const cfg = WIDGET_BOARDS[boardName];
    const board = document.querySelector(`.widget-board[data-board="${boardName}"]`);
    if (!cfg || !board) return;
    const saved = (currentUser && currentUser.uiLayout && currentUser.uiLayout[boardName]) || {};
    const byId = new Map(Array.from(board.querySelectorAll(':scope > .widget')).map(w => [w.dataset.widgetId, w]));
    const defaultOrder = cfg.widgets.map(w => w.id);
    // ลำดับที่บันทึกไว้ก่อน แล้วต่อด้วยวิดเจ็ตใหม่ที่ยังไม่เคยอยู่ในลำดับที่บันทึก (เผื่อเพิ่มการ์ดทีหลัง)
    const order = [...(saved.order || []).filter(id => byId.has(id)), ...defaultOrder.filter(id => !(saved.order || []).includes(id))];
    order.filter(id => byId.has(id)).forEach(id => board.appendChild(byId.get(id))); // ใบที่ไม่มีข้อมูลรอบนี้ (ไม่ได้สร้าง) ข้ามไป
    cfg.widgets.forEach(def => {
        const w = byId.get(def.id);
        if (!w) return;
        const size = saved.sizes && WIDGET_SPANS[def.kind][saved.sizes[def.id]] ? saved.sizes[def.id] : def.size;
        setWidgetSize(w, size);
    });
}

function applyAllWidgetLayouts() {
    Object.keys(WIDGET_BOARDS).forEach(applyWidgetLayout);
}

function resetWidgetLayout(boardName) {
    const board = document.querySelector(`.widget-board[data-board="${boardName}"]`);
    const state = widgetLayoutState();
    delete state[boardName];
    flipWidgets(board, () => applyWidgetLayout(boardName));
    persistWidgetLayout();
}

function setWidgetEditing(boardName, on) {
    const board = document.querySelector(`.widget-board[data-board="${boardName}"]`);
    const bar = document.querySelector(`.widget-board-bar[data-board="${boardName}"]`);
    if (!board || !bar) return;
    board.classList.toggle('is-editing', on);
    bar.classList.toggle('is-editing', on);
}

// ลากสลับที่ด้วย pointer events (ใช้ได้ทั้งเมาส์และนิ้วบน iPad)
function startWidgetDrag(e, widget) {
    if (e.button !== undefined && e.button !== 0) return;
    const board = widget.parentElement;
    const shield = e.currentTarget;
    e.preventDefault();
    try { shield.setPointerCapture(e.pointerId); } catch (err) { /* ไม่เป็นไร */ }
    const start = widget.getBoundingClientRect();
    const offX = e.clientX - start.left, offY = e.clientY - start.top;
    widget.classList.add('is-dragging');
    widget.style.transition = 'none';

    const follow = (x, y) => {
        widget.style.transform = 'none';
        const r = widget.getBoundingClientRect();
        widget.style.transform = `translate(${x - offX - r.left}px, ${y - offY - r.top}px) scale(1.02)`;
    };

    const move = ev => {
        // ลากชิดขอบจอ → เลื่อนหน้าให้
        if (ev.clientY < 70) window.scrollBy(0, -14);
        else if (ev.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
        const hit = document.elementsFromPoint(ev.clientX, ev.clientY).find(el => el.classList && el.classList.contains('widget') && el !== widget && el.parentElement === board);
        if (hit) {
            const items = Array.from(board.children);
            const from = items.indexOf(widget), to = items.indexOf(hit);
            flipWidgets(board, () => board.insertBefore(widget, from < to ? hit.nextSibling : hit), widget);
        }
        follow(ev.clientX, ev.clientY);
    };

    const end = () => {
        shield.removeEventListener('pointermove', move);
        shield.removeEventListener('pointerup', end);
        shield.removeEventListener('pointercancel', end);
        widget.classList.remove('is-dragging');
        widget.style.transition = `transform 0.35s ${IOS_EASE}`;
        widget.style.transform = '';
        saveWidgetLayout(board.dataset.board);
    };

    shield.addEventListener('pointermove', move);
    shield.addEventListener('pointerup', end);
    shield.addEventListener('pointercancel', end);
}

// แถบปุ่ม แก้ไขหน้า / คืนค่าเริ่มต้น / เสร็จ ของกระดานหนึ่ง
function widgetBarHtml(boardName) {
    return `<div class="widget-board-bar" data-board="${boardName}">
        <button type="button" class="widget-bar-btn widget-edit-btn" onclick="setWidgetEditing('${boardName}', true)">แก้ไขหน้า</button>
        <button type="button" class="widget-bar-btn widget-reset-btn" onclick="resetWidgetLayout('${boardName}')">คืนค่าเริ่มต้น</button>
        <button type="button" class="widget-bar-btn widget-done-btn" onclick="setWidgetEditing('${boardName}', false)">เสร็จ</button>
    </div>`;
}

// ใส่ที่จับลาก (shield) + ปุ่มเลือกขนาดให้ .widget หนึ่งใบ
function enhanceWidget(w, board) {
    if (w._widgetReady) return;
    w._widgetReady = true;
    const kind = w.dataset.kind;

    const shield = document.createElement('div');
    shield.className = 'widget-shield';
    shield.setAttribute('aria-hidden', 'true');
    shield.addEventListener('pointerdown', e => startWidgetDrag(e, w));
    w.appendChild(shield);

    const ui = document.createElement('div');
    ui.className = 'widget-edit-ui';
    ui.innerHTML = Object.keys(WIDGET_SPANS[kind]).map(s => `<button type="button" data-size="${s}">${WIDGET_SIZE_LABELS[s]}</button>`).join('');
    ui.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        flipWidgets(board, () => setWidgetSize(w, b.dataset.size));
        saveWidgetLayout(board.dataset.board);
    }));
    w.appendChild(ui);
}

// กระดานที่ HTML ถูกสร้างใหม่ทุกครั้งที่ render (เช่น หน้าสรุปงาน): เรียกหลัง innerHTML เพื่อผูกที่จับ + จัดตามที่บันทึก
function mountWidgetBoard(boardName, wasEditing) {
    const board = document.querySelector(`.widget-board[data-board="${boardName}"]`);
    if (!board) return;
    board.querySelectorAll(':scope > .widget').forEach(w => enhanceWidget(w, board));
    applyWidgetLayout(boardName);
    if (wasEditing) setWidgetEditing(boardName, true);
}

function buildWidgetBoard(boardName) {
    const cfg = WIDGET_BOARDS[boardName];
    const anchor = cfg.anchor && cfg.anchor();
    if (!anchor || document.querySelector(`.widget-board[data-board="${boardName}"]`)) return;

    anchor.insertAdjacentHTML('beforebegin', widgetBarHtml(boardName));
    const board = document.createElement('div');
    board.className = 'widget-board';
    board.dataset.board = boardName;
    anchor.parentElement.insertBefore(board, anchor);

    const oldParents = new Set();
    cfg.widgets.forEach(def => {
        const els = def.els().filter(Boolean);
        if (!els.length) return;
        const w = document.createElement('div');
        w.className = 'widget';
        w.dataset.widgetId = def.id;
        w.dataset.kind = def.kind;
        els.forEach(el => {
            if (el.parentElement) oldParents.add(el.parentElement);
            if (el.classList.contains('needs-finance')) w.classList.add('needs-finance');
            w.appendChild(el);
        });
        board.appendChild(w);
        enhanceWidget(w, board);
        setWidgetSize(w, def.size);
    });

    // กล่องเดิมที่ว่างแล้ว (กริดเดิม/แถวเดิม) เอาออก
    oldParents.forEach(p => { if (p !== board && p.isConnected && !p.querySelector('*:not(script)')) p.remove(); });
}

function setupWidgetBoards() {
    Object.keys(WIDGET_BOARDS).filter(n => !WIDGET_BOARDS[n].dynamic).forEach(buildWidgetBoard);
    applyAllWidgetLayouts();
}

document.addEventListener('DOMContentLoaded', () => {
    try { setupWidgetBoards(); } catch (err) { console.error('Widget board setup failed:', err); }
});

// ==================== ข้อความแนะนำปุ่ม (tooltip) แบบ iOS แทนกรอบดำของเบราว์เซอร์ ====================
// ใช้ title="..." เดิมทุกจุด (ไม่ต้องแก้ปุ่ม) — ตอนชี้เมาส์ ย้าย title ไปเก็บชั่วคราว (กันกรอบดำของเบราว์เซอร์ซ้อน)
// แล้วแสดงป้ายของเราแทน พอเมาส์ออกคืน title เดิมให้ (โค้ดอื่นที่อ่าน/แก้ title ยังทำงานเหมือนเดิม)
// เฉพาะเครื่องที่มีเมาส์ — มือถือ/iPad ไม่มี hover อยู่แล้ว
let _iosTip = null; // { el, title, box, timer }

function hideIosTooltip() {
    const t = _iosTip;
    if (!t) return;
    clearTimeout(t.timer);
    if (t.box) t.box.remove();
    t.el.removeAttribute('data-ios-tip');
    // คืน title ให้ (ถ้าระหว่างนั้นโค้ดอื่นไม่ได้ตั้ง title ใหม่)
    if (t.el.isConnected && !t.el.hasAttribute('title')) t.el.setAttribute('title', t.title);
    _iosTip = null;
}

function showIosTooltip(el, text) {
    const box = document.createElement('div');
    box.className = 'ios-tooltip';
    box.setAttribute('role', 'tooltip');
    box.textContent = text;
    document.body.appendChild(box);
    const r = el.getBoundingClientRect();
    const bw = box.offsetWidth, bh = box.offsetHeight;
    let top = r.top - bh - 8;
    if (top < 8) { top = r.bottom + 8; box.classList.add('is-below'); }
    const left = Math.max(8, Math.min(r.left + r.width / 2 - bw / 2, window.innerWidth - bw - 8));
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    return box;
}

function setupIosTooltips() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    document.addEventListener('mouseover', e => {
        // หาตัวที่มีคำอธิบาย "ใกล้เมาส์ที่สุด" เสมอ — ตัวที่กำลังแสดงอยู่ถูกถอด title ไว้ จึงหาด้วย data-ios-tip แทน
        // (เดิมถ้าชี้แถวตารางที่มี title ก่อน ปุ่มข้างในแถว เช่น ปิดงาน/แก้ไข/ลบ จะถูกข้าม แล้วขึ้นกรอบของเบราว์เซอร์แทน)
        const el = e.target.closest && e.target.closest('[title], [data-ios-tip]');
        if (!el || (_iosTip && _iosTip.el === el)) return;
        if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') return;
        const title = el.getAttribute('title');
        hideIosTooltip();
        if (!title || !title.trim()) return;
        el.removeAttribute('title');
        el.setAttribute('data-ios-tip', '');
        _iosTip = { el, title, box: null, timer: null };
        _iosTip.timer = setTimeout(() => {
            if (_iosTip && _iosTip.el === el && el.isConnected) _iosTip.box = showIosTooltip(el, title);
        }, 450);
    });

    document.addEventListener('mouseout', e => {
        if (!_iosTip) return;
        const to = e.relatedTarget;
        if (to && _iosTip.el.contains(to)) return; // ยังอยู่ในปุ่มเดิม (เลื่อนไปโดนไอคอนข้างใน)
        if (e.target === _iosTip.el || _iosTip.el.contains(e.target)) hideIosTooltip();
    });

    ['mousedown', 'keydown', 'wheel'].forEach(ev => document.addEventListener(ev, hideIosTooltip, true));
    window.addEventListener('scroll', hideIosTooltip, true);
    window.addEventListener('blur', hideIosTooltip);
}

document.addEventListener('DOMContentLoaded', () => {
    try { setupIosTooltips(); } catch (err) { console.error('Tooltip setup failed:', err); }
});

// ==================== คนงานแยกรายจังหวัด (แดชบอร์ด) ====================
// จังหวัดของคนงาน = จังหวัดสำนักงานใหญ่ของนายจ้าง (ระบบล็อกสถานที่ทำงานของคนงานไว้ตามนี้ — ดู getCustomerHQAddress)
function workerProvinceOf(w) {
    const c = customers.find(item => item.id === w.employerId);
    if (!c || !Array.isArray(c.branches) || !c.branches.length) return '';
    const b = c.branches.find(br => (br.name || '').includes('สำนักงานใหญ่')) || c.branches[0];
    return String((b && b.province) || '').trim();
}

function renderWorkerProvinces() {
    const el = document.getElementById('dashboard-worker-provinces');
    if (!el) return;
    const counts = {};
    workers.filter(w => w.status !== 'deleted').forEach(w => {
        const p = workerProvinceOf(w) || 'ไม่ระบุจังหวัด';
        counts[p] = (counts[p] || 0) + 1;
    });
    const rows = Object.entries(counts).sort((a, b) => (a[0] === 'ไม่ระบุจังหวัด') - (b[0] === 'ไม่ระบุจังหวัด') || b[1] - a[1]);
    const total = rows.reduce((s, [, n]) => s + n, 0);
    if (!rows.length) {
        el.innerHTML = `<p class="text-muted" style="text-align:center; padding: 16px;">ยังไม่มีข้อมูลคนงาน</p>`;
        return;
    }
    el.innerHTML = rows.map(([p, n]) => {
        const pct = total ? (n / total) * 100 : 0;
        return `<div class="chart-bar-item">
            <div class="bar-info"><span>${icon('pin')} ${escapeHtml(p === 'ไม่ระบุจังหวัด' ? p : 'จังหวัด' + p)}</span><span><strong>${n}</strong> คน (${pct.toFixed(0)}%)</span></div>
            <div class="bar-track"><div class="bar-fill" style="width: ${pct.toFixed(1)}%; background-color: var(--gold-primary);"></div></div>
        </div>`;
    }).join('') + `<p class="province-total text-muted">รวม ${total} คน</p>`;
    renderPieChartInto('db-provinces-chart', rows.map(([p, n]) => ({ name: p === 'ไม่ระบุจังหวัด' ? p : 'จังหวัด' + p, value: n })), { unit: 'คน', emptyText: 'ยังไม่มีข้อมูลคนงาน' });
}

// ==================== แคปซูลสถิติกดเข้าไปดูรายละเอียดได้ ====================
// <div class="stat-pill" data-go="..."> → เปิดหน้า/ตัวกรองที่ตรงกับตัวเลขนั้น (ตอนกด "แก้ไขหน้า" แผ่นกันกดของวิดเจ็ตบังไว้ จึงไม่พาไปไหน)
function scrollToWidget(boardName, widgetId) {
    const w = document.querySelector(`.widget-board[data-board="${boardName}"] > .widget[data-widget-id="${widgetId}"]`);
    if (!w) return;
    w.scrollIntoView({ behavior: iosReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    w.classList.remove('is-flash');
    void w.offsetWidth;
    w.classList.add('is-flash');
}

function setSelectValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function openStatTarget(target) {
    switch (target) {
        case 'customers': switchView('customers'); break;
        case 'workers': switchView('workers'); break;
        case 'open-jobs':
        case 'unassigned-jobs':
            switchView('jobs');
            setSelectValue('filter-job-status', '__open');
            setSelectValue('filter-job-month', '');
            setSelectValue('filter-job-assignee', target === 'unassigned-jobs' ? 'none' : '');
            jobsCurrentPage = 1;
            switchJobView('table');
            break;
        case 'expiry': scrollToWidget('dashboard', 'panel-expiry'); break;
        case 'missing-docs': scrollToWidget('dashboard', 'panel-missing-docs'); break;
        case 'stale-jobs': scrollToWidget('jobs', 'list-stale'); break;
        case 'appointments': scrollToWidget('jobs', 'list-appts'); break;
        case 'overdue-bills':
        case 'unbilled-jobs':
            switchView('expenses');
            switchFinancePageTab('billing');
            setSelectValue('filter-billing-payment-status', target === 'overdue-bills' ? 'overdue' : 'unbilled');
            renderBillingTab();
            break;
    }
}

document.addEventListener('click', e => {
    const pill = e.target.closest && e.target.closest('.stat-pill[data-go]');
    if (pill) openStatTarget(pill.dataset.go);
});
document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.stat-pill[data-go]')) {
        e.preventDefault();
        openStatTarget(e.target.dataset.go);
    }
});

// ==================== ตารางบนมือถือ: ติดชื่อหัวคอลัมน์ให้ทุกช่อง (ใช้กับ CSS การ์ดรายการบนจอเล็ก) ====================
// บนมือถือ (ดู "ตารางเป็นการ์ด" ใน styles.css) แต่ละแถวกลายเป็นการ์ด ช่องแสดงชื่อคอลัมน์ทางซ้ายจาก data-label
// ตารางถูก render ใหม่บ่อย (ค้นหา/กรอง) จึงดักการเปลี่ยนแปลงของ tbody แล้วติดป้ายใหม่ (เบา: แค่อ่านหัวตาราง)
function labelTableCells(table) {
    const heads = Array.from(table.querySelectorAll(':scope > thead th')).map(th => th.textContent.replace(/\s+/g, ' ').trim());
    if (!heads.length) return;
    table.querySelectorAll(':scope > tbody > tr, :scope > tfoot > tr').forEach(tr => {
        let col = 0;
        Array.from(tr.children).forEach(td => {
            if (!td.hasAttribute('data-label')) td.setAttribute('data-label', heads[col] || '');
            col += td.colSpan || 1;
        });
    });
}

function setupTableCardLabels() {
    let queued = new Set(), scheduled = false;
    const flush = () => { scheduled = false; queued.forEach(t => t.isConnected && labelTableCells(t)); queued = new Set(); };
    const queue = t => { queued.add(t); if (!scheduled) { scheduled = true; requestAnimationFrame(flush); } };
    document.querySelectorAll('table.data-table').forEach(queue);
    new MutationObserver(records => records.forEach(r => {
        const t = r.target.closest && r.target.closest('table.data-table');
        if (t) queue(t);
        r.addedNodes.forEach(n => n.nodeType === 1 && n.querySelectorAll && n.querySelectorAll('table.data-table').forEach(queue));
    })).observe(document.body, { childList: true, subtree: true });
}

document.addEventListener('DOMContentLoaded', () => {
    try { setupTableCardLabels(); } catch (err) { console.error('Table label setup failed:', err); }
});

// ==================== ปฏิทินเลือกวันที่แบบ iOS ====================
// ใช้กับ <input type="date"> ทุกช่อง (ค่า YYYY-MM-DD) และช่องพิมพ์วันที่ "วัน/เดือน/ปี ค.ศ." (placeholder มี "วัน/เดือน/ปี")
// ที่ได้ปุ่มปฏิทินเล็ก ๆ ในช่อง (ยังพิมพ์เอง/ให้ AI กรอกได้เหมือนเดิม) — ค่า DD/MM/YYYY
// ช่อง type="date" เปลี่ยนเฉพาะเครื่องที่ใช้เมาส์ — iPad/มือถือใช้ปฏิทินของเครื่อง (เป็นแบบ iOS อยู่แล้ว)
const IOS_WEEKDAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
let _iosCal = null; // { input, mode: 'iso'|'dmy', box, view: Date }

function iosCalParse(input, mode) {
    const v = (input.value || '').trim();
    let m;
    if (mode === 'iso' && (m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return new Date(+m[1], +m[2] - 1, +m[3]);
    if (mode === 'dmy' && (m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/))) {
        let y = +m[3];
        if (y > 2400) y -= 543; // เผื่อพิมพ์ปี พ.ศ.
        return new Date(y, +m[2] - 1, +m[1]);
    }
    return null;
}

function iosCalFormat(d, mode) {
    const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0');
    return mode === 'iso' ? `${d.getFullYear()}-${mm}-${dd}` : `${dd}/${mm}/${d.getFullYear()}`;
}

function closeIosCalendar() {
    if (!_iosCal) return;
    _iosCal.box.remove();
    _iosCal = null;
}

function iosCalSet(d) {
    const c = _iosCal;
    if (!c) return;
    const input = c.input;
    input.value = d ? iosCalFormat(d, c.mode) : '';
    closeIosCalendar();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
}

function renderIosCalendar() {
    const c = _iosCal;
    if (!c) return;
    const y = c.view.getFullYear(), mo = c.view.getMonth();
    const selected = iosCalParse(c.input, c.mode);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const min = c.mode === 'iso' && c.input.min ? iosCalParse({ value: c.input.min }, 'iso') : null;
    const max = c.mode === 'iso' && c.input.max ? iosCalParse({ value: c.input.max }, 'iso') : null;
    const start = new Date(y, mo, 1 - new Date(y, mo, 1).getDay());
    const same = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    let cells = '';
    for (let i = 0; i < 42; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const off = (min && d < min) || (max && d > max);
        const cls = ['ios-cal-day', d.getMonth() !== mo ? 'is-other' : '', same(d, today) ? 'is-today' : '', same(d, selected) ? 'is-selected' : ''].filter(Boolean).join(' ');
        cells += `<button type="button" class="${cls}" data-d="${iosCalFormat(d, 'iso')}" ${off ? 'disabled' : ''}>${d.getDate()}</button>`;
    }
    const monthName = MONTH_NAMES_TH[String(mo + 1).padStart(2, '0')];
    c.box.innerHTML = `
        <div class="ios-cal-head">
            <strong>${monthName} ${y + 543}</strong>
            <div class="ios-cal-nav">
                <button type="button" data-nav="-12" aria-label="ปีก่อน">«</button>
                <button type="button" data-nav="-1" aria-label="เดือนก่อน">‹</button>
                <button type="button" data-nav="1" aria-label="เดือนถัดไป">›</button>
                <button type="button" data-nav="12" aria-label="ปีถัดไป">»</button>
            </div>
        </div>
        <div class="ios-cal-week">${IOS_WEEKDAYS_TH.map(w => `<span>${w}</span>`).join('')}</div>
        <div class="ios-cal-grid">${cells}</div>
        <div class="ios-cal-foot">
            <button type="button" data-act="clear">ล้าง</button>
            <button type="button" data-act="today">วันนี้</button>
        </div>`;
}

function openIosCalendar(input, mode) {
    closeIosCalendar();
    const box = document.createElement('div');
    box.className = 'ios-calendar';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'เลือกวันที่');
    const sel = iosCalParse(input, mode);
    const base = sel || new Date();
    _iosCal = { input, mode, box, view: new Date(base.getFullYear(), base.getMonth(), 1) };
    document.body.appendChild(box);
    renderIosCalendar();

    box.addEventListener('mousedown', e => e.preventDefault()); // focus ค้างที่ช่องเดิม
    box.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b || b.disabled || !_iosCal) return;
        if (b.dataset.nav) { _iosCal.view.setMonth(_iosCal.view.getMonth() + Number(b.dataset.nav)); renderIosCalendar(); }
        else if (b.dataset.d) iosCalSet(iosCalParse({ value: b.dataset.d }, 'iso'));
        else if (b.dataset.act === 'today') iosCalSet(new Date());
        else if (b.dataset.act === 'clear') iosCalSet(null);
    });

    const r = input.getBoundingClientRect();
    const bw = box.offsetWidth, bh = box.offsetHeight;
    const below = window.innerHeight - r.bottom;
    const placeBelow = below >= bh + 12 || below > r.top;
    const top = placeBelow ? r.bottom + 6 : r.top - bh - 6;
    box.style.top = Math.max(8, top) + 'px';
    box.style.left = Math.max(8, Math.min(r.left, window.innerWidth - bw - 8)) + 'px';
    if (!placeBelow) box.classList.add('is-above');
}

function setupIosDatePickers() {
    const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

    // ช่อง type="date": คลิกด้วยเมาส์ → ปฏิทินของเราแทนของเบราว์เซอร์
    document.addEventListener('mousedown', e => {
        const t = e.target;
        if (_iosCal && !(t.closest && (t.closest('.ios-calendar') || t.closest('.date-text-btn'))) && t !== _iosCal.input) closeIosCalendar();
        if (!fine || e.button !== 0 || !t.matches || !t.matches('input[type="date"]') || t.disabled || t.readOnly) return;
        e.preventDefault();
        t.focus({ preventScroll: true });
        if (_iosCal && _iosCal.input === t) closeIosCalendar();
        else openIosCalendar(t, 'iso');
    }, true);

    document.addEventListener('keydown', e => {
        if (_iosCal && e.key === 'Escape') {
            e.stopPropagation();
            const i = _iosCal.input;
            closeIosCalendar();
            i.focus();
            return;
        }
        if (fine && e.target.matches && e.target.matches('input[type="date"]') && (e.key === 'Enter' || (e.altKey && e.key === 'ArrowDown'))) {
            e.preventDefault();
            openIosCalendar(e.target, 'iso');
        }
    }, true);
    window.addEventListener('scroll', e => { if (_iosCal && !_iosCal.box.contains(e.target)) closeIosCalendar(); }, true);
    window.addEventListener('resize', closeIosCalendar);

    // ช่องพิมพ์วันที่ (วัน/เดือน/ปี ค.ศ.) → ปุ่มปฏิทินในช่อง ใช้ได้ทุกเครื่อง (ช่องพวกนี้ไม่มีปฏิทินของเครื่อง)
    const enhance = input => {
        if (input._dateBtn) return;
        input._dateBtn = true;
        const wrap = document.createElement('span');
        wrap.className = 'date-text-wrap';
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'date-text-btn';
        btn.setAttribute('aria-label', 'เลือกวันที่จากปฏิทิน');
        btn.title = 'เลือกวันที่จากปฏิทิน';
        btn.innerHTML = icon('calendar');
        btn.addEventListener('mousedown', e => e.preventDefault());
        btn.addEventListener('click', () => {
            if (input.disabled || input.readOnly) return;
            if (_iosCal && _iosCal.input === input) closeIosCalendar();
            else openIosCalendar(input, 'dmy');
        });
        wrap.appendChild(btn);
    };
    document.querySelectorAll('input[type="text"][placeholder*="วัน/เดือน/ปี"]').forEach(enhance);
}

document.addEventListener('DOMContentLoaded', () => {
    try { setupIosDatePickers(); } catch (err) { console.error('Date picker setup failed:', err); }
});

// ==================== กราฟวงกลมในแดชบอร์ด: สัญชาติคนงาน + สถานะงาน ====================
const NATIONALITY_LABELS_TH = { Myanmar: 'เมียนมา (Myanmar)', Cambodia: 'กัมพูชา (Cambodia)', Laos: 'ลาว (Laos)', Vietnam: 'เวียดนาม (Vietnam)' };
const NATIONALITY_PIE_COLORS = { Myanmar: '#2d4fa3', Cambodia: '#64748b', Laos: '#38bdf8', Vietnam: '#a855f7' };
const JOB_STATUS_PIE = [
    { status: 'รอดำเนินการ', color: '#f59e0b' },
    { status: 'กำลังดำเนินการ', color: '#2d4fa3' },
    { status: 'รอเอกสารเพิ่มเติม', color: '#e0565b' },
    { status: 'ปิดงานแล้ว', color: '#1f9254' }
];

function renderDashboardPies(nationalityCounts) {
    renderPieChartInto('db-nationality-chart', Object.entries(nationalityCounts || {}).map(([nat, n]) => ({
        name: NATIONALITY_LABELS_TH[nat] || nat || 'ไม่ระบุ', value: n, color: NATIONALITY_PIE_COLORS[nat]
    })), { unit: 'คน', emptyText: 'ยังไม่มีข้อมูลคนงาน' });

    renderPieChartInto('db-job-status-chart', JOB_STATUS_PIE.map(s => ({
        name: s.status, value: jobs.filter(j => j.status === s.status).length, color: s.color
    })), { unit: 'งาน', emptyText: 'ยังไม่มีใบงานในระบบ' });
}

// ==================== ช่องข้อความหลายบรรทัด: จำขนาดที่ลากขยายไว้ (ต่อเครื่อง) ====================
// เช่น "Note สำหรับวางบิล" — ลากมุมให้สูงขึ้นแล้ว เปิดฟอร์มครั้งต่อไปยังสูงเท่าเดิม (เก็บใน localStorage ตาม id ของช่อง)
const TEXTAREA_SIZE_KEY = 'mw_textarea_heights';

function loadTextareaHeights() {
    try { return JSON.parse(localStorage.getItem(TEXTAREA_SIZE_KEY) || '{}') || {}; } catch (e) { return {}; }
}

function setupRememberTextareaSize() {
    const saved = loadTextareaHeights();
    document.querySelectorAll('textarea[id]').forEach(ta => {
        if (saved[ta.id]) ta.style.height = saved[ta.id] + 'px';
        // ลากมุมแล้วเบราว์เซอร์ตั้ง style.height ให้เอง (ไม่มี event ตอนปล่อยมุม) → ดักจากขนาดที่เปลี่ยน แล้วบันทึกหลังหยุดลาก
        // ไม่จำตอนช่องถูกซ่อน (สูง 0) หรือยังไม่เคยถูกลาก (ไม่มี style.height)
        if (!window.ResizeObserver) return;
        let timer = null;
        new ResizeObserver(() => {
            const h = parseFloat(ta.style.height);
            if (!h || !ta.offsetHeight) return;
            clearTimeout(timer);
            timer = setTimeout(() => {
                const all = loadTextareaHeights();
                if (all[ta.id] === h) return;
                all[ta.id] = h;
                try { localStorage.setItem(TEXTAREA_SIZE_KEY, JSON.stringify(all)); } catch (e) { /* ไม่เป็นไร แค่จำไม่ได้ */ }
            }, 400);
        }).observe(ta);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    try { setupRememberTextareaSize(); } catch (err) { console.error('Textarea size setup failed:', err); }
});

// ==================== ตรวจสอบข้อมูลก่อนบันทึก (ทุกการบันทึกในระบบ) ====================
// ก่อนส่งข้อมูลขึ้นคลาวด์ แสดงรายการ "ชื่อช่อง : ค่าที่กรอก" (เฉพาะช่องที่มีข้อมูล) ให้ผู้ใช้ตรวจอีกรอบ
// ดึงจากฟอร์มอัตโนมัติ (collectFormSummary) — ฟอร์มใหม่ใช้ได้เลยไม่ต้องเขียนรายการเอง
// รูปแบบรายการ: [{ label, value }] หรือ { heading } เป็นหัวข้อกลุ่ม
// grouped = หน้าต่างแบบกว้าง (wide) — แต่ละหัวข้อ + รายการใต้หัวข้อห่อใน .ui-sum-section ให้ CSS วางเป็นคอลัมน์ ไม่ต้องเลื่อนลง
function fillUiDialogSummary(box, rows, grouped) {
    let target = box;
    rows.forEach(r => {
        if (r.heading) {
            if (grouped) {
                target = document.createElement('div');
                target.className = 'ui-sum-section';
                box.appendChild(target);
            }
            const h = document.createElement('div');
            h.className = 'ui-sum-heading';
            h.textContent = r.heading;
            target.appendChild(h);
            return;
        }
        const row = document.createElement('div');
        row.className = 'ui-sum-row';
        const l = document.createElement('span');
        l.className = 'ui-sum-label';
        l.textContent = r.label;
        const v = document.createElement('span');
        v.className = 'ui-sum-value';
        v.textContent = r.value;
        row.append(l, v);
        target.appendChild(row);
    });
}

function cleanSummaryLabel(text) {
    return String(text || '').replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ').replace(/[:：]\s*$/, '').trim();
}

// ค่าที่แสดงของช่องหนึ่งช่อง ('' = ไม่มีข้อมูล ข้ามไป)
function summaryValueOf(group) {
    const checks = Array.from(group.querySelectorAll('input[type="checkbox"]'));
    if (checks.length > 1) {
        return checks.filter(c => c.checked).map(c => cleanSummaryLabel((c.closest('label') || {}).textContent || c.value)).join(', ');
    }
    const radio = group.querySelector('input[type="radio"]:checked');
    if (radio) return cleanSummaryLabel((radio.closest('label') || {}).textContent || radio.value);
    const sel = group.querySelector('select');
    if (sel && !sel.multiple) {
        if (!sel.value) return '';
        const opt = sel.options[sel.selectedIndex];
        return cleanSummaryLabel(opt ? ((opt.querySelector('.opt-bank-text') || opt).textContent) : sel.value);
    }
    if (sel && sel.multiple) return Array.from(sel.selectedOptions).map(o => cleanSummaryLabel(o.textContent)).join(', ');
    const file = group.querySelector('input[type="file"]');
    if (file && file.files && file.files.length) return Array.from(file.files).map(f => f.name).join(', ');
    const field = group.querySelector('textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"])');
    if (!field) return '';
    const v = String(field.value || '').trim();
    if (!v) return '';
    if (field.type === 'date') return formatThaiDate(v);
    if (field.type === 'password') return '••••••';
    return v;
}

function collectFormSummary(root) {
    const rows = [];
    if (!root) return rows;
    let lastHeading = '';
    root.querySelectorAll('.form-group').forEach(g => {
        if (g.parentElement && g.parentElement.closest('.form-group')) return;        // กลุ่มซ้อนกลุ่ม นับครั้งเดียว
        if (g.closest('.hidden:not([id^="cust-tab-"])')) return;                       // ช่องที่ซ่อนอยู่ (ยกเว้นแท็บในฟอร์มนายจ้าง)
        const labelEl = g.querySelector('label');
        const label = cleanSummaryLabel(labelEl ? labelEl.textContent : '');
        const value = summaryValueOf(g);
        if (!label || !value) return;
        // หัวข้อกลุ่ม: การ์ดสาขา → "สาขาที่ N: ชื่อสาขา", ส่วนที่มี data-summary-heading → ชื่อส่วนนั้น
        const branch = g.closest('.branch-card');
        const section = g.closest('[data-summary-heading]');
        let heading = '';
        if (branch) {
            const t = branch.querySelector('.branch-card-title');
            const n = branch.querySelector('.branch-name-input');
            heading = cleanSummaryLabel(`${t ? t.textContent : 'สาขา'} ${n ? n.value : ''}`);
        } else if (section) heading = section.dataset.summaryHeading;
        else if (lastHeading) heading = 'ข้อมูลอื่น ๆ';
        if (heading && heading !== lastHeading) rows.push({ heading });
        lastHeading = heading;
        rows.push({ label, value });
    });
    // ช่องติ๊กเดี่ยวนอก .form-group (เช่น "ต้องชำระเงินก่อนเริ่มดำเนินการ")
    root.querySelectorAll('input[type="checkbox"]').forEach(c => {
        if (c.closest('.form-group') || !c.checked || c.closest('.hidden')) return;
        const lbl = cleanSummaryLabel((c.closest('label') || {}).textContent || '');
        if (lbl) rows.push({ label: lbl, value: 'ใช่' });
    });
    return rows;
}

// ถามยืนยันพร้อมรายการข้อมูล — คืน true ถ้ากด "ยืนยันบันทึก"
// root = ฟอร์ม/กล่องที่จะอ่านค่า (null ได้ ถ้าส่ง rows เอง), extra = รายการเพิ่มท้าย (เช่น ยอดรวม)
async function confirmBeforeSave(root, title, extra = []) {
    const rows = [...collectFormSummary(root), ...extra];
    return uiConfirm(rows.length ? 'ตรวจสอบข้อมูลด้านล่างให้ถูกต้องก่อนบันทึก' : 'ยืนยันบันทึกข้อมูลนี้หรือไม่?', {
        title: title || 'ตรวจสอบข้อมูลก่อนบันทึก',
        summary: rows,
        okText: 'ยืนยันบันทึก',
        cancelText: 'กลับไปแก้ไข',
        danger: false
    });
}

// ==================== ที่อยู่จัดส่งเอกสาร: รายการแนะนำ จังหวัด → อำเภอ → ตำบล (พิมพ์เองได้) ====================
// ช่องยังเป็นช่องพิมพ์ (เก็บค่าที่พิมพ์ตามจริง แม้ไม่อยู่ในรายการ) และมีเมนูแนะนำแบบ iOS จาก SOUTHERN_ADDRESS_DB (attachSuggestMenu)
// เลือก/พิมพ์อำเภอที่ตรงกับในรายการ → เติมรหัสไปรษณีย์ของอำเภอนั้นให้ (แก้เองต่อได้)
function updateDeliveryAddressLists(districtChanged = false) {
    const prov = (document.getElementById('cust-delivery-province') || {}).value || '';
    const distEl = document.getElementById('cust-delivery-district');
    const postalEl = document.getElementById('cust-delivery-postal');
    // รายการแนะนำอ่านสดจาก SOUTHERN_ADDRESS_DB ตอนเปิดเมนู (attachSuggestMenu) — ที่นี่แค่เติมรหัสไปรษณีย์ตามอำเภอ
    const districts = SOUTHERN_ADDRESS_DB[prov.trim()] || null;
    const d = districts && distEl ? districts[distEl.value.trim()] : null;
    if (districtChanged && d && postalEl) postalEl.value = d.zip; // แก้เองต่อได้
}

document.addEventListener('DOMContentLoaded', () => {
    try { updateDeliveryAddressLists(); } catch (err) { console.error('Delivery address lists failed:', err); }
});

// ==================== ช่องพิมพ์ + เมนูแนะนำแบบ iOS (แทน <datalist> ที่เบราว์เซอร์แสดงเป็นกล่องสีดำ) ====================
// attachSuggestMenu(input, getItems): โฟกัส/พิมพ์ → เมนูรายการที่ตรงกับคำที่พิมพ์ (หน้าตาเดียวกับ dropdown แบบ iOS)
// คลิก/Enter เลือก → ใส่ค่าในช่องแล้วยิง event input (โค้ดเดิมที่ฟัง oninput ทำงานต่อ) — พิมพ์ค่าอื่นเองได้เสมอ
let _suggestMenu = null; // { input, menu, items: [el], active }

function closeSuggestMenu() {
    if (!_suggestMenu) return;
    _suggestMenu.menu.remove();
    _suggestMenu = null;
}

function pickSuggestItem(value) {
    const s = _suggestMenu;
    if (!s) return;
    const input = s.input;
    closeSuggestMenu();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

function setSuggestActive(i) {
    const s = _suggestMenu;
    if (!s || !s.items.length) return;
    if (s.active >= 0 && s.items[s.active]) s.items[s.active].classList.remove('is-active');
    s.active = (i + s.items.length) % s.items.length;
    s.items[s.active].classList.add('is-active');
    s.items[s.active].scrollIntoView({ block: 'nearest' });
}

function openSuggestMenu(input, getItems) {
    const q = input.value.trim().toLowerCase();
    const all = (getItems() || []).filter(Boolean);
    // ค่าที่พิมพ์ตรงกับรายการพอดี → แสดงทั้งหมด (ให้เปลี่ยนใจเลือกค่าอื่นได้ง่าย) ไม่งั้นกรองตามคำที่พิมพ์
    const list = !q || all.some(v => v.toLowerCase() === q) ? all : all.filter(v => v.toLowerCase().includes(q));
    if (_suggestMenu && _suggestMenu.input !== input) closeSuggestMenu();
    if (!list.length) { closeSuggestMenu(); return; }
    let menu = _suggestMenu ? _suggestMenu.menu : null;
    if (!menu) {
        menu = document.createElement('div');
        menu.className = 'ios-select-menu suggest-menu';
        menu.setAttribute('role', 'listbox');
        document.body.appendChild(menu);
    }
    menu.innerHTML = '';
    const items = list.map(v => {
        const el = document.createElement('div');
        el.className = 'ios-select-option' + (v.toLowerCase() === q ? ' is-selected' : '');
        el.setAttribute('role', 'option');
        el.textContent = v;
        el.addEventListener('mousedown', e => e.preventDefault());
        el.addEventListener('click', () => pickSuggestItem(v));
        menu.appendChild(el);
        return el;
    });
    _suggestMenu = { input, menu, items, active: -1 };
    const r = input.getBoundingClientRect();
    menu.style.minWidth = r.width + 'px';
    menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8)) + 'px';
    const below = window.innerHeight - r.bottom - 12;
    if (below < 200 && r.top > below) {
        menu.classList.add('is-above');
        menu.style.top = '';
        menu.style.bottom = (window.innerHeight - r.top + 6) + 'px';
        menu.style.maxHeight = Math.min(300, r.top - 12) + 'px';
    } else {
        menu.classList.remove('is-above');
        menu.style.bottom = '';
        menu.style.top = (r.bottom + 6) + 'px';
        menu.style.maxHeight = Math.min(300, Math.max(below, 120)) + 'px';
    }
}

function attachSuggestMenu(input, getItems) {
    if (!input || input._suggest) return;
    input._suggest = true;
    input.setAttribute('autocomplete', 'off');
    input.addEventListener('focus', () => openSuggestMenu(input, getItems));
    input.addEventListener('click', () => { if (!_suggestMenu) openSuggestMenu(input, getItems); });
    input.addEventListener('input', e => { if (e.isTrusted) openSuggestMenu(input, getItems); });
    input.addEventListener('blur', () => setTimeout(() => { if (_suggestMenu && _suggestMenu.input === input) closeSuggestMenu(); }, 120));
    input.addEventListener('keydown', e => {
        const s = _suggestMenu;
        if (!s || s.input !== input) {
            if (e.key === 'ArrowDown') { e.preventDefault(); openSuggestMenu(input, getItems); }
            return;
        }
        if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestActive(s.active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestActive(s.active - 1); }
        else if (e.key === 'Enter' && s.active >= 0) { e.preventDefault(); pickSuggestItem(s.items[s.active].textContent); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSuggestMenu(); }
    });
}

window.addEventListener('scroll', e => { if (_suggestMenu && !_suggestMenu.menu.contains(e.target)) closeSuggestMenu(); }, true);
window.addEventListener('resize', closeSuggestMenu);

// ที่อยู่จัดส่งเอกสาร: จังหวัด → อำเภอ → ตำบล จาก SOUTHERN_ADDRESS_DB
document.addEventListener('DOMContentLoaded', () => {
    try {
        const val = id => ((document.getElementById(id) || {}).value || '').trim();
        const districtsOf = () => SOUTHERN_ADDRESS_DB[val('cust-delivery-province')] || null;
        attachSuggestMenu(document.getElementById('cust-delivery-province'), () => Object.keys(SOUTHERN_ADDRESS_DB));
        attachSuggestMenu(document.getElementById('cust-delivery-district'), () => { const d = districtsOf(); return d ? Object.keys(d) : []; });
        attachSuggestMenu(document.getElementById('cust-delivery-subdistrict'), () => {
            const d = districtsOf();
            const x = d ? d[val('cust-delivery-district')] : null;
            return x ? x.subs : [];
        });
    } catch (err) { console.error('Delivery suggest setup failed:', err); }
});

// ==================== ถ่ายรูปเอกสารด้วยกล้อง (เฉพาะ iPad / มือถือ) แล้วให้ AI อ่านทันที ====================
// ปุ่ม "ถ่ายรูป" ข้างช่องแนบเอกสารคนงาน/นายจ้าง (ในฟอร์ม + หน้าแฟ้มเอกสาร) — เปิดกล้องหลังทันที
// ภาพที่ถ่าย ย่อเหลือด้านยาว ~2000px (JPEG) แล้วส่งเข้าช่องแนบเดิม → เส้นทางอัปโหลด + AI อ่านเดิม (fileSelectHandler ฯลฯ)
// คอมไม่แสดงปุ่มนี้ (ตามที่เจ้าของระบบกำหนด 2026-10-02)
function isCameraDevice() {
    return !!(window.matchMedia && window.matchMedia('(pointer: coarse), (any-pointer: coarse)').matches);
}

// ย่อรูปจากกล้อง (ไฟล์ 3–12 MB) ให้อัปโหลดเร็ว — AI ยังอ่านได้ชัด; ไม่ใช่รูป/ย่อไม่ได้ → คืนไฟล์เดิม
function shrinkImageFile(file, maxSide = 2000, quality = 0.85) {
    return new Promise(resolve => {
        if (!file || !/^image\//.test(file.type) || /gif|svg/.test(file.type)) { resolve(file); return; }
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
            if (scale === 1 && file.size < 2.5 * 1024 * 1024) { URL.revokeObjectURL(url); resolve(file); return; }
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.naturalWidth * scale);
            canvas.height = Math.round(img.naturalHeight * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            canvas.toBlob(blob => {
                if (!blob) { resolve(file); return; }
                const name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
                resolve(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }));
            }, 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });
}

// เปิดกล้องหลัง → ได้ไฟล์รูป 1 ไฟล์ (ผู้ใช้กดยกเลิก = ไม่ทำอะไร)
function capturePhotoFile() {
    return new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.setAttribute('capture', 'environment');
        input.style.display = 'none';
        input.addEventListener('change', () => {
            resolve(input.files && input.files[0] ? input.files[0] : null);
            input.remove();
        });
        document.body.appendChild(input);
        input.click();
    });
}

// ถ่ายรูปแล้วใส่เข้าช่องแนบไฟล์ที่กำหนด + ยิง change ให้โค้ดอัปโหลด/AI เดิมทำงาน
async function cameraToInput(targetInput) {
    if (!targetInput) return;
    const photo = await capturePhotoFile();
    if (!photo) return;
    const file = await shrinkImageFile(photo);
    try {
        const dt = new DataTransfer();
        dt.items.add(file);
        targetInput.files = dt.files;
    } catch (err) {
        console.error('Camera: cannot attach photo to input', err);
        showToast('❌ เครื่องนี้ส่งรูปจากกล้องเข้าช่องแนบไม่ได้ กรุณาแตะช่องแนบแล้วเลือก "ถ่ายรูป" แทน', 'danger');
        return;
    }
    targetInput.dispatchEvent(new Event('change', { bubbles: true }));
}

function cameraButtonHtml(onclick, extraClass = '') {
    return `<button type="button" class="camera-btn ${extraClass}" onclick="event.stopPropagation(); event.preventDefault(); ${onclick}" title="ถ่ายรูปเอกสาร (AI อ่านให้ทันที)">${icon('photo')} ถ่ายรูป</button>`;
}

// หน้าแฟ้มเอกสาร: ตั้งประเภทเอกสารที่จะแนบ แล้วถ่ายรูปเข้าช่องอัปโหลดของแฟ้ม
function cameraCustomerFolderUpload(docType) {
    activeFolderCustomerDocType = docType;
    cameraToInput(document.getElementById('customer-folder-upload-input'));
}

function cameraWorkerFolderUpload(docType) {
    if (!can('ops')) return; // แก้/ลบ/แนบไฟล์ในแฟ้มคนงานได้เฉพาะเจ้าหน้าที่ (ไม่ใช่นายจ้าง)
    activeFolderDocType = docType;
    cameraToInput(document.getElementById('folder-upload-input'));
}

// ฟอร์มคนงาน/นายจ้าง: ใส่ปุ่มกล้องในกล่องแนบเอกสารทุกกล่อง (ช่อง file-worker-* / file-cust-* / file-employer-*)
function setupCameraButtons() {
    if (!isCameraDevice()) return;
    document.body.classList.add('has-camera');
    document.querySelectorAll('.upload-box .file-input').forEach(input => {
        if (!/^file-(worker|cust|employer)-/.test(input.id || '')) return;
        const box = input.closest('.upload-box');
        if (!box || box.querySelector('.camera-btn')) return;
        box.insertAdjacentHTML('beforeend', cameraButtonHtml(`cameraToInput(document.getElementById('${input.id}'))`));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    try { setupCameraButtons(); } catch (err) { console.error('Camera setup failed:', err); }
});

// ==================== พอร์ทัลนายจ้าง: โน้ตถึงเจ้าหน้าที่ต่อคนงาน 1 คน ====================
// ข้อความเดียวต่อคนงาน นายจ้างแก้ทับได้ (ไม่มีแจ้งเตือนในกระดิ่ง — ยืนยันกับเจ้าของระบบ 2026-10-02)
// บันทึกผ่าน set_my_worker_note() ซึ่งแก้ได้เฉพาะโน้ตของคนงานในบริษัทตัวเอง (ดู migration 20261002102002)
function openClientWorkerNote(workerId) {
    const w = workers.find(x => x.id === workerId);
    if (!w) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'ui-dialog-backdrop';
    backdrop.innerHTML = `
        <div class="ui-dialog client-note-dialog" role="dialog" aria-modal="true">
            <div class="ui-dialog-icon ui-dialog-icon-blue">${icon('chat', 'blue')}</div>
            <h3 class="ui-dialog-title"></h3>
            <p class="ui-dialog-message">เจ้าหน้าที่จะเห็นข้อความนี้ในข้อมูลคนงาน เช่น ย้ายไปทำงานสาขาอื่น, ลาออก, ขอต่อเอกสาร</p>
            <textarea class="client-note-input" rows="5" maxlength="2000" placeholder="พิมพ์โน้ตถึงเจ้าหน้าที่..."></textarea>
            <div class="ui-dialog-actions">
                <button type="button" class="btn btn-gold ui-dialog-ok">บันทึกโน้ต</button>
                <button type="button" class="btn btn-outline ui-dialog-cancel">ยกเลิก</button>
            </div>
        </div>`;
    backdrop.querySelector('.ui-dialog-title').textContent = `โน้ต: ${`${w.title || ''} ${w.firstName || ''} ${w.lastName || ''}`.trim()}`;
    const input = backdrop.querySelector('.client-note-input');
    input.value = w.clientNote || '';
    const close = () => { document.removeEventListener('keydown', onKey, true); backdrop.remove(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    const okBtn = backdrop.querySelector('.ui-dialog-ok');
    okBtn.addEventListener('click', async () => {
        const note = input.value.trim();
        okBtn.disabled = true;
        const res = await callCloudAPI('setMyWorkerNote', { workerId, note });
        if (!res || res.status === 'error') {
            okBtn.disabled = false;
            showToast('❌ บันทึกโน้ตไม่สำเร็จ: ' + (res && res.message ? res.message : 'กรุณาลองใหม่'), 'danger');
            return;
        }
        w.clientNote = note;
        w.clientNoteUpdatedAt = new Date().toISOString();
        saveData();
        close();
        renderClientPortal();
        showToast(note ? 'บันทึกโน้ตเรียบร้อยแล้ว' : 'ลบโน้ตเรียบร้อยแล้ว', 'success');
    });
    backdrop.querySelector('.ui-dialog-cancel').addEventListener('click', close);
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(backdrop);
    input.focus();
}

// =============== เลื่อนเฉพาะกล่องที่เมาส์ชี้ ===============
// หมุนล้อเมาส์ในกล่องที่เลื่อนได้ (ตาราง, รายการ, dropdown, modal) เมื่อเลื่อนสุดแล้ว
// ไม่ให้ทะลุไปเลื่อนทั้งหน้าหรือกล่องชั้นนอกต่อ
(function setupScrollContain() {
    const canScrollY = (el) => {
        if (el.scrollHeight <= el.clientHeight + 1) return false;
        const oy = getComputedStyle(el).overflowY;
        return oy === 'auto' || oy === 'scroll' || oy === 'overlay';
    };
    document.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.defaultPrevented) return;
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        let el = e.target instanceof Element ? e.target : null;
        while (el && el !== document.body && el !== document.documentElement) {
            if (!el.classList.contains('main-panel') && canScrollY(el)) {
                const atTop = el.scrollTop <= 0;
                const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
                if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) e.preventDefault();
                return;
            }
            el = el.parentElement;
        }
    }, { passive: false });
})();

// =============== ลากไฟล์ชิดขอบ = เลื่อนอัตโนมัติ ===============
// ระหว่างลากไฟล์จากเครื่อง Windows ยึดเมาส์ไว้ หมุนล้อเลื่อนไม่ได้ — ลากไปใกล้ขอบบน/ล่างของกล่องที่เลื่อนได้
// (modal, รายการ, หรือทั้งหน้า) แล้วจะเลื่อนให้เอง ยิ่งชิดขอบยิ่งเร็ว
(function setupDragAutoScroll() {
    const EDGE = 70, MAX_STEP = 22;
    const scrollableY = (el) => {
        if (el.scrollHeight <= el.clientHeight + 1) return false;
        const oy = getComputedStyle(el).overflowY;
        return oy === 'auto' || oy === 'scroll' || oy === 'overlay';
    };
    const step = (dist) => Math.ceil(MAX_STEP * (1 - Math.max(0, dist) / EDGE));
    document.addEventListener('dragover', (e) => {
        const y = e.clientY;
        // กล่องที่เลื่อนได้ใกล้เมาส์ที่สุดก่อน (เช่น modal-body) ถ้าเลื่อนต่อไม่ได้แล้วค่อยลองชั้นนอก/ทั้งหน้า
        let el = e.target instanceof Element ? e.target : null;
        while (el && el !== document.body && el !== document.documentElement) {
            if (scrollableY(el)) {
                const r = el.getBoundingClientRect();
                const top = Math.max(r.top, 0), bottom = Math.min(r.bottom, window.innerHeight);
                if (y - top < EDGE && el.scrollTop > 0) { el.scrollTop -= step(y - top); return; }
                if (bottom - y < EDGE && el.scrollTop + el.clientHeight < el.scrollHeight - 1) { el.scrollTop += step(bottom - y); return; }
            }
            el = el.parentElement;
        }
        if (y < EDGE) window.scrollBy(0, -step(y));
        else if (window.innerHeight - y < EDGE) window.scrollBy(0, step(window.innerHeight - y));
    });
})();
