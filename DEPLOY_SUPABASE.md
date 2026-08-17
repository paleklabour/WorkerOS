# ย้ายระบบไป Supabase — ขั้นตอน Deploy

## 1. สร้างฐานข้อมูล
รันไฟล์ `schema.sql` (อยู่ root ของ zip) ทั้งหมดใน Supabase Dashboard → SQL Editor

## 2. สร้าง Storage bucket
Dashboard → Storage → New bucket → ตั้งชื่อ `worker-documents` → Public bucket (เพื่อให้ fileUrl เปิดดูได้ตรงเหมือน Google Drive เดิม)

## 3. สร้างผู้ใช้ชุดแรก (Supabase Auth)
Dashboard → Authentication → Users → Add user → ใส่ email + password ใหม่ให้แต่ละคน
จากนั้นไปที่ SQL Editor รันเพิ่มแถวใน `profiles` ผูก id ของแต่ละคน (คัดลอก UUID จากหน้า Users):

```sql
insert into profiles (id, name, role, customer_id) values
  ('<uuid-ของ-admin>', 'ชื่อแอดมิน', 'admin', null);
```

หลังจากนี้ผู้ใช้ที่เหลือให้สร้างผ่านฟีเจอร์ "เพิ่มผู้ใช้งาน" ในแอป (เรียก Edge Function `create-user` ให้อัตโนมัติ)

## 4. ตั้งค่า Secrets สำหรับ Edge Functions
```bash
supabase secrets set GEMINI_API_KEY=xxxxxxxx
supabase secrets set ADMIN_PIN=xxxx   # ตั้งรหัส PIN จริง (เดิม default คือ 1973)
```
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ถูกฉีดให้อัตโนมัติโดย Supabase อยู่แล้ว ไม่ต้องตั้งเอง)

## 5. Deploy Edge Functions
```bash
supabase functions deploy ocr-document
supabase functions deploy create-user
```

## 6. ตั้งค่าฝั่งเว็บแอป
แก้ในไฟล์ `index.html` (มองหาคอมเมนต์ TODO):
```html
window.SUPABASE_URL = "https://xxxxxxxx.supabase.co";
window.SUPABASE_ANON_KEY = "eyJ...";   // anon public key เท่านั้น ห้ามใช้ service_role
```

## สิ่งที่ยังไม่ได้ทำในรอบนี้ (รอคำสั่งถัดไป)
- Line webhook (`handleLineWebhook` ใน Code.gs เดิม) — ยังไม่มี Edge Function แทน
- หน้าตั้งค่า/ทดสอบการเชื่อมต่อ (`testGoogleSheetsConnection`, ปุ่มกรอก Web App URL) ยังอ้างอิงระบบเดิมอยู่บางจุด ยังไม่ได้ปรับเป็น Supabase
- ยังไม่ได้ทดสอบรันจริงกับโปรเจกต์ Supabase จริง (ต้องใส่ URL/Key แล้วลองใช้งาน)
