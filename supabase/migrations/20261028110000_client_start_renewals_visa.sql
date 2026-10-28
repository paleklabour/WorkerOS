-- รอบต่ออายุที่ไม่ทำเล่ม = ตี Visa ในเล่มเดิม (owner 2026-10-28) — นายจ้างเปิดรอบจากพอร์ทัลก็ได้รายการรอออกบิล "ตี visa" ด้วย
-- (เหมือน createRenewalJobs ใน app.js)
create or replace function public.client_start_renewals(p_rows jsonb, p_note text default null)
 returns setof renewals
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
    insert into jobs (id, customer_id, worker_id, job_type, status, batch_id, opened_by, agent_id, payment_status, attachments, notes)
      values ('job-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8), v_cust, w.id,
              case when nr.with_book then 'ต่อเล่ม CI/Passport' else 'ตี visa' end,
              'กำลังดำเนินการ', 'renewal-' || nr.id, auth.uid(), v_agent, 'ยังไม่ออกบิล', '[]'::jsonb, 'ลูกค้าเปิดงานจากพอร์ทัล');
    return next nr;
  end loop;
end $function$;
