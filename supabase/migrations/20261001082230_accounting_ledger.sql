-- ============================================================================
-- ระบบบัญชี (Accounting ledger) — 2026-10-01
--
-- เดิม: บิลงานเดียว/บิลรวม ไม่ถูกเก็บเป็นรายการ (สร้างสดจากใบงานทุกครั้งที่เปิด) เก็บแค่ jobs.payment_status
--       และไม่มีวันที่รับเงินจริง → รายรับรายเดือนนับตามวันเปิดงาน, เลขที่บิลซ้ำ/พิมพ์ซ้ำไม่ได้, รับเงินได้แค่ครั้งเดียวเต็มจำนวน
-- ใหม่:
--   invoices       บิลทุกใบ (งานเดียว / บิลรวม / บิลอิสระ) + สถานะ ออกแล้ว/ชำระบางส่วน/ชำระครบ/ยกเลิก
--   payments       การรับเงิน (หลายงวดต่อบิลได้ = มัดจำ/ผ่อน) + วันที่รับจริง + ผู้บันทึก + เลขใบเสร็จ
--   doc_counters   ตัวนับเลขที่เอกสารรายปี พ.ศ. (INV-2569-0001 / RC-2569-0001) ผ่าน next_doc_no() แบบ atomic
--   service_prices ราคามาตรฐานต่อประเภทงาน แยก "ค่าธรรมเนียมรัฐ (เก็บแทน)" กับ "ค่าบริการ" — ใช้ภายในเท่านั้น
--                  (บิลที่พิมพ์ให้ลูกค้ายังแสดงยอดรวมต่อรายการเหมือนเดิม)
--   jobs           + invoice_id, paid_at/paid_by, gov_fee (ส่วนที่เป็นค่าธรรมเนียมรัฐในยอด fee), ค่าคอม Agent
--   agents         + default_commission (ค่าคอมเริ่มต้นต่องาน)
--   expenses       + bank_id (จ่ายจากบัญชีไหน), agent_id + job_ids (จ่ายค่าคอมงานไหน)
--   banks          + opening_balance / opening_date (ยอดยกมา สำหรับคำนวณยอดคงเหลือ)
-- free_invoices เดิมถูกย้ายเข้า invoices + payments (ตารางเดิมยังอยู่ ไม่ได้ลบ แต่หน้าเว็บเลิกใช้แล้ว)
-- ============================================================================

-- ---------- ตัวนับเลขที่เอกสาร ----------
create table if not exists doc_counters (
  prefix   text not null,          -- 'INV' / 'RC'
  year_be  int  not null,          -- ปี พ.ศ.
  last_no  int  not null default 0,
  primary key (prefix, year_be)
);
alter table doc_counters enable row level security;  -- ไม่มี policy = เข้าถึงตรงไม่ได้ ใช้ผ่าน next_doc_no() เท่านั้น

create or replace function next_doc_no(p_prefix text) returns text
  language plpgsql security definer set search_path = public as $$
declare
  y int := extract(year from (now() at time zone 'Asia/Bangkok'))::int + 543;
  n int;
begin
  if my_role() not in ('admin', 'manager') then
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
revoke all on function next_doc_no(text) from public;
grant execute on function next_doc_no(text) to authenticated;

-- ---------- บิล ----------
create table if not exists invoices (
  id            text primary key,                                    -- inv-xxxx
  invoice_no    text not null unique,                                -- INV-2569-0001
  kind          text not null default 'job' check (kind in ('job', 'combined', 'free')),
  customer_id   text references customers(id) on delete set null,
  customer_name text,                                                -- snapshot ณ วันออกบิล (แก้บนบิลได้)
  customer_addr text,
  customer_tax  text,
  worker_id     text references workers(id) on delete set null,      -- บิลอิสระที่ผูกคนงาน 1 คน
  worker_name   text,
  job_ids       text[] not null default '{}',
  items         jsonb  not null default '[]'::jsonb,                 -- [{title, desc, qty, unitPrice, fee, govFee, serviceName, jobBreakdown}]
  subtotal      numeric(12,2) not null default 0,
  grand_total   numeric(12,2) not null default 0,
  gov_fee_total numeric(12,2) not null default 0,                    -- ภายใน: ส่วนที่เป็นค่าธรรมเนียมรัฐในยอดบิล (ไม่พิมพ์)
  issue_date    date not null default current_date,
  due_date_text text,
  notes         text,
  bank_id       text references banks(id) on delete set null,       -- บัญชีที่แสดงบนบิลให้ลูกค้าโอน
  status        text not null default 'issued' check (status in ('issued', 'partial', 'paid', 'void')),
  void_reason   text,
  voided_at     timestamptz,
  voided_by     uuid references profiles(id) on delete set null,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists idx_invoices_customer on invoices(customer_id);
create index if not exists idx_invoices_status on invoices(status);
create index if not exists idx_invoices_issue_date on invoices(issue_date);
alter table invoices enable row level security;
create policy "invoices_select" on invoices for select
  using (my_role() in ('admin', 'manager', 'staff') or customer_id = my_customer_id());
create policy "invoices_insert" on invoices for insert with check (my_role() in ('admin', 'manager'));
create policy "invoices_update" on invoices for update using (my_role() in ('admin', 'manager'));
create policy "invoices_delete" on invoices for delete using (my_role() = 'admin');

-- ---------- การรับเงิน ----------
create table if not exists payments (
  id           text primary key,                                     -- pay-xxxx
  invoice_id   text not null references invoices(id) on delete restrict,
  receipt_no   text unique,                                          -- RC-2569-0001
  amount       numeric(12,2) not null check (amount > 0),
  paid_date    date not null default current_date,                   -- วันที่เงินเข้าจริง (ใช้นับรายรับรายเดือน)
  method       text not null default 'cash' check (method in ('cash', 'bank')),
  bank_id      text references banks(id) on delete set null,
  proof_urls   jsonb not null default '[]'::jsonb,                   -- [{name, url}]
  note         text,
  voided       boolean not null default false,
  void_reason  text,
  voided_at    timestamptz,
  voided_by    uuid references profiles(id) on delete set null,
  recorded_by  uuid references profiles(id) on delete set null,
  created_at   timestamptz default now()
);
create index if not exists idx_payments_invoice on payments(invoice_id);
create index if not exists idx_payments_paid_date on payments(paid_date);
create index if not exists idx_payments_bank on payments(bank_id);
alter table payments enable row level security;
create policy "payments_select" on payments for select
  using (my_role() in ('admin', 'manager', 'staff')
         or exists (select 1 from invoices i where i.id = invoice_id and i.customer_id = my_customer_id()));
create policy "payments_insert" on payments for insert with check (my_role() in ('admin', 'manager'));
create policy "payments_update" on payments for update using (my_role() in ('admin', 'manager'));
create policy "payments_delete" on payments for delete using (my_role() = 'admin');

-- ---------- ราคามาตรฐานต่อประเภทงาน (ภายใน — client มองไม่เห็น) ----------
create table if not exists service_prices (
  job_type    text primary key,                                      -- ตรงกับค่าเช็กบ็อกซ์ประเภทงาน เช่น "แจ้งเข้าคนงานต่างด้าว"
  gov_fee     numeric(12,2) not null default 0,                      -- ค่าธรรมเนียมรัฐที่เก็บแทน
  service_fee numeric(12,2) not null default 0,                      -- ค่าบริการของบริษัท
  updated_at  timestamptz default now()
);
alter table service_prices enable row level security;
create policy "service_prices_select" on service_prices for select using (my_role() in ('admin', 'manager', 'staff'));
create policy "service_prices_insert" on service_prices for insert with check (my_role() in ('admin', 'manager'));
create policy "service_prices_update" on service_prices for update using (my_role() in ('admin', 'manager'));
create policy "service_prices_delete" on service_prices for delete using (my_role() in ('admin', 'manager'));

-- ---------- คอลัมน์เพิ่มในตารางเดิม ----------
alter table jobs add column if not exists invoice_id            text references invoices(id) on delete set null;
alter table jobs add column if not exists paid_at               timestamptz;
alter table jobs add column if not exists paid_by               uuid references profiles(id) on delete set null;
alter table jobs add column if not exists gov_fee               numeric(12,2) not null default 0;
alter table jobs add column if not exists commission_amount     numeric(12,2) not null default 0;
alter table jobs add column if not exists commission_paid_at    timestamptz;
alter table jobs add column if not exists commission_expense_id text;
create index if not exists idx_jobs_invoice on jobs(invoice_id);

alter table agents add column if not exists default_commission numeric(12,2) not null default 0;

alter table expenses add column if not exists bank_id  text references banks(id) on delete set null;
alter table expenses add column if not exists agent_id text references agents(id) on delete set null;
alter table expenses add column if not exists job_ids  text[] not null default '{}';

alter table banks add column if not exists opening_balance numeric(12,2) not null default 0;
alter table banks add column if not exists opening_date    date;

-- ---------- ย้ายบิลอิสระเดิมเข้า invoices + payments ----------
insert into invoices (id, invoice_no, kind, customer_id, customer_name, customer_addr, customer_tax, worker_id, worker_name,
                      items, subtotal, grand_total, issue_date, due_date_text, notes, bank_id, status, created_by, created_at, updated_at)
select f.id, coalesce(nullif(f.invoice_no, ''), 'INV-' || upper(f.id)), 'free', f.customer_id, f.customer_name, f.customer_addr,
       f.customer_tax, f.worker_id, f.worker_name, coalesce(f.items, '[]'::jsonb), coalesce(f.subtotal, 0), coalesce(f.grand_total, 0),
       coalesce(f.created_at::date, current_date), f.due_date_text, f.notes, f.bank_id,
       case when f.payment_status = 'ชำระเงินแล้ว' then 'paid' else 'issued' end,
       (select p.id from profiles p where p.id = f.created_by), f.created_at, f.updated_at
from free_invoices f
where not exists (select 1 from invoices i where i.id = f.id);

insert into payments (id, invoice_id, amount, paid_date, method, bank_id, proof_urls, note, created_at)
select 'pay-' || f.id, f.id, f.grand_total, coalesce(f.paid_at::date, f.updated_at::date, current_date),
       case when f.bank_id is null then 'cash' else 'bank' end, f.bank_id,
       case when coalesce(f.payment_proof_url, '') = '' then '[]'::jsonb
            else (select coalesce(jsonb_agg(jsonb_build_object('name', 'หลักฐานการโอน', 'url', trim(u))), '[]'::jsonb)
                  from unnest(string_to_array(f.payment_proof_url, ',')) u) end,
       'ย้ายจากบิลอิสระเดิม', coalesce(f.paid_at, f.updated_at)
from free_invoices f
where f.payment_status = 'ชำระเงินแล้ว' and coalesce(f.grand_total, 0) > 0
  and not exists (select 1 from payments p where p.id = 'pay-' || f.id);
