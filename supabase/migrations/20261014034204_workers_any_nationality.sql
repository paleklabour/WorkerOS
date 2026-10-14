-- ฟอร์มคนงานมีตัวเลือก "เวียดนาม" และ "อื่นๆ (ระบุสัญชาติเอง)" แต่ check เดิมรับแค่ Myanmar/Laos/Cambodia
-- ทำให้บันทึกคนงานสัญชาติอื่น (เช่น จีน) ไม่ผ่าน — เปิดให้ใส่สัญชาติใดก็ได้ ขอแค่ไม่ว่าง (เจ้าของระบบ 2026-10-14)
alter table public.workers drop constraint if exists workers_nationality_check;
alter table public.workers add constraint workers_nationality_check
  check (nationality is null or btrim(nationality) <> '');
