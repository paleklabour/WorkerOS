-- Note วางบิลแบบส่วนตัว (owner 2026-10-27): แต่ละบัญชีมี Note ของตัวเองต่อนายจ้าง — เห็น/แก้ได้เฉพาะคนเขียน
-- แทน customers.billing_note (Note เดียวที่ทุกคนเห็น — ตอนเปลี่ยนยังไม่มีนายจ้างรายไหนมี Note จึงไม่ต้องย้ายข้อมูล)
-- เขียนได้เฉพาะฝ่ายการเงิน / ฝ่ายปฏิบัติการ (เหมือนสิทธิ์ Note เดิม) และเฉพาะแถวของตัวเอง

create table if not exists billing_notes (
  customer_id text not null references customers(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  note text not null check (char_length(note) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (customer_id, user_id)
);

alter table billing_notes enable row level security;
drop policy if exists billing_notes_select on billing_notes;
create policy billing_notes_select on billing_notes for select using (user_id = auth.uid());
drop policy if exists billing_notes_insert on billing_notes;
create policy billing_notes_insert on billing_notes for insert with check (user_id = auth.uid() and (can_finance() or can_ops()));
drop policy if exists billing_notes_update on billing_notes;
create policy billing_notes_update on billing_notes for update using (user_id = auth.uid()) with check (user_id = auth.uid() and (can_finance() or can_ops()));
drop policy if exists billing_notes_delete on billing_notes;
create policy billing_notes_delete on billing_notes for delete using (user_id = auth.uid());
