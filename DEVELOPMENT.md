# Development workflow

## โครงสร้างโปรเจกต์

```
index.html, app.js, styles.css, supabase-client.js   ← หน้าบ้าน (แก้ตรงนี้)
supabase/migrations/                                  ← schema Postgres แบบ versioned
supabase/functions/                                    ← Edge Functions (create-user, ocr-document)
legacy/                                                 ← backend เดิมบน Google Apps Script (อ่าน legacy/README.md)
server.ps1                                              ← dev server ในเครื่อง (http://localhost:3000)
```

ไม่มี build step / ไม่มี npm — เปิด `server.ps1` แล้วแก้ไฟล์ + รีเฟรชเบราว์เซอร์ได้เลย

## Branch & commit

โปรเจกต์เดี่ยว ไม่ต้องวางกระบวนการหนักเกินความจำเป็น:

- `main` = โค้ดที่ deploy ได้เสมอ (GitHub Pages ดึงจากนี่โดยตรง)
- งานเล็ก/แก้บั๊ก → commit ตรงที่ `main` ได้เลย
- งานเสี่ยง/เปลี่ยน schema/ฟีเจอร์ใหญ่ (เช่นช่วงย้ายข้อมูลไป Supabase) → แยก branch
  (เช่น `supabase-migration`) แล้วค่อย merge กลับ `main` ตอน verify แล้วว่าใช้งานได้จริง
- commit message สั้น ตรงประเด็น อธิบาย "ทำไม" มากกว่า "ทำอะไร"

## เปลี่ยนโครงสร้างฐานข้อมูล (schema)

ห้ามแก้ schema ตรงบน Supabase Dashboard SQL Editor เฉย ๆ แล้วลืม — ให้เพิ่มไฟล์ migration ใหม่เสมอ
เพื่อให้ schema ทั้งหมดอยู่ใน git และ apply ซ้ำได้:

```powershell
supabase migration new ชื่อการเปลี่ยนแปลง   # สร้างไฟล์เปล่าใน supabase/migrations/
# แก้ SQL ในไฟล์ที่ได้
supabase db push                             # apply ขึ้นโปรเจกต์จริง
```

## Deploy

- **หน้าเว็บ** → GitHub Pages, deploy อัตโนมัติทุกครั้งที่ push เข้า `main`
  (ตั้งค่าใน repo Settings → Pages → Source: Deploy from branch → `main` / `/ (root)`)
- **Database/Auth/Storage/Edge Functions** → Supabase project `cagpzvrqtjkuabhqaqon`
  ผ่าน `supabase db push` (schema) และ `supabase functions deploy <ชื่อ>` (edge functions)
- **ระบบเดิม (Google Apps Script)** → ดู `legacy/README.md` — ยังไม่ตัด จนกว่าจะ verify Supabase เสร็จ

## สิ่งที่ตั้งใจไม่ทำ (ตัดขาดจากแนวทาง Antigravity เดิม)

- ไม่ผูก path กับโฟลเดอร์ scratch ในเครื่องใดเครื่องหนึ่ง (`server.ps1` ใช้ `$PSScriptRoot` เสมอ)
- ไม่เพิ่ม framework/build tool โดยไม่จำเป็น — เว็บนี้เป็น vanilla JS ตั้งใจให้เบาและ deploy ง่าย
- ไม่มี "ระบบสำรอง Google Sheets" คู่ขนานอีกต่อไปหลังย้ายเสร็จ (ของเดิมเป็น dead code ดู `CLAUDE.md`)
