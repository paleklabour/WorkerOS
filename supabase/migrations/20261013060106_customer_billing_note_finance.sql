-- Note สำหรับวางบิล: Account Manager (สิทธิ์การเงิน แก้ข้อมูลนายจ้างไม่ได้) แก้ได้ตอนออกบิล (owner, 2026-10-13)
-- แก้ได้เฉพาะคอลัมน์ billing_note — ฝ่ายการเงินหรือฝ่ายปฏิบัติการ
create or replace function set_customer_billing_note(p_customer_id text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (can_finance() or can_ops()) then
    raise exception 'ไม่มีสิทธิ์แก้ Note วางบิล';
  end if;
  update customers set billing_note = nullif(left(trim(coalesce(p_note, '')), 2000), '') where id = p_customer_id;
end;
$$;

revoke execute on function set_customer_billing_note(text, text) from public, anon;
grant execute on function set_customer_billing_note(text, text) to authenticated;
