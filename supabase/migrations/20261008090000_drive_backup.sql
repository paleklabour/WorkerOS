-- สำรองไฟล์/ข้อมูลลง Google Drive อัตโนมัติ (เจ้าของระบบเลือก 2026-10-08: Gmail ส่วนตัว, อัตโนมัติ,
-- ไฟล์ที่ลบในระบบ → ย้ายไปโฟลเดอร์ "ถูกลบ", แชร์โฟลเดอร์นายจ้างให้ลูกค้าได้)
-- Supabase ยังเป็นที่เก็บหลักที่เดียว — Drive เป็นสำเนาทางเดียว ทำโดย Edge Function "drive-backup"
-- (เรียกจาก pg_cron ทุกชั่วโมง, ทำต่อจากรอบก่อนเรื่อย ๆ จนครบ — ดู supabase/functions/drive-backup/index.ts)

-- โฟลเดอร์ใน Drive ที่สร้างแล้ว: key = ตัวตนในระบบ (เช่น customer:<id>, worker:<id>, finance:receipts:2026-10)
-- ผูกด้วย key ไม่ใช่ชื่อ → เปลี่ยนชื่อนายจ้าง/คนงานในระบบ ฟังก์ชันเปลี่ยนชื่อโฟลเดอร์ใน Drive ตาม
create table if not exists drive_backup_folders (
  key text primary key,
  drive_id text not null,
  name text not null,
  parent_key text,
  shared_email text,          -- อีเมลลูกค้าที่แชร์โฟลเดอร์นายจ้างนี้ให้แล้ว (เฉพาะ customer:<id>)
  shared_permission_id text,
  updated_at timestamptz not null default now()
);

-- ไฟล์ใน Drive ที่สำรองแล้ว: source_key = path ไฟล์ใน Storage (หรือ data:YYYY-MM-DD สำหรับไฟล์ข้อมูลรายวัน)
create table if not exists drive_backup_files (
  source_key text primary key,
  drive_id text not null,
  parent_key text not null,
  name text not null,
  deleted boolean not null default false, -- ไฟล์ถูกลบในระบบแล้ว → ย้ายไปโฟลเดอร์ "ถูกลบ" ใน Drive
  updated_at timestamptz not null default now()
);

-- บันทึกการทำงานแต่ละรอบ (แสดงในหน้าสำรองข้อมูลให้ Admin ดู)
create table if not exists drive_backup_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text,               -- cron | manual
  uploaded int not null default 0,
  updated int not null default 0,
  moved_to_deleted int not null default 0,
  remaining int not null default 0, -- ยังเหลือไฟล์ที่ต้องสำรอง (หมดเวลารอบนี้ ทำต่อรอบหน้า)
  error text
);

alter table drive_backup_folders enable row level security;
alter table drive_backup_files enable row level security;
alter table drive_backup_runs enable row level security;
-- อ่านได้เฉพาะ Admin (เขียนโดย Edge Function ด้วย service role เท่านั้น)
create policy drive_backup_folders_admin_read on drive_backup_folders for select using (my_role() = 'admin');
create policy drive_backup_files_admin_read on drive_backup_files for select using (my_role() = 'admin');
create policy drive_backup_runs_admin_read on drive_backup_runs for select using (my_role() = 'admin');

-- แชร์โฟลเดอร์ Drive ของนายจ้างให้ลูกค้า (อ่านอย่างเดียว) — เปิดทีละราย ใช้อีเมลใน customers.email
alter table customers add column if not exists drive_share boolean not null default false;

