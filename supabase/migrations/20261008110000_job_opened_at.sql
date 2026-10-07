-- เวลาเปิดงานจริง (2026-10-08): jobs.created_at เก็บแค่วันที่ (เลขที่ใบงานอิงวันนี้) ใบงานวันเดียวกันจึงเรียงด้วยเลขท้าย id
-- ซึ่งมาจากเวลา ms 6 หลักท้ายและวนกลับทุก ~17 นาที → ใบงานที่เปิดทีหลังไปอยู่ใต้ใบที่เปิดก่อน
-- opened_at = เวลาเปิดงานจริง ใช้เรียง "งานใหม่ล่าสุดอยู่บนสุด" (ใบงานเก่าเป็น null — เรียงตามเดิม)
alter table public.jobs add column if not exists opened_at timestamptz;
alter table public.jobs alter column opened_at set default now();
