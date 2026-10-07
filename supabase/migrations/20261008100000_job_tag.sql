-- ป้ายใบงาน (2026-10-08): dropdown ใต้ช่องหมายเหตุในตารางระบบจัดการแจ้งงาน — 1 ใบงานเลือกได้ 1 ป้าย
-- jobs.tag = id ของป้าย; รายการป้าย (ชื่อ + สี) เก็บใน app_settings key 'job_tags' ใช้ร่วมกันทุกคน
-- เพิ่ม/เปลี่ยนชื่อ/เปลี่ยนสีป้ายได้ทั้งฝ่ายปฏิบัติการ (admin/operation_manager/staff) — ดู JOB_TAG_* ใน app.js
alter table public.jobs add column if not exists tag text;

-- app_settings เดิมเขียนได้เฉพาะฝ่ายการเงิน (can_finance) → เปิดเฉพาะ key 'job_tags' ให้ฝ่ายปฏิบัติการด้วย
drop policy if exists app_settings_insert_job_tags on app_settings;
create policy app_settings_insert_job_tags on app_settings for insert with check (key = 'job_tags' and can_ops());
drop policy if exists app_settings_update_job_tags on app_settings;
create policy app_settings_update_job_tags on app_settings for update using (key = 'job_tags' and can_ops()) with check (key = 'job_tags' and can_ops());
