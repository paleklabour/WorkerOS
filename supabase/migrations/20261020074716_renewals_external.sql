-- ต่อที่อื่น / ทำเล่มที่อื่น (owner 2026-10-20)
-- status 'external' = นายจ้างไปต่อใบอนุญาตกับนายหน้าอื่น: ไม่มีรายการรอออกบิล, คนงานออกจากรายการถึงรอบ
--   จนกว่าจะมีข้อมูลใบอนุญาตใหม่ (old_permit_expiry ยังเท่ากับวันหมดอายุปัจจุบันของคนงาน = ยังไม่มีข้อมูลใหม่)
-- steps.bookExternal = { at, by, client?, oldPassportExpiry } = เราต่อใบอนุญาต แต่เล่มทำที่อื่น (ไม่ขวางการปิดรอบ)
-- external_by_client = ลูกค้าแจ้งเองจากพอร์ทัล

alter table renewals drop constraint if exists renewals_status_check;
alter table renewals add constraint renewals_status_check check (status in ('active', 'done', 'cancelled', 'external'));
alter table renewals add column if not exists external_by_client boolean not null default false;

-- ลูกค้าแจ้ง "ต่อที่อื่นแล้ว": คนงานที่ถึงรอบ (ยังไม่มีรอบ) หรือรอบที่ยังไม่ตรวจสุขภาพและยังไม่ออกบิล
create or replace function client_mark_external(p_worker_ids text[], p_note text default null)
returns setof renewals language plpgsql security definer set search_path = public as $$
declare
  v_cust text := my_customer_id();
  v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
  wid text;
  w workers%rowtype;
  nr renewals%rowtype;
begin
  if my_role() is distinct from 'client' or v_cust is null then
    raise exception 'เฉพาะบัญชีนายจ้างเท่านั้น';
  end if;
  foreach wid in array coalesce(p_worker_ids, '{}') loop
    select * into w from workers
      where id = wid and employer_id = v_cust and coalesce(status, 'active') not in ('archived', 'deleted');
    if not found then raise exception 'ไม่พบคนงานในบริษัทของคุณ'; end if;
    select * into nr from renewals where worker_id = w.id and status = 'active' for update;
    if found then
      if nr.steps ? 'medical' then raise exception 'คนงาน % ตรวจสุขภาพแล้ว กรุณาติดต่อเจ้าหน้าที่', w.first_name; end if;
      if exists (select 1 from jobs where batch_id = 'renewal-' || nr.id
                 and (invoice_id is not null or payment_status = 'ไม่เรียกเก็บเงิน')) then
        raise exception 'คนงาน % ออกบิลแล้ว กรุณาติดต่อเจ้าหน้าที่', w.first_name;
      end if;
      delete from jobs where batch_id = 'renewal-' || nr.id;
      update renewals set status = 'external', external_by_client = true, client_note = coalesce(v_note, client_note)
        where id = nr.id returning * into nr;
    else
      if w.permit_expiry is null or w.permit_expiry > current_date + 60 then
        raise exception 'คนงาน % ยังไม่ถึงรอบต่ออายุ', w.first_name;
      end if;
      insert into renewals (worker_id, customer_id, old_permit_expiry, status, opened_by_client, external_by_client, client_note, started_by, updated_by)
        values (w.id, v_cust, w.permit_expiry, 'external', true, true, v_note, auth.uid(), auth.uid())
        returning * into nr;
    end if;
    return next nr;
  end loop;
end $$;

-- ลูกค้าแจ้ง "ทำเล่มที่อื่น" ในรอบที่ติ๊กทำเล่มไว้ — รายการรอออกบิลค่าต่อเล่มถูกลบ (ถ้าออกบิลแล้ว ต้องติดต่อเจ้าหน้าที่)
create or replace function client_book_external(p_id uuid)
returns renewals language plpgsql security definer set search_path = public as $$
declare
  v_cust text := my_customer_id();
  nr renewals%rowtype;
  v_pass date;
begin
  if my_role() is distinct from 'client' or v_cust is null then
    raise exception 'เฉพาะบัญชีนายจ้างเท่านั้น';
  end if;
  select * into nr from renewals where id = p_id and customer_id = v_cust and status = 'active' for update;
  if not found then raise exception 'ไม่พบรอบต่ออายุนี้'; end if;
  if not nr.with_book or nr.steps ? 'book' or nr.steps ? 'bookExternal' then raise exception 'รอบนี้ไม่มีขั้นทำเล่มที่รออยู่'; end if;
  if exists (select 1 from jobs where batch_id = 'renewal-' || nr.id and job_type = 'ต่อเล่ม CI/Passport'
             and (invoice_id is not null or payment_status = 'ไม่เรียกเก็บเงิน')) then
    raise exception 'ค่าทำเล่มออกบิลแล้ว กรุณาติดต่อเจ้าหน้าที่';
  end if;
  select passport_expiry into v_pass from workers where id = nr.worker_id;
  delete from jobs where batch_id = 'renewal-' || nr.id and job_type = 'ต่อเล่ม CI/Passport';
  update renewals set steps = steps || jsonb_build_object('bookExternal',
      jsonb_build_object('at', current_date, 'by', auth.uid(), 'client', true, 'oldPassportExpiry', v_pass))
    where id = nr.id returning * into nr;
  return nr;
end $$;

revoke all on function client_mark_external(text[], text) from public, anon;
revoke all on function client_book_external(uuid) from public, anon;
grant execute on function client_mark_external(text[], text) to authenticated;
grant execute on function client_book_external(uuid) to authenticated;
