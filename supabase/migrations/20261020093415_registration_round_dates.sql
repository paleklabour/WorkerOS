-- รอบ มติ ครม. ใส่แค่ วันประกาศ + วันใบอนุญาตหมด (owner 2026-10-20) — ชื่อรอบตั้งจากวันประกาศในแอป, ไม่เลือกคนตอนสร้างรอบ
-- (ใส่คนเข้ารอบทีหลังจากหน้ารอขึ้นทะเบียน) · พอร์ทัล: นายจ้างใส่คำนำหน้านามได้ (เพศตามคำนำหน้า)

alter table registration_rounds add column if not exists announced_on date;
alter table registration_rounds add column if not exists permit_expiry date;

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
      title = nullif(p->>'title', ''), gender = nullif(p->>'gender', ''),
      photo = coalesce(nullif(p->>'photo', ''), photo), attachments = coalesce(p->'attachments', attachments)
    where id = w.id returning * into w;
  else
    if coalesce(p->>'id', '') !~ '^work-[0-9a-z]+$' then raise exception 'รหัสคนงานไม่ถูกต้อง'; end if;
    insert into workers (id, employer_id, first_name, last_name, nationality, dob, title, gender, photo, attachments, status,
                         skip_notify_entry, submitted_by_client, created_at)
      values (p->>'id', v_cust, trim(p->>'first_name'), nullif(trim(coalesce(p->>'last_name', '')), ''),
              coalesce(nullif(p->>'nationality', ''), 'Myanmar'), nullif(p->>'dob', '')::date, nullif(p->>'title', ''),
              nullif(p->>'gender', ''), nullif(p->>'photo', ''), coalesce(p->'attachments', '{}'::jsonb), 'pending_register',
              false, true, now())
      returning * into w;
  end if;
  return w;
end $$;
