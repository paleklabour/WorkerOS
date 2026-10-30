-- บัญชีลูกค้า 1 บัญชี ดูได้หลายบริษัท (owner 2026-10-30 — ปัตตานีไอซ์ / อัลทิเมท ริช / 4 โพลาแบร์ เจ้าของเดียวกัน)
-- profiles.customer_id = บริษัทที่กำลังดูอยู่ (my_customer_id() / RLS เดิมใช้ต่อได้ไม่ต้องแก้)
-- client_customer_links = บริษัทที่บัญชีนี้สลับไปดูได้; สลับผ่าน RPC client_switch_customer เท่านั้น (ลูกค้าแก้ profiles ตรงไม่ได้)

create table if not exists public.client_customer_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id text not null references public.customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, customer_id)
);
alter table public.client_customer_links enable row level security;

create policy ccl_select on public.client_customer_links for select to authenticated
  using (user_id = (select auth.uid()) or is_internal());
create policy ccl_admin_insert on public.client_customer_links for insert to authenticated with check (my_role() = 'admin');
create policy ccl_admin_update on public.client_customer_links for update to authenticated using (my_role() = 'admin');
create policy ccl_admin_delete on public.client_customer_links for delete to authenticated using (my_role() = 'admin');
create policy tester_no_insert on public.client_customer_links as restrictive for insert to authenticated with check (not is_tester());
create policy tester_no_update on public.client_customer_links as restrictive for update to authenticated using (not is_tester());
create policy tester_no_delete on public.client_customer_links as restrictive for delete to authenticated using (not is_tester());

-- บริษัทที่บัญชีนี้ดูได้ (บริษัทปัจจุบัน + ที่ผูกไว้) — ลูกค้าอ่าน customers ได้แค่บริษัทปัจจุบัน จึงต้องผ่านฟังก์ชันนี้
create or replace function public.client_my_companies()
returns table (id text, company_name text, tax_id text)
language sql stable security definer set search_path to 'public'
as $$
  select c.id, c.company_name, c.tax_id
    from customers c
   where c.id = my_customer_id()
      or c.id in (select l.customer_id from client_customer_links l where l.user_id = auth.uid())
   order by c.company_name;
$$;
revoke execute on function public.client_my_companies() from public, anon;
grant execute on function public.client_my_companies() to authenticated;

create or replace function public.client_switch_customer(p_customer_id text)
returns void
language plpgsql security definer set search_path to 'public'
as $$
begin
  if my_role() <> 'client' then raise exception 'เฉพาะบัญชีลูกค้า'; end if;
  if not exists (select 1 from client_customer_links where user_id = auth.uid() and customer_id = p_customer_id) then
    raise exception 'บัญชีนี้ไม่มีสิทธิ์ดูบริษัทนี้';
  end if;
  update profiles set customer_id = p_customer_id where id = auth.uid();
end $$;
revoke execute on function public.client_switch_customer(text) from public, anon;
grant execute on function public.client_switch_customer(text) to authenticated;

-- ผูก 3 บัญชีลูกค้าของกลุ่มนี้ให้ดูได้ทั้ง 3 บริษัท (เก็บบัญชีเดิมไว้ทั้งหมด)
insert into public.client_customer_links (user_id, customer_id)
select p.id, c.id
  from profiles p
  cross join (values ('cust-1791947942016'), ('cust-1792100000000'), ('cust-1792110000000')) as c(id)
 where p.role = 'client' and p.customer_id in ('cust-1791947942016', 'cust-1792100000000', 'cust-1792110000000')
on conflict do nothing;
