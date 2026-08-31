-- ============================================================================
-- ส่วนที่ 1.3: ข้อมูลบัตรชมพู / เลขประกัน (Pink Card / Insurance Info)
-- ============================================================================
alter table workers add column if not exists pink_card_no text;   -- เลขที่บัตรชมพู 13 หลัก
alter table workers add column if not exists thai_name text;      -- ชื่อภาษาไทย (ตามที่ปรากฏในบัตรชมพู)
alter table workers add column if not exists insurance_no text;   -- เลขประกันสุขภาพ
