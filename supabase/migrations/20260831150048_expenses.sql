-- ============================================================================
-- ระบบรายจ่าย (Expenses) — คู่กับฝั่งรายรับ (jobs.fee) ที่มีอยู่แล้ว ใช้คำนวณ
-- "กำไรสุทธิ" และสรุปรายจ่ายแยกตามหมวดหมู่ในแท็บ "สรุปการเงินและบัญชีรายรับ"
-- ไม่เปิดให้ role = client เห็นเลย เพราะเป็นข้อมูลภายในของกิจการ ไม่ใช่ของลูกค้ารายใดรายหนึ่ง
-- ============================================================================
create table if not exists expenses (
  id             text primary key,                 -- expense-xxxx
  expense_date   date not null default current_date,
  category       text not null,
  amount         numeric(12,2) not null default 0,
  description    text,
  payment_method text,                              -- 'เงินสด' หรือชื่อธนาคาร (เทียบ jobs.payment_method)
  attachment     jsonb default '{}'::jsonb,          -- ใบเสร็จแนบ {name, data(url)}
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz default now()
);

create index if not exists idx_expenses_date on expenses(expense_date);
create index if not exists idx_expenses_category on expenses(category);

alter table expenses enable row level security;

create policy "expenses_select" on expenses for select using (my_role() in ('admin','manager','staff'));
create policy "expenses_write" on expenses for insert with check (my_role() in ('admin','manager'));
create policy "expenses_update" on expenses for update using (my_role() in ('admin','manager'));
create policy "expenses_delete" on expenses for delete using (my_role() = 'admin');
