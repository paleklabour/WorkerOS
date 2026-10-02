-- ธีมของผู้ใช้แต่ละคน (สว่าง/ชมพู/มืด) — login เครื่องไหนก็ได้ธีมของตัวเอง
-- profiles แก้ได้เฉพาะ admin (กันผู้ใช้แก้ role ตัวเอง) จึงไม่เปิด policy update ให้ทุกคน
-- แต่ให้เรียก set_my_theme() ซึ่งแก้ได้เฉพาะคอลัมน์ theme ของแถวตัวเอง (auth.uid()) เท่านั้น
alter table profiles add column if not exists theme text check (theme in ('light', 'pink', 'dark'));

create or replace function set_my_theme(p_theme text) returns void
language sql security definer set search_path = public as $$
  update profiles set theme = p_theme where id = auth.uid();
$$;

revoke execute on function set_my_theme(text) from public, anon;
grant execute on function set_my_theme(text) to authenticated;
