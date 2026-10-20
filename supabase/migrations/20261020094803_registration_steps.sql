-- งานขึ้นทะเบียน ช่วงที่ 2 (owner 2026-10-20, แบบที่ 4): ใช้ตาราง renewals ร่วมกับงานต่ออายุ แยกด้วย kind
-- kind 'registration' = รอบขึ้นทะเบียนของคนงาน 1 คน (สร้างตอนใส่คนเข้ารอบ มติ ครม.), registration_round_id = รอบไหน
-- ใบงานเก็บเงินเบื้องหลังใช้ batch_id 'register-<id>' (งานต่ออายุใช้ 'renewal-<id>') — แท็บแยกในหน้าออกบิล

alter table renewals add column if not exists kind text not null default 'renewal';
alter table renewals drop constraint if exists renewals_kind_check;
alter table renewals add constraint renewals_kind_check check (kind in ('renewal', 'registration'));
alter table renewals add column if not exists registration_round_id uuid references registration_rounds(id) on delete set null;
create index if not exists renewals_kind_idx on renewals (kind, status);

-- ราคามาตรฐานของรายการใหม่ (ตั้งราคาจริงในหน้าราคามาตรฐาน)
insert into service_prices (job_type, gov_fee, service_fee, updated_at, cost_items)
values ('ตี visa', 0, 0, now(), '[]'::jsonb)
on conflict (job_type) do nothing;
