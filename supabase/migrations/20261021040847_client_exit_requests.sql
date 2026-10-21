-- พอร์ทัลลูกค้า: นายจ้างแจ้งออกคนงานเอง (owner 2026-10-21) — เปิดใบงาน "แจ้งออกคนงานต่างด้าว" สถานะ "รอดำเนินการ" ทันที
-- ไม่มีช่องเหตุผล (owner) · opened_by_client = ป้าย "ลูกค้าเปิดงาน" ฝั่งเจ้าหน้าที่ · คนงานยังเป็นปกติจนเจ้าหน้าที่ปิดงาน
-- (ปิดงาน → พ้นสภาพ/แจ้งออก ตาม syncWorkerStatusForExitJob ใน app.js)

alter table jobs add column if not exists opened_by_client boolean not null default false;

-- ลูกค้าไม่ได้เขียนตาราง jobs ตรงอีกต่อไป (หน้าจอพอร์ทัลไม่เคยใช้) — เปิดงานผ่าน RPC ด้านล่างเท่านั้น
-- เดิมบัญชีลูกค้า insert/update ใบงานของบริษัทตัวเองได้ทุกช่อง (สถานะ ค่าบริการ ฯลฯ)
drop policy if exists jobs_write on jobs;
create policy jobs_write on jobs for insert with check (can_ops());
drop policy if exists jobs_update on jobs;
create policy jobs_update on jobs for update using (
  my_role() in ('admin', 'operation_manager', 'account_manager')
  or (my_role() = 'staff' and (assigned_to = auth.uid() or opened_by = auth.uid()))
);

create or replace function client_request_exit(p_worker_id text)
returns jobs language plpgsql security definer set search_path = public as $$
declare
  v_cust text := my_customer_id();
  v_agent text;
  w workers%rowtype;
  nj jobs%rowtype;
begin
  if my_role() is distinct from 'client' or v_cust is null then
    raise exception 'เฉพาะบัญชีนายจ้างเท่านั้น';
  end if;
  select * into w from workers
    where id = p_worker_id and employer_id = v_cust and coalesce(status, 'active') not in ('archived', 'deleted');
  if not found then raise exception 'ไม่พบคนงานในบริษัทของคุณ หรือคนงานพ้นสภาพแล้ว'; end if;
  -- กติกา 1 ประเภทงานเปิดซ้อนไม่ได้ (findOpenJobConflict)
  if exists (select 1 from jobs where worker_id = w.id
             and regexp_replace(job_type, '\s*\(\d+\)', '', 'g') = 'แจ้งออกคนงานต่างด้าว'
             and status in ('รอดำเนินการ', 'กำลังดำเนินการ', 'รอเอกสารเพิ่มเติม')) then
    raise exception 'คนงานคนนี้มีใบงานแจ้งออกที่ยังไม่ปิดอยู่แล้ว';
  end if;
  select referred_by_agent_id into v_agent from customers where id = v_cust;
  insert into jobs (id, customer_id, worker_id, job_type, fee, status, batch_id, created_at, updated_at, opened_at,
                    opened_by, agent_id, payment_status, attachments, notes, opened_by_client)
    values ('job-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8), v_cust, w.id, 'แจ้งออกคนงานต่างด้าว', 0,
            'รอดำเนินการ', 'batch-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8),
            (now() at time zone 'Asia/Bangkok')::date, (now() at time zone 'Asia/Bangkok')::date, now(),
            auth.uid(), v_agent, 'ยังไม่ออกบิล', '[]'::jsonb, 'ลูกค้าแจ้งออกจากพอร์ทัล', true)
    returning * into nj;
  return nj;
end $$;

-- ลูกค้ายกเลิกคำขอแจ้งออกของตัวเอง: ได้เฉพาะงานที่ลูกค้าเปิดเอง ยัง "รอดำเนินการ" และยังไม่ออกบิล/ไม่ได้ตั้งไม่เรียกเก็บเงิน
create or replace function client_cancel_exit(p_job_id text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_cust text := my_customer_id();
  j jobs%rowtype;
begin
  if my_role() is distinct from 'client' or v_cust is null then
    raise exception 'เฉพาะบัญชีนายจ้างเท่านั้น';
  end if;
  select * into j from jobs where id = p_job_id and customer_id = v_cust and opened_by_client for update;
  if not found then raise exception 'ไม่พบคำขอแจ้งออกนี้'; end if;
  if j.status <> 'รอดำเนินการ' then raise exception 'เจ้าหน้าที่เริ่มดำเนินการแล้ว ยกเลิกเองไม่ได้ กรุณาติดต่อเจ้าหน้าที่'; end if;
  if j.invoice_id is not null or j.payment_status = 'ไม่เรียกเก็บเงิน' then
    raise exception 'ออกบิลแล้ว ยกเลิกเองไม่ได้ กรุณาติดต่อเจ้าหน้าที่';
  end if;
  delete from jobs where id = j.id;
end $$;

revoke all on function client_request_exit(text) from public, anon;
revoke all on function client_cancel_exit(text) from public, anon;
grant execute on function client_request_exit(text) to authenticated;
grant execute on function client_cancel_exit(text) to authenticated;
