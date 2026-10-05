-- นายจ้างเปิด/ปิดใช้งาน — Admin ปิดใช้งานแล้วคนงานของนายจ้างนั้นจะไม่แสดงในระบบ (ดู applyInactiveEmployers ใน app.js)
alter table public.customers
  add column if not exists status text not null default 'active'
  check (status in ('active', 'inactive'));
