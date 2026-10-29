-- หมายเหตุใบงาน (ตารางระบบจัดการแจ้งงาน): ขยายจาก 20 เป็น 100 ตัวอักษร (เจ้าของระบบขอ 2026-10-29)
alter table public.jobs drop constraint if exists jobs_remark_len_check;
alter table public.jobs add constraint jobs_remark_len_check check (remark is null or char_length(remark) <= 100);
