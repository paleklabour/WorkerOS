alter table public.customers
  add column if not exists share_token text unique;

comment on column public.customers.share_token is
  'สุ่มขึ้นตอนพนักงานกด "สร้างลิงก์แชร์ทั้งโฟลเดอร์" — ใช้เข้าถึงเอกสารของนายจ้าง/ลูกค้ารายนี้แบบไม่ต้องล็อกอิน (ผ่าน edge function share-customer-docs) จนกว่าจะถูกยกเลิก (set กลับเป็น null) — คู่เดียวกับ workers.share_token';
