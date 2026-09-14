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
- Edge Functions ที่ deploy แล้วและสถานะ ACTIVE ทั้งหมด 6 ตัว: `ocr-document`, `create-user`, `delete-user`, `share-worker-docs`, `share-customer-docs` (มีซอร์สอยู่ใน `supabase/functions/`) และ `line-webhook` (ไม่มีซอร์สในนี้ ดึงมาด้วย `supabase functions download line-webhook` ก่อนแก้ไข — ดู CLAUDE.md)
- Secrets ของ Edge Functions ยืนยันแล้ว (2026-09-14): `ADMIN_PIN`, `GEMINI_API_KEY` ตั้งค่าอยู่บน Supabase project จริง (เช็คด้วย `supabase secrets list`)
- `index.html` ชี้ `window.SUPABASE_URL` / `window.SUPABASE_ANON_KEY` ไปที่โปรเจกต์จริง (`cagpzvrqtjkuabhqaqon`) แล้ว
- Auth user แรก + แถวใน `profiles` (role `admin`, ชื่อ "Admin") ผูกกันเรียบร้อย — ล็อกอินได้แล้ว
- ตาราง `customers`/`workers`/`jobs`/`banks`/`line_groups` ยังว่างโดยตั้งใจ (เลือกเริ่มข้อมูลใหม่ทั้งหมด ไม่ย้ายของเก่าจาก Google Sheets)
- หน้าตั้งค่า/ทดสอบการเชื่อมต่อ Google Sheets แบบเดิม (`testGoogleSheetsConnection`, ปุ่มกรอก Web App URL) — โค้ดและ UI ที่อ้างอิงระบบเดิมถูกลบออกทั้งหมดแล้ว (ดู CLAUDE.md)

## GitHub Pages (ยืนยันแล้ว — 2026-09-14)
- Source: branch `supabase-migration`, path `/` (legacy build, ไม่ใช้ GitHub Actions)
- ทุก push ขึ้น `origin/supabase-migration` จะ trigger build อัตโนมัติ ปกติเสร็จภายใน ~20 วินาที
- URL: https://paleklabour.github.io/WorkerOS/
- เช็คสถานะ build ล่าสุด: `gh api repos/paleklabour/WorkerOS/pages/builds/latest`

## สิ่งที่ยังไม่ได้ทำ (รอคำสั่งถัดไป)
- (ว่าง — รายการที่เคยค้างไว้ทั้งหมดยืนยันแล้วเมื่อ 2026-09-14 ดูหัวข้อด้านบน)
