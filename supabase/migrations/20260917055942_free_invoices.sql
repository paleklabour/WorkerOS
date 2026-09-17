-- ============================================================================
-- FREE_INVOICES (บิลอิสระ — ออกบิลได้โดยไม่ต้องผูกกับใบงานจริงในระบบ)
-- เดิม "สร้างบิลอิสระ (Quick Invoice)" เป็นแค่หน้าพรีวิวสำหรับพิมพ์/รับชำระ ไม่เคยถูกบันทึกเป็นรายการ
-- ในระบบเลย (ต่างจากบิลที่ผูกกับใบงานจริงซึ่งอิง jobs.payment_status) — ตารางนี้ทำให้ "วางบิล" บันทึกเป็น
-- รายการค้างอยู่จริง ตามด้วย "ยืนยันรับชำระ" ภายหลังได้ เหมือนบิลที่ผูกใบงาน
--
-- เก็บ customer/worker เป็น snapshot (ชื่อ/ที่อยู่/เลขภาษี ณ ตอนออกบิล) แยกจาก customer_id/worker_id ที่ผูกไว้
-- (nullable) เพราะบิลอิสระแก้ไขข้อความบนบิลเองอิสระได้เสมอ และบางครั้งไม่ได้ผูกกับข้อมูลจริงในระบบเลย
-- ============================================================================

create table if not exists free_invoices (
  id                text primary key,                                  -- free-xxxx
  invoice_no        text,                                               -- เลขที่ที่พิมพ์บนบิล เช่น INV-FREE-1234
  customer_id       text references customers(id) on delete set null,   -- นายจ้างที่ผูกไว้ (ถ้าเลือกจากระบบ) — ไม่บังคับ
  customer_name     text,
  customer_addr     text,
  customer_tax      text,
  worker_id         text references workers(id) on delete set null,    -- ลูกจ้างที่ผูกไว้ (ถ้าเลือกจากระบบ) — ไม่บังคับ
  worker_name       text,
  items             jsonb default '[]'::jsonb,                          -- [{title, desc, qty, unitPrice, fee}, ...]
  subtotal          numeric(12,2) default 0,
  grand_total       numeric(12,2) default 0,
  bank_id           text references banks(id) on delete set null,
  payment_method    text,                                               -- 'cash' หรือ id ของ banks
  payment_status    text default 'ออกบิลแล้ว' check (payment_status in ('ออกบิลแล้ว','ชำระเงินแล้ว')),
  payment_proof_url text,
  due_date_text     text,
  notes             text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  paid_at           timestamptz
);

create index if not exists idx_free_invoices_customer on free_invoices(customer_id);
create index if not exists idx_free_invoices_status on free_invoices(payment_status);

alter table free_invoices enable row level security;

-- เช่นเดียวกับ customers: admin/manager เห็น/แก้ไขได้ทั้งหมด, client เห็นเฉพาะของนายจ้างตัวเอง (ถ้าผูกไว้), staff อ่านอย่างเดียว
create policy "free_invoices_select" on free_invoices for select
  using (my_role() in ('admin','manager','staff') or customer_id = my_customer_id());
create policy "free_invoices_write" on free_invoices for insert
  with check (my_role() in ('admin','manager'));
create policy "free_invoices_update" on free_invoices for update
  using (my_role() in ('admin','manager'));
create policy "free_invoices_delete" on free_invoices for delete using (my_role() = 'admin');
