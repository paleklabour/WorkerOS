// supabase/functions/ocr-document/index.ts
// อ่านเอกสารคนงาน (พาสปอร์ต/ใบอนุญาตทำงาน/วีซ่า/บัตรประชาชนพม่า) ด้วย Gemini
// ย้ายมาจาก extractDataWithGemini() ใน Code.gs เดิม — logic/prompt/schema เหมือนเดิมทุกอย่าง
// ต้องตั้งค่า secret ก่อน deploy:
//   supabase secrets set GEMINI_API_KEY=xxxxx
//
// Deploy: supabase functions deploy ocr-document
// เรียกจาก client พร้อม Authorization: Bearer <user's access token>
// (ผู้ใช้ต้องล็อกอินแล้ว — ฟังก์ชันนี้ตรวจสอบ token กับ Supabase ก่อนเรียก Gemini)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_FALLBACK_MODEL = Deno.env.get("GEMINI_FALLBACK_MODEL") || ""; // ไม่บังคับ — รุ่นสำรองตอนรุ่นหลักคนใช้เยอะ
const RETRYABLE_STATUSES = [429, 500, 503];
const RETRY_DELAYS_MS = [1500, 4000]; // ลองซ้ำอีก 2 ครั้งต่อรุ่น
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_DOC_TYPES = [
  "worker-passport", "worker-wp-doc", "worker-visa", "worker-myanmar-id", "worker-pink-card", "worker-insurance-doc",
  "worker-receipt", // ใบเสร็จกรมการจัดหางาน: ชื่อ, เลขประจำตัวคนต่างด้าว, อีเมล (ใช้ prompt คนงานทั่วไป)
  "cust-id-card", "cust-cert", "cust-house", "cust-commerce",
  "expense-slip",
  "job-appointment",
  "worker-auto", // Bulk Import: ยังไม่รู้ประเภทเอกสาร ให้ AI จำแนกประเภทเอง + อ่านข้อมูลคนงานในคราวเดียว
];

// ประเภทเอกสารคนงานที่ "worker-auto" ให้ AI เลือกตอบ — key ต้องตรงกับ WORKER_DOC_TYPES ใน app.js
const WORKER_AUTO_DOC_TYPES: Record<string, string> = {
  "worker-wp-doc": "Thai work permit card/document or e-WorkPermit (ใบอนุญาตทำงาน)",
  "worker-passport": "passport or CI (Certificate of Identity)",
  "worker-myanmar-id": "Myanmar national ID card or household registration",
  "worker-pink-card": "Thai pink card for non-Thai persons (บัตรชมพู / บัตรประจำตัวคนซึ่งไม่มีสัญชาติไทย)",
  "worker-receipt": "payment receipt (ใบเสร็จรับเงิน)",
  "worker-medical": "medical certificate (ใบรับรองแพทย์)",
  "worker-insurance-doc": "health/accident insurance policy",
  "worker-application": "application form (ใบคำขอ / บต.46)",
};
const CUSTOMER_DOC_TYPES = ["cust-id-card", "cust-cert", "cust-house", "cust-commerce"];

const EXPENSE_CATEGORIES = [
  "ค่าเช่าสำนักงาน", "เงินเดือนพนักงาน", "ค่าน้ำ-ไฟ-อินเทอร์เน็ต",
  "ค่าธรรมเนียมราชการ/กรมจัดหางาน", "ค่าคอมมิชชั่น Agent", "ค่าเดินทาง", "ค่าอุปกรณ์สำนักงาน", "อื่นๆ",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildExpenseSlipPrompt(): string {
  return `You are a professional bookkeeping assistant. Parse this payment slip / receipt / bank transfer confirmation ` +
    `and extract the relevant fields for an expense record. Convert the date to DD/MM/YYYY format. Only fill fields you ` +
    `can actually read from the image — leave a field out entirely (do not guess or invent values) if it is not clearly ` +
    `present. For "amount", output digits only (no currency symbol, no commas, e.g. "1500.00"). For "category", pick the ` +
    `single best match from this exact list based on the payee/memo/items shown, or omit the field if none clearly fit: ` +
    `${JSON.stringify(EXPENSE_CATEGORIES)}. ` +
    `Output ONLY a valid JSON object matching this schema, without markdown wrapping, json declaration, or backticks:\n` +
    `{\n` +
    `  "amount": "numeric amount only, e.g. 1500.00",\n` +
    `  "date": "transaction/receipt date in DD/MM/YYYY format",\n` +
    `  "description": "short description — payee name, memo, or what this payment is for",\n` +
    `  "category": "one value from the fixed category list above, only if it clearly matches"\n` +
    `}`;
}

function buildCustomerDocPrompt(docType: string): string {
  const docLabels: Record<string, string> = {
    "cust-id-card": "Thai national ID card of the employer/director",
    "cust-cert": "Thai company registration certificate (หนังสือรับรองบริษัท)",
    "cust-house": "Thai company house registration document (ทะเบียนบ้านบริษัท)",
    "cust-commerce": "Thai commercial registration certificate (ทะเบียนพาณิชย์)",
  };
  const docLabel = docLabels[docType] || "Thai company/employer document";
  // หนังสือรับรองบริษัทไม่มีวันหมดอายุพิมพ์ไว้ มีแค่ "วันที่ออก" — ให้ OCR อ่านค่านี้แล้วฝั่ง client
  // ไปคำนวณวันหมดอายุโดยประมาณเอง (ดู updateCertExpiryDisplay ใน app.js)
  const fields = [
    `"companyName": "Registered company name, only if this is a company certificate"`,
    `"taxId": "13-digit tax ID / company registration number (เลขทะเบียนนิติบุคคล / เลขผู้เสียภาษี) if found"`,
    `"directorId": "13-digit Thai national ID number (เลขบัตรประชาชน) if this is a national ID card"`,
    `"coordinatorName": "Full name of the ID card holder / director, if found"`,
  ];
  if (docType === "cust-cert") {
    fields.push(`"issueDate": "Date the certificate was issued (วันที่ออกหนังสือรับรอง / ออกให้ ณ วันที่), in DD/MM/YYYY format, if found"`);
  }
  return `You are a professional assistant. Parse this ${docLabel} and extract the relevant fields. ` +
    `Convert dates to DD/MM/YYYY format. Only fill fields you can actually read from the document — ` +
    `leave a field out entirely (do not guess or invent values) if it is not clearly present. ` +
    `Output ONLY a valid JSON object matching this schema, without markdown wrapping, json declaration, or backticks:\n` +
    `{\n  ${fields.join(",\n  ")}\n}`;
}

function buildAppointmentPrompt(): string {
  return `You are a professional assistant. Parse this "ใบนัดหมาย / Appointment Form" issued by the Thai Department of ` +
    `Employment (กรมการจัดหางาน) / e-WorkPermit system for a migrant worker's appointment (e.g. at a Mobile Work Permit ` +
    `Unit, a CI/passport service center, or an immigration office). Only fill fields you can actually read from the ` +
    `document — leave a field out entirely (do not guess or invent values) if it is not clearly present. ` +
    `Output ONLY a valid JSON object matching this schema, without markdown wrapping, json declaration, or backticks:\n` +
    `{\n` +
    `  "appointmentDate": "Appointment date (วันที่นัดหมาย), converted to DD/MM/YYYY format (Gregorian/ค.ศ., not Buddhist year)",\n` +
    `  "appointmentTime": "Appointment time (เวลานัดหมาย), e.g. 09:00",\n` +
    `  "appointmentNo": "Appointment number (เลขที่นัดหมาย / Appointment No.), e.g. 4-PTN001032600071",\n` +
    `  "appointmentLocation": "Service center/unit name and address (ชื่อศูนย์/หน่วยบริการ + สถานที่), combined as one line",\n` +
    `  "requestNo": "Request number (เลขที่คำขอ / Request No.) if found",\n` +
    `  "serviceType": "Service type (ประเภทบริการ / Service type) if found, in Thai"\n` +
    `}`;
}

function buildInsurancePrompt(): string {
  return `You are a professional assistant. Parse this health/accident insurance policy document for a migrant worker ` +
    `and extract the relevant fields. Convert dates to DD/MM/YYYY format. Only fill fields you can actually read from ` +
    `the document — leave a field out entirely (do not guess or invent values) if it is not clearly present. ` +
    `Output ONLY a valid JSON object matching this schema, without markdown wrapping, json declaration, or backticks:\n` +
    `{\n` +
    `  "insuranceNo": "Policy number / เลขกรมธรรม์ if found",\n` +
    `  "provider": "Insurance company name (บริษัทประกัน) if found",\n` +
    `  "coverageStart": "Coverage start date (วันที่คุ้มครองเริ่มต้น) in DD/MM/YYYY format if found",\n` +
    `  "coverageEnd": "Coverage end date (วันที่คุ้มครองสิ้นสุด) in DD/MM/YYYY format if found"\n` +
    `}`;
}

function buildPrompt(docType: string): string {
  if (docType === "expense-slip") return buildExpenseSlipPrompt();
  if (docType === "job-appointment") return buildAppointmentPrompt();
  if (docType === "worker-insurance-doc") return buildInsurancePrompt();
  if (CUSTOMER_DOC_TYPES.includes(docType)) return buildCustomerDocPrompt(docType);
  const classify = docType === "worker-auto"
    ? `First identify which kind of document this is and put the matching key in "documentType", choosing ONLY from: ` +
      `${JSON.stringify(WORKER_AUTO_DOC_TYPES)} (or "other" if none fit). Then extract the fields below that apply to that kind of document. ` +
      `Each identifier belongs only to its own document kind: never copy a pink card number into "uid", and only fill "uid" ` +
      `from a work permit's 13-digit worker ID (เลขประจำตัวคนต่างด้าว). `
    : "";
  return `You are a professional assistant. ${classify}Parse this migrant worker document (${docType}) and extract the relevant fields. ` +
    `Convert all dates to DD/MM/YYYY format. Only fill fields you can actually read from the document — ` +
    `leave a field out entirely (do not guess or invent values) if it is not clearly present in the image/PDF. ` +
    `IMPORTANT naming rule: Myanmar (Burmese) names do NOT have a family surname — the full printed name is a single ` +
    `given name, even if it has multiple words (e.g. "HTET DO", "AUNG NAING WIN"). If nationality is Myanmar, put the ` +
    `ENTIRE name into "firstName" and leave "lastName" empty. Only split into firstName/lastName for nationalities that ` +
    `actually use a family surname (e.g. Lao, Cambodian names may still be a single name too — when in doubt, do not split). ` +
    `Output ONLY a valid JSON object matching this schema, without markdown wrapping, json declaration, or backticks:\n` +
    `{\n` +
    (docType === "worker-auto"
      ? `  "documentType": "one key from the document kind list above, or other",\n` +
        // ใช้ครอปรูปหน้าคนงานจากเอกสารไปเป็นรูปประจำตัวตอน Bulk Import สร้างคนงานใหม่ (ดู cropPhotoFromFile ใน app.js)
        `  "photoBox": "only if the document shows a printed portrait photo of the person: its bounding box as [ymin, xmin, ymax, xmax] ` +
        `normalized to 0-1000 on the first page/image; omit if there is no portrait photo",\n`
      : "") +
    `  "firstName": "Full given name (English or Thai) — see naming rule above",\n` +
    `  "lastName": "Family surname only if one genuinely exists — leave empty for Myanmar nationals",\n` +
    `  "uid": "13-digit worker ID (เลขประจำตัวคนต่างด้าว 13 หลัก) if found",\n` +
    `  "passportNo": "Passport number if passport",\n` +
    `  "passportExpiry": "DD/MM/YYYY format if passport",\n` +
    `  "passportPob": "Place of birth (as printed on passport/CI) if passport",\n` +
    `  "passportAuth": "Issuing authority (Authority field) if passport",\n` +
    `  "passportIssue": "Date of issue in DD/MM/YYYY format if passport",\n` +
    `  "permitNo": "Work permit number or Receipt number (เลขรับที่) if work permit",\n` +
    `  "permitExpiry": "DD/MM/YYYY format if work permit",\n` +
    `  "dob": "Date of birth in DD/MM/YYYY",\n` +
    `  "nationality": "Myanmar, Cambodia, or Laos",\n` +
    `  "gender": "Male or Female or ชาย or หญิง",\n` +
    `  "title": "Name title/honorific if printed — นาย, นาง, นางสาว, เด็กชาย, เด็กหญิง, Mr, Mrs, or Miss",\n` +
    `  "position": "Job position (ตำแหน่งงาน) e.g., กรรมกร",\n` +
    `  "workplace": "Workplace address (สถานที่ทำงาน) if found",\n` +
    `  "refNo": "17-digit reference number (รหัสอ้างอิงคนต่างด้าว) starting with RA if found",\n` +
    `  "pinkCardNo": "13-digit pink card number (เลขที่บัตรชมพู) if this is a pink card",\n` +
    `  "thaiName": "Full name as printed in Thai script on the pink card, if this is a pink card",\n` +
    `  "insuranceNo": "Health insurance number (เลขประกันสุขภาพ) if found, e.g. on a pink card",\n` +
    `  "email": "Email address (อีเมล / Email) printed on the document if found, e.g. the Email field on a Department of Employment receipt"\n` +
    `}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    // ตรวจสอบว่าผู้เรียกล็อกอินอยู่จริง (ไม่ใช่ anon ที่ไม่มี session)
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ status: "error", message: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ status: "success", parsedData: null }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { base64Data, mimeType, docType } = await req.json();
    if (!base64Data || !mimeType || !ALLOWED_DOC_TYPES.includes(docType)) {
      return new Response(JSON.stringify({ status: "success", parsedData: null }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const payload = {
      contents: [{ parts: [{ inlineData: { mimeType, data: base64Data } }, { text: buildPrompt(docType) }] }],
      generationConfig: { responseMimeType: "application/json" },
    };

    // Gemini ตอบ 503 "high demand" / 429 เป็นพัก ๆ — ลองซ้ำพร้อมหน่วงเวลาก่อนยอมแพ้ และถ้าตั้ง secret
    // GEMINI_FALLBACK_MODEL ไว้ จะลองรุ่นสำรองต่ออีกรอบ (ไม่ได้ตั้งไว้ = ใช้รุ่นหลักอย่างเดียว)
    const models = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter((m, i, arr) => m && arr.indexOf(m) === i);
    let geminiRes: Response | null = null;
    let lastStatus = 0;
    outer: for (const model of models) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      for (let attempt = 0; attempt < RETRY_DELAYS_MS.length + 1; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) { geminiRes = res; break outer; }
        lastStatus = res.status;
        const errText = await res.text();
        console.error(`Gemini API error (${model}, attempt ${attempt + 1}):`, res.status, errText);
        if (!RETRYABLE_STATUSES.includes(res.status)) break outer; // เช่น 400 ไฟล์เสีย/คีย์ผิด ลองซ้ำไปก็ไม่หาย
      }
    }

    if (!geminiRes) {
      // ยังตอบ success เพื่อให้การอัปโหลดไฟล์ถือว่าสำเร็จ แต่แนบเหตุผลไปให้หน้าเว็บแจ้งผู้ใช้ว่า AI ไม่ได้อ่าน
      const ocrError = RETRYABLE_STATUSES.includes(lastStatus) ? "busy" : "failed";
      return new Response(JSON.stringify({ status: "success", parsedData: null, ocrError }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const json = await geminiRes.json();
    const textResponse = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    let parsedData = null;
    if (textResponse) {
      let cleaned = textResponse.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }
      try {
        parsedData = JSON.parse(cleaned);
      } catch (e) {
        console.error("Failed to parse Gemini JSON output:", e, cleaned);
      }
    }

    return new Response(JSON.stringify({ status: "success", parsedData }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ocr-document error:", error);
    return new Response(JSON.stringify({ status: "error", message: String(error) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
