-- ราคาบริการรายลูกค้า (เจ้าของระบบ 2026-10-29): ยอดรวมที่เรียกเก็บต่อบริการ (รวมค่าธรรมเนียมรัฐ) + "ไม่เก็บเงิน"
-- ฝ่ายการเงินทุกคนเห็น/แก้เหมือนกัน (can_finance()); ฝ่ายปฏิบัติการไม่เห็น; ใช้เป็นราคาเริ่มต้นตอนออกบิล/รวมบิลแทนราคามาตรฐาน
create table if not exists public.customer_service_prices (
  customer_id text not null references public.customers(id) on delete cascade,
  service text not null,
  price numeric(12,2) check (price is null or price >= 0),
  no_charge boolean not null default false,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (customer_id, service)
);

alter table public.customer_service_prices enable row level security;
drop policy if exists csp_select on public.customer_service_prices;
create policy csp_select on public.customer_service_prices for select to authenticated using (can_finance());
drop policy if exists csp_insert on public.customer_service_prices;
create policy csp_insert on public.customer_service_prices for insert to authenticated with check (can_finance());
drop policy if exists csp_update on public.customer_service_prices;
create policy csp_update on public.customer_service_prices for update to authenticated using (can_finance()) with check (can_finance());
drop policy if exists csp_delete on public.customer_service_prices;
create policy csp_delete on public.customer_service_prices for delete to authenticated using (can_finance());

-- บัญชีทดสอบ: อ่านได้ เขียนไม่ได้ (เหมือนทุกตาราง — 20261028100000_tester_role.sql)
drop policy if exists tester_read on public.customer_service_prices;
create policy tester_read on public.customer_service_prices for select to authenticated using (is_tester());
drop policy if exists tester_no_insert on public.customer_service_prices;
drop policy if exists tester_no_update on public.customer_service_prices;
drop policy if exists tester_no_delete on public.customer_service_prices;
create policy tester_no_insert on public.customer_service_prices as restrictive for insert to authenticated with check (not is_tester());
create policy tester_no_update on public.customer_service_prices as restrictive for update to authenticated using (not is_tester());
create policy tester_no_delete on public.customer_service_prices as restrictive for delete to authenticated using (not is_tester());

grant select, insert, update, delete on public.customer_service_prices to authenticated;
