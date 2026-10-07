-- ลิงก์ใบวางบิลให้ลูกค้าเปิดดูในเบราว์เซอร์ได้โดยไม่ต้องล็อกอิน (2026-10-08)
-- share_token แบบสุ่มต่อบิล — สร้าง/ยกเลิกจากปุ่มในหน้าใบวางบิล (ยกเลิก = ตั้งเป็น null แล้วลิงก์เดิมเปิดไม่ได้)
-- หน้า invoice.html เรียก Edge Function share-invoice ซึ่งตรวจ token แล้วส่งเฉพาะข้อมูลที่พิมพ์บนบิล (ไม่มีค่าธรรมเนียมรัฐภายใน)
alter table public.invoices add column if not exists share_token text;
create unique index if not exists invoices_share_token_key on public.invoices (share_token) where share_token is not null;
