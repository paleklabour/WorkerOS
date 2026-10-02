-- การจัดหน้าวิดเจ็ตของผู้ใช้แต่ละคน (ลำดับ + ขนาดการ์ดในแดชบอร์ด/สรุปการเงิน) — login เครื่องไหนก็ได้หน้าตาเดิม
-- รูปแบบ: {"dashboard": {"order": ["id", ...], "sizes": {"id": "s|m|l|xl"}}, "finance": {...}} — ดู setupWidgetBoards() ใน app.js
-- เหมือน theme: profiles แก้ได้เฉพาะ admin จึงให้เรียก set_my_ui_layout() ซึ่งแก้ได้เฉพาะคอลัมน์นี้ของแถวตัวเอง
alter table profiles add column if not exists ui_layout jsonb;

create or replace function set_my_ui_layout(p_layout jsonb) returns void
language sql security definer set search_path = public as $$
  update profiles set ui_layout = p_layout where id = auth.uid();
$$;

revoke execute on function set_my_ui_layout(jsonb) from public, anon;
grant execute on function set_my_ui_layout(jsonb) to authenticated;
