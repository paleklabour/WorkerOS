-- พอร์ทัลลูกค้า: นายจ้างเปิดรอบต่ออายุเองได้ (owner 2026-10-20) — รอบเริ่มทันที ไม่ต้องรอเจ้าหน้าที่รับเรื่อง
-- opened_by_client = ป้าย "ลูกค้าเปิดงาน" ฝั่งเจ้าหน้าที่, client_note = ข้อความที่ลูกค้าพิมพ์มา
-- ลูกค้ายกเลิกเองได้ถ้ายังไม่ได้ตรวจสุขภาพ (steps.medical ว่าง) และยังไม่ได้ออกบิล

alter table renewals add column if not exists opened_by_client boolean not null default false;
alter table renewals add column if not exists client_note text;

-- ลูกค้าเห็นรอบของนายจ้างตัวเอง (ดูอย่างเดียว — เขียนผ่าน RPC ด้านล่างเท่านั้น)
drop policy if exists renewals_select on renewals;
create policy renewals_select on renewals for select
  using (is_internal() or (my_role() = 'client' and customer_id = my_customer_id()));

-- p_rows = [{ "worker_id": "...", "with_book": true }] — สร้างรอบ + ใบงานเก็บเงินเบื้องหลัง (batch_id = 'renewal-<id>')
-- เหมือน startRenewals/createRenewalJobs ใน app.js
create or replace function client_start_renewals(p_rows jsonb, p_note text default null)
returns setof renewals language plpgsql security definer set search_path = public as $$
declare
  v_cust text := my_customer_id();
  v_agent text;
  r jsonb;
  w workers%rowtype;
  nr renewals%rowtype;
begin
  if my_role() is distinct from 'client' or v_cust is null then
    raise exception 'เฉพาะบัญชีนายจ้างเท่านั้น';
  end if;
  select referred_by_agent_id into v_agent from customers where id = v_cust;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    select * into w from workers
      where id = r->>'worker_id' and employer_id = v_cust and coalesce(status, 'active') not in ('archived', 'deleted');
    if not found then raise exception 'ไม่พบคนงานในบริษัทของคุณ'; end if;
    if w.permit_expiry is null or w.permit_expiry > current_date + 60 then
      raise exception 'คนงาน % ยังไม่ถึงรอบต่ออายุ', w.first_name;
    end if;
    if exists (select 1 from renewals where worker_id = w.id and status = 'active') then continue; end if;
    insert into renewals (worker_id, customer_id, old_permit_expiry, with_book, opened_by_client, client_note, started_by, updated_by)
      values (w.id, v_cust, w.permit_expiry, coalesce((r->>'with_book')::boolean, false), true,
              nullif(left(trim(coalesce(p_note, '')), 500), ''), auth.uid(), auth.uid())
      returning * into nr;
    insert into jobs (id, customer_id, worker_id, job_type, status, batch_id, opened_by, agent_id, payment_status, attachments, notes)
      values ('job-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8), v_cust, w.id, 'ต่ออายุใบอนุญาตทำงาน',
              'กำลังดำเนินการ', 'renewal-' || nr.id, auth.uid(), v_agent, 'ยังไม่ออกบิล', '[]'::jsonb, 'ลูกค้าเปิดงานจากพอร์ทัล');
    if nr.with_book then
      insert into jobs (id, customer_id, worker_id, job_type, status, batch_id, opened_by, agent_id, payment_status, attachments, notes)
        values ('job-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8), v_cust, w.id, 'ต่อเล่ม CI/Passport',
                'กำลังดำเนินการ', 'renewal-' || nr.id, auth.uid(), v_agent, 'ยังไม่ออกบิล', '[]'::jsonb, 'ลูกค้าเปิดงานจากพอร์ทัล');
    end if;
    return next nr;
  end loop;
end $$;

-- ลูกค้ายกเลิกรอบของตัวเอง: ได้เฉพาะยังไม่ตรวจสุขภาพ และใบงานเก็บเงินยังไม่อยู่ในบิล/ไม่ได้ตั้งไม่เรียกเก็บเงิน
create or replace function client_cancel_renewal(p_id uuid)
returns renewals language plpgsql security definer set search_path = public as $$
declare
  v_cust text := my_customer_id();
  nr renewals%rowtype;
begin
  if my_role() is distinct from 'client' or v_cust is null then
    raise exception 'เฉพาะบัญชีนายจ้างเท่านั้น';
  end if;
  select * into nr from renewals where id = p_id and customer_id = v_cust and status = 'active' for update;
  if not found then raise exception 'ไม่พบรอบต่ออายุนี้'; end if;
  if nr.steps ? 'medical' then raise exception 'ตรวจสุขภาพแล้ว ยกเลิกเองไม่ได้ กรุณาติดต่อเจ้าหน้าที่'; end if;
  if exists (select 1 from jobs where batch_id = 'renewal-' || nr.id
             and (invoice_id is not null or payment_status = 'ไม่เรียกเก็บเงิน')) then
    raise exception 'ออกบิลแล้ว ยกเลิกเองไม่ได้ กรุณาติดต่อเจ้าหน้าที่';
  end if;
  delete from jobs where batch_id = 'renewal-' || nr.id;
  update renewals set status = 'cancelled', note = coalesce(note || ' · ', '') || 'ลูกค้ายกเลิกเองจากพอร์ทัล'
    where id = nr.id returning * into nr;
  return nr;
end $$;

revoke all on function client_start_renewals(jsonb, text) from public, anon;
revoke all on function client_cancel_renewal(uuid) from public, anon;
grant execute on function client_start_renewals(jsonb, text) to authenticated;
grant execute on function client_cancel_renewal(uuid) to authenticated;
