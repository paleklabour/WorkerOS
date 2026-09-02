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
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_DOC_TYPES = [
  "worker-passport", "worker-wp-doc", "worker-visa", "worker-myanmar-id", "worker-pink-card",
  "cust-id-card", "cust-cert",
  "expense-slip",
];
const CUSTOMER_DOC_TYPES = ["cust-id-card", "cust-cert"];

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
  const docLabel = docType === "cust-id-card" ? "Thai national ID card of the employer/director" : "Thai company registration certificate (หนังสือรับรองบริษัท)";
  return `You are a professional assistant. Parse this ${docLabel} and extract the relevant fields. ` +
    `Convert dates to DD/MM/YYYY format. Only fill fields you can actually read from the document — ` +
    `leave a field out entirely (do not guess or invent values) if it is not clearly present. ` +
    `Output ONLY a valid JSON object matching this schema, without markdown wrapping, json declaration, or backticks:\n` +
    `{\n` +
    `  "companyName": "Registered company name, only if this is a company certificate",\n` +
    `  "taxId": "13-digit tax ID / company registration number (เลขทะเบียนนิติบุคคล / เลขผู้เสียภาษี) if found",\n` +
    `  "directorId": "13-digit Thai national ID number (เลขบัตรประชาชน) if this is a national ID card",\n` +
    `  "coordinatorName": "Full name of the ID card holder / director, if found"\n` +
    `}`;
}

function buildPrompt(docType: string): string {
  if (docType === "expense-slip") return buildExpenseSlipPrompt();
  if (CUSTOMER_DOC_TYPES.includes(docType)) return buildCustomerDocPrompt(docType);
  return `You are a professional assistant. Parse this migrant worker document (${docType}) and extract the relevant fields. ` +
    `Convert all dates to DD/MM/YYYY format. Only fill fields you can actually read from the document — ` +
    `leave a field out entirely (do not guess or invent values) if it is not clearly present in the image/PDF. ` +
    `IMPORTANT naming rule: Myanmar (Burmese) names do NOT have a family surname — the full printed name is a single ` +
    `given name, even if it has multiple words (e.g. "HTET DO", "AUNG NAING WIN"). If nationality is Myanmar, put the ` +
    `ENTIRE name into "firstName" and leave "lastName" empty. Only split into firstName/lastName for nationalities that ` +
    `actually use a family surname (e.g. Lao, Cambodian names may still be a single name too — when in doubt, do not split). ` +
    `Output ONLY a valid JSON object matching this schema, without markdown wrapping, json declaration, or backticks:\n` +
    `{\n` +
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
    `  "insuranceNo": "Health insurance number (เลขประกันสุขภาพ) if found, e.g. on a pink card"\n` +
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

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
      contents: [{ parts: [{ inlineData: { mimeType, data: base64Data } }, { text: buildPrompt(docType) }] }],
      generationConfig: { responseMimeType: "application/json" },
    };

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      return new Response(JSON.stringify({ status: "success", parsedData: null }), {
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
