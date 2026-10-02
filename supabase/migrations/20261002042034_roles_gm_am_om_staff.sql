-- ตำแหน่งใหม่ (ยืนยันกับเจ้าของระบบ 2026-10-02):
--   admin             = Admin / GM — ทุกอย่าง (ลบข้อมูล, จัดการผู้ใช้, สำรอง/กู้คืน)
--   account_manager   = Account Manager — บิล/รับเงิน/มัดจำ/ยกเลิกใบเสร็จ, รายจ่าย, บัญชีธนาคาร, ราคามาตรฐาน+ต้นทุน, ค่าคอม Agent
--                       ดูนายจ้าง/คนงาน/ใบงานได้ (แก้ไม่ได้ ยกเว้นช่องการเงินของใบงานที่ระบบบิลอัปเดตให้)
--   operation_manager = Operation Manager — นายจ้าง/คนงาน/เอกสาร/ใบงาน + มอบหมายงาน ไม่เห็นการเงินและค่าคอม
--   staff             = Staff — เพิ่ม/แก้นายจ้าง คนงาน เอกสาร, เปิดใบงาน, แก้ได้เฉพาะใบงานที่ตัวเองเปิดหรือได้รับมอบหมาย
--   client            = ลูกค้า/นายจ้าง (เหมือนเดิม)
-- role เดิม "manager" → "account_manager" (เปลี่ยนรายคนได้ในหน้าจัดการผู้ใช้)

-- ---------- role ----------
alter table profiles drop constraint if exists profiles_role_check;
update profiles set role = 'account_manager' where role = 'manager';
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'account_manager', 'operation_manager', 'staff', 'client'));

-- ---------- helper (อ่านง่ายกว่าเขียน my_role() in (...) ซ้ำทุก policy) ----------
create or replace function is_internal() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(my_role() in ('admin', 'account_manager', 'operation_manager', 'staff'), false);
$$;
create or replace function can_finance() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(my_role() in ('admin', 'account_manager'), false);
$$;
create or replace function can_ops() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(my_role() in ('admin', 'operation_manager', 'staff'), false);
$$;
revoke execute on function is_internal(), can_finance(), can_ops() from public, anon;
grant execute on function is_internal(), can_finance(), can_ops() to authenticated;

-- รายชื่อทีมงาน (ชื่อ + ตำแหน่ง) สำหรับเลือก "ผู้รับผิดชอบ" ใบงาน — profiles อ่านได้แค่แถวตัวเอง (ยกเว้น admin)
-- จึงเปิดเฉพาะ id/ชื่อ/ตำแหน่งของพนักงานภายในให้พนักงานภายในด้วยกันเห็น (ไม่รวมบัญชีลูกค้า)
create or replace function list_team() returns table (id uuid, name text, role text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.role from profiles p
  where is_internal() and p.role in ('admin', 'account_manager', 'operation_manager', 'staff')
  order by p.name;
$$;
revoke execute on function list_team() from public, anon;
grant execute on function list_team() to authenticated;

-- ---------- ใบงาน: ผู้รับผิดชอบ (มอบหมายงาน) ----------
alter table jobs add column if not exists assigned_to uuid references profiles(id) on delete set null;
create index if not exists idx_jobs_assigned_to on jobs(assigned_to);

-- ---------- customers ----------
drop policy if exists customers_select on customers;
create policy customers_select on customers for select using (is_internal() or id = my_customer_id());
drop policy if exists customers_write on customers;
create policy customers_write on customers for insert with check (can_ops());
drop policy if exists customers_update on customers;
create policy customers_update on customers for update using (can_ops());

-- ---------- workers ----------
drop policy if exists workers_select on workers;
create policy workers_select on workers for select using (is_internal() or employer_id = my_customer_id());
drop policy if exists workers_write on workers;
create policy workers_write on workers for insert
  with check (can_ops() or (my_role() = 'client' and employer_id = my_customer_id()));
drop policy if exists workers_update on workers;
create policy workers_update on workers for update
  using (can_ops() or (my_role() = 'client' and employer_id = my_customer_id()));

-- ---------- jobs ----------
drop policy if exists jobs_select on jobs;
create policy jobs_select on jobs for select using (is_internal() or customer_id = my_customer_id());
drop policy if exists jobs_write on jobs;
create policy jobs_write on jobs for insert
  with check (can_ops() or (my_role() = 'client' and customer_id = my_customer_id()));
drop policy if exists jobs_update on jobs;
create policy jobs_update on jobs for update using (
  my_role() in ('admin', 'operation_manager', 'account_manager')        -- account_manager: ช่องการเงิน (ออกบิล/รับเงิน/ค่าคอม)
  or (my_role() = 'staff' and (assigned_to = auth.uid() or opened_by = auth.uid()))
  or (my_role() = 'client' and customer_id = my_customer_id())
);

-- ---------- agents (รายชื่อใช้ในฟอร์มใบงาน — ทุกคนอ่านได้; ค่าคอมซ่อนในหน้าเว็บ) ----------
drop policy if exists agents_write on agents;
create policy agents_write on agents for insert with check (my_role() in ('admin', 'account_manager', 'operation_manager'));
drop policy if exists agents_update on agents;
create policy agents_update on agents for update using (my_role() in ('admin', 'account_manager', 'operation_manager'));

-- ---------- การเงิน: เขียนได้ admin + account_manager ----------
drop policy if exists banks_write on banks;
create policy banks_write on banks for insert with check (can_finance());
drop policy if exists banks_update on banks;
create policy banks_update on banks for update using (can_finance());

drop policy if exists expenses_select on expenses;
create policy expenses_select on expenses for select using (can_finance());
drop policy if exists expenses_write on expenses;
create policy expenses_write on expenses for insert with check (can_finance());
drop policy if exists expenses_update on expenses;
create policy expenses_update on expenses for update using (can_finance());

drop policy if exists invoices_select on invoices;
create policy invoices_select on invoices for select using (is_internal() or customer_id = my_customer_id());
drop policy if exists invoices_insert on invoices;
create policy invoices_insert on invoices for insert with check (can_finance());
drop policy if exists invoices_update on invoices;
create policy invoices_update on invoices for update using (can_finance());

drop policy if exists payments_select on payments;
create policy payments_select on payments for select using (
  is_internal() or exists (select 1 from invoices i where i.id = payments.invoice_id and i.customer_id = my_customer_id())
);
drop policy if exists payments_insert on payments;
create policy payments_insert on payments for insert with check (can_finance());
drop policy if exists payments_update on payments;
create policy payments_update on payments for update using (can_finance());

drop policy if exists receipts_select on receipts;
create policy receipts_select on receipts for select using (can_finance() or customer_id = my_customer_id());
drop policy if exists receipts_insert on receipts;
create policy receipts_insert on receipts for insert with check (can_finance());
drop policy if exists receipts_update on receipts;
create policy receipts_update on receipts for update using (can_finance());

-- ราคามาตรฐานมีต้นทุน/กำไร → เห็นเฉพาะฝ่ายการเงิน
drop policy if exists service_prices_select on service_prices;
create policy service_prices_select on service_prices for select using (can_finance());
drop policy if exists service_prices_insert on service_prices;
create policy service_prices_insert on service_prices for insert with check (can_finance());
drop policy if exists service_prices_update on service_prices;
create policy service_prices_update on service_prices for update using (can_finance());
drop policy if exists service_prices_delete on service_prices;
create policy service_prices_delete on service_prices for delete using (can_finance());

drop policy if exists free_invoices_select on free_invoices;
create policy free_invoices_select on free_invoices for select using (can_finance() or customer_id = my_customer_id());
drop policy if exists free_invoices_write on free_invoices;
create policy free_invoices_write on free_invoices for insert with check (can_finance());
drop policy if exists free_invoices_update on free_invoices;
create policy free_invoices_update on free_invoices for update using (can_finance());

-- ---------- กลุ่ม LINE ----------
drop policy if exists line_groups_select on line_groups;
create policy line_groups_select on line_groups for select using (is_internal());
drop policy if exists line_groups_write on line_groups;
create policy line_groups_write on line_groups for insert with check (my_role() in ('admin', 'account_manager', 'operation_manager'));
drop policy if exists line_groups_update on line_groups;
create policy line_groups_update on line_groups for update using (my_role() in ('admin', 'account_manager', 'operation_manager'));
drop policy if exists line_logs_select on line_logs;
create policy line_logs_select on line_logs for select using (is_internal());

-- ---------- ไฟล์เอกสาร: ลบได้ admin + operation_manager ----------
drop policy if exists worker_documents_authenticated_delete on storage.objects;
create policy worker_documents_authenticated_delete on storage.objects for delete
  using (bucket_id = 'worker-documents' and my_role() in ('admin', 'operation_manager'));

-- ---------- เลขที่บิล/ใบเสร็จ ----------
create or replace function next_doc_no(p_prefix text) returns text
language plpgsql security definer set search_path = public as $$
declare
  y int := extract(year from (now() at time zone 'Asia/Bangkok'))::int + 543;
  n int;
begin
  if not can_finance() then
    raise exception 'ไม่มีสิทธิ์ออกเลขที่เอกสาร';
  end if;
  if p_prefix not in ('INV', 'RC') then
    raise exception 'prefix ไม่ถูกต้อง';
  end if;
  insert into doc_counters (prefix, year_be, last_no) values (p_prefix, y, 1)
    on conflict (prefix, year_be) do update set last_no = doc_counters.last_no + 1
    returning last_no into n;
  return p_prefix || '-' || y || '-' || lpad(n::text, 4, '0');
end $$;

-- ---------- ค่าตั้งค่ากลางของระบบ (ใช้ร่วมกันทุกผู้ใช้) ----------
-- เช่น "cash_card_order" = ตำแหน่งการ์ดเงินสดในแท็บบัญชีธนาคาร (ลากสลับร่วมกับการ์ดบัญชีธนาคาร)
create table if not exists app_settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz default now()
);
alter table app_settings enable row level security;
drop policy if exists app_settings_select on app_settings;
create policy app_settings_select on app_settings for select using (is_internal());
drop policy if exists app_settings_insert on app_settings;
create policy app_settings_insert on app_settings for insert with check (can_finance());
drop policy if exists app_settings_update on app_settings;
create policy app_settings_update on app_settings for update using (can_finance());
