# Legacy — Google Apps Script backend

โค้ดในโฟลเดอร์นี้คือ backend ระบบเดิมที่ใช้ **Google Sheets + Google Apps Script**
ก่อนย้ายไป Supabase (ดู `../DEPLOY_SUPABASE.md`)

- `Code.gs` — ต้นฉบับ backend เดิม (doGet/doPost, อ่าน/เขียน Google Sheets, Drive, LINE webhook, Gemini OCR)
- `apps-script/` — ไฟล์ที่ generate จาก `bundle-gas.ps1` สำหรับวางใน Apps Script Editor โดยตรง
- `bundle-gas.ps1` — สคริปต์รวมไฟล์หน้าบ้าน (root) เข้ากับ `Code.gs` สำหรับ deploy ขึ้น Apps Script
- `SETUP_INSTRUCTIONS.md` — คู่มือติดตั้งระบบเดิมบน Google Sheets/Drive/LINE OA

## สถานะ

**ยัง live อยู่จริง** — URL ใน `../README.md` ยังคงชี้มาที่ deployment ของโค้ดชุดนี้
(ไม่ใช่โค้ดหน้าบ้านเวอร์ชันล่าสุดที่ root ซึ่งต่อกับ Supabase ไปแล้ว) อย่าลบทิ้งจนกว่า
การย้ายไป Supabase จะ verify เสร็จและตัด deployment เดิมเรียบร้อย

**ห้ามพัฒนาฟีเจอร์ใหม่ในโฟลเดอร์นี้อีก** — ฟีเจอร์ใหม่ทั้งหมดไปที่โค้ดหน้าบ้าน root
(`../app.js`, `../index.html`, `../styles.css`) และ backend ใหม่ที่ `../supabase/`
