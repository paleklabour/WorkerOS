alter table public.workers
  add column if not exists share_token text unique;

comment on column public.workers.share_token is
  'สุ่มขึ้นตอนพนักงานกด "สร้างลิงก์แชร์ทั้งโฟลเดอร์" — ใช้เข้าถึงเอกสารของคนงานคนนี้แบบไม่ต้องล็อกอิน (ผ่าน edge function share-worker-docs) จนกว่าจะถูกยกเลิก (set กลับเป็น null)';
