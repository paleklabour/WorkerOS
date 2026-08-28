-- ============================================================================
-- Jobs workflow rework: แยก "ปิดงาน" (operational) ออกจาก "ออกบิล/ชำระเงิน" (การเงิน)
-- ให้เป็นคนละเรื่องกัน แต่งานเดิมยัง overload สถานะทั้งสองแบบไว้ในคอลัมน์ status เดียว
-- (เช่น 'เสร็จสิ้น/รอออกบิล', 'ออกบิลแล้ว', 'ชำระเงินแล้ว (เงินสด)') — ไฟล์นี้แยกออกมาเป็น
-- payment_status/payment_method อิสระ และเปลี่ยน 'เสร็จสิ้น' เดิมเป็น 'ปิดงานแล้ว' ที่ตั้งได้
-- เฉพาะผ่านการแนบเอกสารปิดงาน (ดู closed_at/closed_by/attachments) ไม่ใช่ลากเข้า Kanban เฉยๆ
--
-- เพิ่มด้วย: agents (รายชื่อ "ผู้ส่งงาน" แบบเพิ่มทีหลังได้) และ jobs.opened_by
-- (ผู้เปิดงาน ล็อกจาก user ที่ login ตอนสร้างงาน แก้ไขไม่ได้ภายหลัง)
-- ============================================================================

-- ============================================================================
-- 1. AGENTS (ผู้ส่งงาน — master list เพิ่มทีหลังได้)
-- ============================================================================
create table if not exists agents (
  id         text primary key,                 -- agent-xxxx เหมือน pattern id ตารางอื่น (client-generated)
  name       text not null,
  created_at timestamptz default now()
);

alter table agents enable row level security;

create policy "agents_select" on agents for select using (auth.uid() is not null);
create policy "agents_write" on agents for insert with check (my_role() in ('admin','manager'));
create policy "agents_update" on agents for update using (my_role() in ('admin','manager'));
create policy "agents_delete" on agents for delete using (my_role() = 'admin');

-- ============================================================================
-- 2. JOBS: เพิ่มคอลัมน์ผู้เปิดงาน / agent / สถานะการเงินแยก / ปิดงาน
-- ============================================================================
alter table jobs add column if not exists opened_by     uuid references profiles(id) on delete set null;
alter table jobs add column if not exists agent_id      text references agents(id) on delete set null;
alter table jobs add column if not exists payment_status text not null default 'ยังไม่ออกบิล'
  check (payment_status in ('ยังไม่ออกบิล','ออกบิลแล้ว','ชำระเงินแล้ว'));
alter table jobs add column if not exists payment_method text;
alter table jobs add column if not exists attachments   jsonb not null default '[]'::jsonb;
alter table jobs add column if not exists closed_at     timestamptz;
alter table jobs add column if not exists closed_by     uuid references profiles(id) on delete set null;

create index if not exists idx_jobs_opened_by on jobs(opened_by);
create index if not exists idx_jobs_agent on jobs(agent_id);

-- ---- Backfill: แตกสถานะเดิมที่ overload การเงินไว้ใน status ออกเป็นคอลัมน์ใหม่ ----
-- 'ชำระเงินแล้ว (เงินสด)' ฯลฯ -> payment_status='ชำระเงินแล้ว', payment_method='เงินสด', status='ปิดงานแล้ว'
update jobs
   set payment_method = nullif(trim(both from substring(status from '\(([^)]+)\)')), ''),
       payment_status = 'ชำระเงินแล้ว',
       status = 'ปิดงานแล้ว',
       closed_at = coalesce(closed_at, updated_at)
 where status like 'ชำระเงินแล้ว%';

update jobs
   set payment_status = 'ออกบิลแล้ว',
       status = 'ปิดงานแล้ว',
       closed_at = coalesce(closed_at, updated_at)
 where status = 'ออกบิลแล้ว';

update jobs
   set status = 'ปิดงานแล้ว',
       closed_at = coalesce(closed_at, updated_at)
 where status in ('เสร็จสิ้น/รอออกบิล', 'เสร็จสิ้น');
