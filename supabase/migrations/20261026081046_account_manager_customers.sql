-- บัญชี (Account Manager) เพิ่ม/แก้นายจ้างได้ แต่คนงานยังดูอย่างเดียว (owner 2026-10-26) — ฝั่งหน้าเว็บคือ PERMS.customers ใน app.js
create or replace function public.can_edit_customers()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(my_role() in ('admin', 'account_manager', 'operation_manager', 'staff'), false);
$$;

drop policy if exists customers_write on public.customers;
create policy customers_write on public.customers for insert with check (can_edit_customers());

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update using (can_edit_customers());
