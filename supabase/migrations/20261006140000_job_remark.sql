-- หมายเหตุสั้นต่อใบงาน (2026-10-06) — แทนคอลัมน์ "อีเมลคนงาน" ในตารางระบบจัดการแจ้งงาน (อีเมลย้ายไปอยู่ใต้ชื่อคนงาน)
-- พิมพ์ได้ไม่เกิน 20 ตัวอักษร แยกจาก jobs.notes (รายละเอียดยาวในฟอร์มใบงาน) — ดู saveJobRemark ใน app.js
alter table public.jobs add column if not exists remark text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'jobs_remark_len_check' and conrelid = 'public.jobs'::regclass) then
    alter table public.jobs add constraint jobs_remark_len_check check (remark is null or char_length(remark) <= 20);
  end if;
end $$;
