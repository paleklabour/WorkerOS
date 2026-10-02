-- โน้ตจากนายจ้าง (บัญชี Client) ต่อคนงาน 1 คน — ข้อความเดียว นายจ้างแก้ทับได้ (ยืนยันกับเจ้าของระบบ 2026-10-02)
-- บัญชี Client แก้ตาราง workers ตรง ๆ ไม่ได้ (RLS) จึงให้เรียก set_my_worker_note() ซึ่งแก้ได้เฉพาะ 2 คอลัมน์นี้
-- และเฉพาะคนงานที่ employer_id ตรงกับ profiles.customer_id ของบัญชีตัวเองเท่านั้น
-- เจ้าหน้าที่อ่านได้ (อยู่ใน select * ของ workers) แต่ฟอร์มคนงานไม่เขียนทับ (client_note ไม่อยู่ใน WORKER_MAP)
alter table workers add column if not exists client_note text;
alter table workers add column if not exists client_note_updated_at timestamptz;

create or replace function set_my_worker_note(p_worker_id text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_customer text;
begin
  select customer_id into v_customer from profiles where id = auth.uid() and role = 'client';
  if v_customer is null then
    raise exception 'เฉพาะบัญชีนายจ้าง (Client) เท่านั้นที่เขียนโน้ตคนงานได้';
  end if;
  update workers
     set client_note = nullif(btrim(left(coalesce(p_note, ''), 2000)), ''),
         client_note_updated_at = now()
   where id = p_worker_id and employer_id = v_customer;
  if not found then
    raise exception 'ไม่พบคนงานรายนี้ในบริษัทของคุณ';
  end if;
end;
$$;

revoke execute on function set_my_worker_note(text, text) from public, anon;
grant execute on function set_my_worker_note(text, text) to authenticated;
