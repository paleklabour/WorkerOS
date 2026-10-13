-- ห้ามล็อกอินซ้อน (owner, 2026-10-13): บัญชีหนึ่งใช้ได้ทีละเครื่อง — ล็อกอินเครื่องใหม่ = เครื่องเก่าถูกออกจากระบบ
-- แต่ละครั้งที่ล็อกอิน หน้าเว็บสุ่มรหัสเซสชันแล้วเรียก claim_session(); หน้าเว็บที่เปิดค้างอยู่เช็ค my_active_session() เป็นระยะ
-- ถ้าไม่ตรงกับของตัวเอง = มีเครื่องอื่นล็อกอินทีหลัง → ออกจากระบบ
alter table profiles add column if not exists active_session uuid;

create or replace function claim_session(p_session uuid) returns void
language sql security definer set search_path = public as $$
  update profiles set active_session = p_session where id = auth.uid();
$$;

create or replace function my_active_session() returns uuid
language sql stable security definer set search_path = public as $$
  select active_session from profiles where id = auth.uid();
$$;

revoke execute on function claim_session(uuid) from public, anon;
revoke execute on function my_active_session() from public, anon;
grant execute on function claim_session(uuid) to authenticated;
grant execute on function my_active_session() to authenticated;
