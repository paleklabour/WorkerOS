-- โน้ตปฏิทินส่วนตัวของผู้ใช้ (owner, 2026-10-13): วันละ 1 โน้ต ไม่เกิน 200 ตัวอักษร
-- เห็น/แก้ได้เฉพาะเจ้าของโน้ต และเฉพาะผู้ใช้ภายใน (ไม่ใช่บัญชีนายจ้าง/client)
create table if not exists calendar_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  note_date date not null,
  note text not null check (char_length(note) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, note_date)
);

alter table calendar_notes enable row level security;

create policy calendar_notes_own_select on calendar_notes for select
  using (user_id = auth.uid() and is_internal());
create policy calendar_notes_own_insert on calendar_notes for insert
  with check (user_id = auth.uid() and is_internal());
create policy calendar_notes_own_update on calendar_notes for update
  using (user_id = auth.uid() and is_internal())
  with check (user_id = auth.uid() and is_internal());
create policy calendar_notes_own_delete on calendar_notes for delete
  using (user_id = auth.uid() and is_internal());

grant select, insert, update, delete on calendar_notes to authenticated;
