-- next_doc_no(): ปิดช่องให้คนที่ไม่ได้ล็อกอิน (anon) เรียกเพิ่มเลขที่เอกสารได้
-- เดิม `my_role() not in (...)` เป็น NULL เมื่อไม่มี role (anon) → if ไม่ทำงาน → ผ่านไปออกเลขได้
-- และ Supabase ให้สิทธิ์ EXECUTE กับ anon โดยค่าเริ่มต้น แม้จะ revoke จาก public แล้ว
create or replace function next_doc_no(p_prefix text) returns text
  language plpgsql security definer set search_path = public as $$
declare
  y int := extract(year from (now() at time zone 'Asia/Bangkok'))::int + 543;
  n int;
begin
  if coalesce(my_role(), '') not in ('admin', 'manager') then
    raise exception 'ไม่มีสิทธิ์ออกเลขที่เอกสาร';
  end if;
  if p_prefix not in ('INV', 'RC') then
    raise exception 'prefix ไม่ถูกต้อง';
  end if;
  insert into doc_counters (prefix, year_be, last_no) values (p_prefix, y, 1)
    on conflict (prefix, year_be) do update set last_no = doc_counters.last_no + 1
    returning last_no into n;
  return p_prefix || '-' || y || '-' || lpad(n::text, 4, '0');
end $$;
revoke execute on function next_doc_no(text) from public, anon;
grant execute on function next_doc_no(text) to authenticated;
