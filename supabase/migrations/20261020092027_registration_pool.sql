-- ฐานข้อมูลรอขึ้นทะเบียน (owner 2026-10-20): เก็บคนงานที่ยังไม่มีเอกสารสะสมทั้งปี พอรัฐเปิดรับ สร้างรอบ มติ ครม. แล้วเลือกคนเข้ารอบ
-- คนงานในฐานข้อมูล = workers.status 'pending_register' ที่ยังไม่มีวันหมดอายุใบอนุญาต; registration_round_id = อยู่ในรอบไหน
-- นายจ้างส่งรายชื่อเองจากพอร์ทัลได้ (RPC client_save_pending_worker — ลูกค้าเขียนตาราง workers ตรงไม่ได้)

create table if not exists registration_rounds (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  open_from   date,
  open_to     date,
  status      text not null default 'open' check (status in ('open', 'closed')),
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid() references auth.users(id) on delete set null
);
alter table registration_rounds enable row level security;
drop policy if exists registration_rounds_select on registration_rounds;
drop policy if exists registration_rounds_insert on registration_rounds;
drop policy if exists registration_rounds_update on registration_rounds;
drop policy if exists registration_rounds_delete on registration_rounds;
create policy registration_rounds_select on registration_rounds for select using (is_internal() or my_role() = 'client');
create policy registration_rounds_insert on registration_rounds for insert with check (can_ops());
create policy registration_rounds_update on registration_rounds for update using (can_ops()) with check (can_ops());
create policy registration_rounds_delete on registration_rounds for delete using (my_role() = 'admin');

alter table workers add column if not exists registration_round_id uuid references registration_rounds(id) on delete set null;
alter table workers add column if not exists submitted_by_client boolean not null default false;

-- นายจ้างเพิ่ม/แก้คนงานรอขึ้นทะเบียนของตัวเอง — แก้ได้เฉพาะคนที่ยังรอเข้ารอบ (ยังไม่มีรอบ)
-- p = { id, first_name, last_name, nationality, dob (YYYY-MM-DD), gender, photo, attachments (object) }
create or replace function client_save_pending_worker(p jsonb)
returns workers language plpgsql security definer set search_path = public as $$
declare
  v_cust text := my_customer_id();
  w workers%rowtype;
begin
  if my_role() is distinct from 'client' or v_cust is null then
    raise exception 'เฉพาะบัญชีนายจ้างเท่านั้น';
  end if;
  if coalesce(trim(p->>'first_name'), '') = '' then raise exception 'กรุณากรอกชื่อคนงาน'; end if;
  if p ? 'attachments' and jsonb_typeof(p->'attachments') <> 'object' then raise exception 'ข้อมูลไฟล์ไม่ถูกต้อง'; end if;
  select * into w from workers where id = p->>'id';
  if found then
    if w.employer_id is distinct from v_cust or w.status <> 'pending_register' or w.registration_round_id is not null then
      raise exception 'แก้ไขไม่ได้ — คนงานนี้เข้ารอบขึ้นทะเบียนแล้ว หรือไม่ใช่คนงานของบริษัทคุณ';
    end if;
    update workers set
      first_name = trim(p->>'first_name'), last_name = nullif(trim(coalesce(p->>'last_name', '')), ''),
      nationality = coalesce(nullif(p->>'nationality', ''), nationality), dob = nullif(p->>'dob', '')::date,
      gender = coalesce(nullif(p->>'gender', ''), gender), photo = coalesce(nullif(p->>'photo', ''), photo),
      attachments = coalesce(p->'attachments', attachments)
    where id = w.id returning * into w;
  else
    if coalesce(p->>'id', '') !~ '^work-[0-9a-z]+$' then raise exception 'รหัสคนงานไม่ถูกต้อง'; end if;
    insert into workers (id, employer_id, first_name, last_name, nationality, dob, gender, photo, attachments, status,
                         skip_notify_entry, submitted_by_client, created_at)
      values (p->>'id', v_cust, trim(p->>'first_name'), nullif(trim(coalesce(p->>'last_name', '')), ''),
              coalesce(nullif(p->>'nationality', ''), 'Myanmar'), nullif(p->>'dob', '')::date, nullif(p->>'gender', ''),
              nullif(p->>'photo', ''), coalesce(p->'attachments', '{}'::jsonb), 'pending_register', false, true, now())
      returning * into w;
  end if;
  return w;
end $$;

revoke all on function client_save_pending_worker(jsonb) from public, anon;
grant execute on function client_save_pending_worker(jsonb) to authenticated;
