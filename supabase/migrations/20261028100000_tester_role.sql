-- บทบาท tester = บัญชีทดสอบ "ดูได้ทุกหน้า แต่บันทึกไม่ได้" (owner 2026-10-28, บัญชี tua@paleklabour.com)
-- อ่าน: นับเป็นคนใน (is_internal) + อ่านตารางการเงิน/ผู้ใช้ที่ปกติเฉพาะ can_finance / admin
-- เขียน: policy แบบ RESTRICTIVE บล็อก insert/update/delete ทุกตาราง + Storage (ทับ policy อื่นทั้งหมด)
-- ฟังก์ชัน SECURITY DEFINER ที่เขียนข้อมูลตรวจสิทธิ์ด้วย can_finance/can_ops/client อยู่แล้ว (tester ไม่ผ่าน)
-- ยกเว้น job_share_token ที่ใช้ is_internal — เพิ่มกันไว้

alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role = any (array['admin', 'account_manager', 'operation_manager', 'staff', 'tester', 'client']));

create or replace function public.is_tester()
returns boolean language sql stable security definer set search_path to 'public'
as $$ select coalesce(my_role() = 'tester', false); $$;
revoke execute on function public.is_tester() from public, anon;
grant execute on function public.is_tester() to authenticated;

create or replace function public.is_internal()
returns boolean language sql stable security definer set search_path to 'public'
as $$ select coalesce(my_role() in ('admin', 'account_manager', 'operation_manager', 'staff', 'tester'), false); $$;

-- อ่านตารางที่ปกติจำกัดเฉพาะการเงิน / Admin
do $$
declare t text;
begin
  foreach t in array array['account_transfers', 'bank_statement_lines', 'expenses', 'free_invoices', 'receipts',
                           'service_prices', 'profiles', 'drive_backup_runs']
  loop
    execute format('drop policy if exists tester_read on public.%I', t);
    execute format('create policy tester_read on public.%I for select to authenticated using (is_tester())', t);
  end loop;
end $$;

-- บล็อกการเขียนทุกตารางใน public ที่เปิด RLS
do $$
declare t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  loop
    execute format('drop policy if exists tester_no_insert on public.%I', t);
    execute format('drop policy if exists tester_no_update on public.%I', t);
    execute format('drop policy if exists tester_no_delete on public.%I', t);
    execute format('create policy tester_no_insert on public.%I as restrictive for insert to authenticated with check (not is_tester())', t);
    execute format('create policy tester_no_update on public.%I as restrictive for update to authenticated using (not is_tester())', t);
    execute format('create policy tester_no_delete on public.%I as restrictive for delete to authenticated using (not is_tester())', t);
  end loop;
end $$;

drop policy if exists tester_no_insert on storage.objects;
drop policy if exists tester_no_update on storage.objects;
drop policy if exists tester_no_delete on storage.objects;
create policy tester_no_insert on storage.objects as restrictive for insert to authenticated with check (not is_tester());
create policy tester_no_update on storage.objects as restrictive for update to authenticated using (not is_tester());
create policy tester_no_delete on storage.objects as restrictive for delete to authenticated using (not is_tester());

create or replace function public.job_share_token(p_job_id text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  j record;
  unlocked boolean;
  tok text;
begin
  if is_tester() then raise exception 'บัญชีทดสอบ — ดูได้อย่างเดียว'; end if;
  select jb.id, jb.customer_id, jb.payment_status, jb.share_token, coalesce(c.unlock_unpaid_job_docs, false) as unlock_all
    into j
    from jobs jb left join customers c on c.id = jb.customer_id
   where jb.id = p_job_id;
  if not found then raise exception 'ไม่พบใบงาน'; end if;
  if not (is_internal() or (my_customer_id() is not null and my_customer_id() = j.customer_id)) then
    raise exception 'ไม่มีสิทธิ์';
  end if;
  unlocked := j.payment_status in ('ไม่เรียกเก็บเงิน', 'ชำระเงินแล้ว') or j.unlock_all;
  if not unlocked then raise exception 'ใบงานนี้ยังไม่ได้ชำระเงิน'; end if;
  tok := j.share_token;
  if tok is null or tok = '' then
    tok := replace(gen_random_uuid()::text, '-', '');
    update jobs set share_token = tok where id = p_job_id;
  end if;
  return tok;
end;
$function$;

-- บัญชี tua@paleklabour.com เป็นบัญชีทดสอบ
update profiles set role = 'tester' where id = (select id from auth.users where email = 'tua@paleklabour.com');
