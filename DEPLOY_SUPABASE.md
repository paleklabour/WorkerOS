# ย้ายระบบไป Supabase — ขั้นตอน Deploy

## 1. สร้างฐานข้อมูล
Schema ย้ายมาอยู่ใน `supabase/migrations/` แล้ว (ไม่ใช่ `schema.sql` เดี่ยว ๆ อีกต่อไป —
ดู `DEVELOPMENT.md` เรื่องวิธีเพิ่ม migration ใหม่) apply ด้วย Supabase CLI:

```powershell
winget install Supabase.CLI          # ครั้งแรกเท่านั้น
supabase login                       # เปิดเบราว์เซอร์ให้ล็อกอิน
supabase link --project-ref cagpzvrqtjkuabhqaqon
supabase db push                     # apply ทุก migration ใน supabase/migrations/
```

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

## สถานะปัจจุบัน (อัปเดตล่าสุด)
- Migrations: apply แล้วทั้งหมด (`0001_init`, `20260817085752_grant_role_functions`)
- Storage bucket `worker-documents`: สร้างแล้ว (public)
- Edge Functions: `ocr-document`, `create-user`, `line-webhook` — deploy แล้วทั้ง 3 ตัว และสถานะ ACTIVE
- `index.html` ชี้ `window.SUPABASE_URL` / `window.SUPABASE_ANON_KEY` ไปที่โปรเจกต์จริง (`cagpzvrqtjkuabhqaqon`) แล้ว
- Auth user แรก + แถวใน `profiles` (role `admin`, ชื่อ "Admin") ผูกกันเรียบร้อย — ล็อกอินได้แล้ว
- ตาราง `customers`/`workers`/`jobs`/`banks`/`line_groups` ยังว่างโดยตั้งใจ (เลือกเริ่มข้อมูลใหม่ทั้งหมด ไม่ย้ายของเก่าจาก Google Sheets)
- หน้าตั้งค่า/ทดสอบการเชื่อมต่อ Google Sheets แบบเดิม (`testGoogleSheetsConnection`, ปุ่มกรอก Web App URL) — โค้ดและ UI ที่อ้างอิงระบบเดิมถูกลบออกทั้งหมดแล้ว (ดู CLAUDE.md)

## สิ่งที่ยังไม่ได้ทำ (รอคำสั่งถัดไป)
- ยังไม่ได้ยืนยันว่า GitHub Pages deploy จาก branch ไหนแน่ชัด (repo ตั้ง remote ไว้ที่ `origin/supabase-migration` แต่หน้าเว็บที่ deploy จริงดูเหมือนมีโค้ด Supabase อยู่แล้ว — ควรเช็คใน repo Settings → Pages ให้ชัวร์)
- Secrets ของ Edge Functions (`GEMINI_API_KEY`, `ADMIN_PIN`) — ยังไม่ยืนยันว่าตั้งค่าจริงหรือยัง ควรเช็คใน Supabase Dashboard → Edge Functions → Secrets
