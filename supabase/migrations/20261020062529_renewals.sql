-- งานต่ออายุใบอนุญาตทำงาน (owner, 2026-10-20) — แยกจากใบงานในระบบแจ้งงาน
-- 1 แถว = 1 รอบต่ออายุของคนงาน 1 คน; เจ้าหน้าที่กด "เริ่มต่ออายุ" เอง (ไม่สร้างอัตโนมัติ)
-- ขั้นตอนตายตัว: ตรวจสุขภาพ (ติ๊ก) → ใบคำขอ → ใบเสร็จ → ใบแทนใบอนุญาตทำงาน → ใบนัดหมาย (กรอกวันนัด) → Smart card
-- + ทำเล่ม (พาสปอร์ต/CI) เฉพาะคนที่เล่มใกล้หมด (with_book)
-- steps = { medical|application|receipt|replacement|appointment|card|book: { at: 'YYYY-MM-DD', by: uuid, url?, name? } }
--   ไฟล์ตัวจริงเก็บในแฟ้มคนงาน (workers.attachments) ตามช่องเดิม — ที่นี่เก็บแค่ลิงก์ไว้อ้างอิงว่าขั้นนี้ใช้ไฟล์ไหน

create table if not exists renewals (
  id                uuid primary key default gen_random_uuid(),
  worker_id         text not null references workers(id) on delete cascade,
  customer_id       text references customers(id) on delete set null,
  old_permit_expiry date,
  status            text not null default 'active' check (status in ('active', 'done', 'cancelled')),
  with_book         boolean not null default false,
  steps             jsonb not null default '{}'::jsonb,
  appointment_date  date,
  new_permit_expiry date,
  note              text,
  started_at        timestamptz not null default now(),
  started_by        uuid default auth.uid() references auth.users(id) on delete set null,
  done_at           timestamptz,
  updated_at        timestamptz not null default now(),
  updated_by        uuid default auth.uid() references auth.users(id) on delete set null
);

-- คนงาน 1 คนมีรอบที่กำลังทำได้ทีละ 1 รอบ
create unique index if not exists renewals_one_active_per_worker on renewals (worker_id) where status = 'active';
create index if not exists renewals_status_idx on renewals (status, appointment_date);

create or replace function renewals_touch() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.started_at := old.started_at;
  new.started_by := old.started_by;
  return new;
end $$;

drop trigger if exists renewals_touch on renewals;
create trigger renewals_touch before update on renewals
  for each row execute function renewals_touch();

alter table renewals enable row level security;

-- ผู้ใช้ภายในทุกตำแหน่งเห็น (บัญชีเห็นเพื่อออกบิล) — เริ่ม/แก้/ยกเลิกได้เฉพาะฝ่ายปฏิบัติการ (can_ops)
drop policy if exists renewals_select on renewals;
drop policy if exists renewals_insert on renewals;
drop policy if exists renewals_update on renewals;
drop policy if exists renewals_delete on renewals;
create policy renewals_select on renewals for select using (is_internal());
create policy renewals_insert on renewals for insert with check (can_ops());
create policy renewals_update on renewals for update using (can_ops()) with check (can_ops());
create policy renewals_delete on renewals for delete using (my_role() = 'admin');
