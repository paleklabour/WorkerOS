-- รูปโปรไฟล์ผู้ใช้แต่ละคน (owner, 2026-10-13)
-- admin แก้ได้ทุกแถวผ่าน policy profiles_admin_update เดิม
-- ผู้ใช้ทั่วไปเปลี่ยนรูปตัวเองผ่าน set_my_avatar() ซึ่งแก้ได้เฉพาะคอลัมน์ avatar_url ของแถวตัวเอง (เหมือน set_my_theme)
alter table profiles add column if not exists avatar_url text;

create or replace function set_my_avatar(p_url text) returns void
language sql security definer set search_path = public as $$
  update profiles set avatar_url = nullif(p_url, '') where id = auth.uid();
$$;

revoke execute on function set_my_avatar(text) from public, anon;
grant execute on function set_my_avatar(text) to authenticated;
