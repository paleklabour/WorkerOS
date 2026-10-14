-- ปฏิทินทีม (owner, 2026-10-14): เปลี่ยนจากโน้ตส่วนตัววันละ 1 รายการ เป็นโน้ตที่ผู้ใช้ภายในทุกคนเห็น/แก้ร่วมกัน
-- จดได้หลายรายการต่อวัน และใส่เวลาได้ (note_time ว่าง = ทั้งวัน) — ตอนเปลี่ยนตารางนี้ยังไม่มีโน้ตเลย (0 แถว)
-- user_id = คนที่จดคนแรก, updated_by = คนที่แก้ล่าสุด (ตั้งโดย trigger)

alter table calendar_notes drop constraint if exists calendar_notes_user_id_note_date_key;
alter table calendar_notes add column if not exists note_time time;
alter table calendar_notes add column if not exists updated_by uuid default auth.uid() references auth.users(id) on delete set null;

-- ลบบัญชีผู้จดแล้วโน้ตของทีมต้องยังอยู่
alter table calendar_notes alter column user_id drop not null;
alter table calendar_notes drop constraint if exists calendar_notes_user_id_fkey;
alter table calendar_notes add constraint calendar_notes_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

create index if not exists calendar_notes_date_idx on calendar_notes (note_date, note_time);

create or replace function calendar_notes_touch() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.user_id := old.user_id; -- ผู้จดคนแรกเปลี่ยนไม่ได้
  return new;
end $$;

drop trigger if exists calendar_notes_touch on calendar_notes;
create trigger calendar_notes_touch before update on calendar_notes
  for each row execute function calendar_notes_touch();

drop policy if exists calendar_notes_own_select on calendar_notes;
drop policy if exists calendar_notes_own_insert on calendar_notes;
drop policy if exists calendar_notes_own_update on calendar_notes;
drop policy if exists calendar_notes_own_delete on calendar_notes;

create policy calendar_notes_team_select on calendar_notes for select
  using (is_internal());
create policy calendar_notes_team_insert on calendar_notes for insert
  with check (user_id = auth.uid() and is_internal());
create policy calendar_notes_team_update on calendar_notes for update
  using (is_internal())
  with check (is_internal());
create policy calendar_notes_team_delete on calendar_notes for delete
  using (is_internal());
