-- ใบเสร็จ = "เงินเข้า 1 ครั้ง" (โอน/เงินสด 1 ก้อน, สลิป 1 ชุด, เลขที่ RC 1 เลข) แยกจาก payments
--
-- เดิม payments 1 แถว = เงินเข้า 1 ครั้ง ของบิล 1 ใบ → ลูกค้าโอนก้อนเดียวจ่าย 3 บิลต้องบันทึก 3 ครั้ง ได้ใบเสร็จ 3 ใบ
-- และรับมัดจำก่อนมีบิล / โอนเกินยอดไม่ได้เลย
--
-- ตอนนี้:
--   receipts  = เงินที่รับเข้าจริง (นับยอดแบงค์/เงินสดจากตารางนี้)
--   payments  = การตัดยอดเงินก้อนนั้นเข้าบิลแต่ละใบ (receipt_id → receipts) — นับรายรับ/สถานะบิลจากตารางนี้เหมือนเดิม
--   ยอดใบเสร็จ − ยอดที่ตัดเข้าบิลแล้ว = มัดจำ/เครดิตคงค้างของลูกค้า ใช้หักบิลถัดไปได้
--
-- payments เก่าที่ไม่มี receipt_id (ก่อน migration นี้) ยังใช้งานได้ — ถือเป็นเงินเข้าของตัวเอง (เลข RC อยู่ในแถวนั้น)

create table if not exists receipts (
  id            text primary key,                                     -- rcp-xxxx
  receipt_no    text unique,                                          -- RC-2569-0001 (ชุดเลขเดียวกับ payments.receipt_no เดิม)
  customer_id   text references customers(id) on delete set null,
  customer_name text,                                                 -- ชื่อที่พิมพ์บนใบเสร็จ (เก็บไว้เผื่อนายจ้างถูกแก้/ลบ)
  customer_addr text,
  customer_tax  text,
  amount        numeric(12,2) not null check (amount > 0),
  paid_date     date not null default current_date,                   -- วันที่เงินเข้าจริง
  method        text not null default 'cash' check (method in ('cash', 'bank')),
  bank_id       text references banks(id) on delete set null,
  proof_urls    jsonb not null default '[]'::jsonb,                   -- สลิป [{name, url}] แนบครั้งเดียวต่อเงินก้อนนี้
  note          text,
  voided        boolean not null default false,
  void_reason   text,
  voided_at     timestamptz,
  voided_by     uuid references profiles(id) on delete set null,
  recorded_by   uuid references profiles(id) on delete set null,
  created_at    timestamptz default now()
);
create index if not exists idx_receipts_customer on receipts(customer_id);
create index if not exists idx_receipts_paid_date on receipts(paid_date);
create index if not exists idx_receipts_bank on receipts(bank_id);
alter table receipts enable row level security;

drop policy if exists receipts_select on receipts;
create policy receipts_select on receipts for select
  using (my_role() in ('admin', 'manager', 'staff') or customer_id = my_customer_id());
drop policy if exists receipts_insert on receipts;
create policy receipts_insert on receipts for insert
  with check (my_role() in ('admin', 'manager'));
drop policy if exists receipts_update on receipts;
create policy receipts_update on receipts for update
  using (my_role() in ('admin', 'manager'));
drop policy if exists receipts_delete on receipts;
create policy receipts_delete on receipts for delete
  using (my_role() = 'admin');

alter table payments add column if not exists receipt_id text references receipts(id) on delete restrict;
create index if not exists idx_payments_receipt on payments(receipt_id);
