-- ============================================================================
-- เพิ่มข้อมูล "ใบนัดหมาย" (Appointment Form จาก eworkpermit) ให้แนบเข้ากับใบงานได้
-- ช่องแนบไฟล์เดียว + AI (Gemini, ผ่าน ocr-document) อ่านแล้วกรอกวันที่/เวลา/เลขที่นัดหมาย/
-- สถานที่ให้อัตโนมัติ — ดู supabase/functions/ocr-document (docType: "job-appointment")
-- ============================================================================
alter table jobs add column if not exists appointment_date     date;
alter table jobs add column if not exists appointment_time     text;
alter table jobs add column if not exists appointment_no       text;
alter table jobs add column if not exists appointment_location text;
alter table jobs add column if not exists appointment_doc_url  text;
