-- ============================================================================
-- WorkerOS — Supabase (PostgreSQL) initial schema
-- แปลงจากโครงสร้าง Google Sheets เดิม (Users, Customers, Workers, Jobs, Banks,
-- Line_Groups, Line_Logs) ให้เป็นตารางเชิงสัมพันธ์บน Postgres
--
-- ไฟล์นี้แทนที่ schema.sql เดิมที่ root — จัดการ schema ผ่าน migration files
-- ในโฟลเดอร์นี้เท่านั้นจากนี้ไป (supabase db push) ห้ามแก้ schema ตรงบน
-- Dashboard SQL Editor แล้วลืม sync กลับมาเป็นไฟล์
--
-- หมายเหตุ (เทียบกับ schema.sql เดิม): เพิ่มคอลัมน์ jobs.batch_id และ
-- jobs.order_no ที่ app.js ใช้งานอยู่จริงแล้ว แต่ schema เดิมยังไม่มี
-- ============================================================================

create extension if not exists "pgcrypto"; -- สำหรับ gen_random_uuid()

-- ============================================================================
-- 1. CUSTOMERS (นายจ้าง/ลูกค้า)
-- ============================================================================
create table if not exists customers (
  id                text primary key,                 -- คงรูปแบบเดิม เช่น cust-xxxx
  tax_id            text unique,                       -- เลขผู้เสียภาษี 13 หลัก ห้ามซ้ำ
  company_name      text not null,
  business_type      text,
  coordinator       text,
  phone             text,
  email             text,
  branches          jsonb default '[]'::jsonb,          -- เดิมเก็บเป็น JSON string ในชีต
  drive_folder_id   text,                                -- คงไว้ช่วงเปลี่ยนผ่าน (หรือย้ายเป็น storage_path)
  director_id       text,
  created_at        timestamptz default now()
);

-- ============================================================================
-- 2. WORKERS (คนงานต่างด้าว)
-- ============================================================================
create table if not exists workers (
  id                 text primary key,                  -- worker-xxxx
  employer_id        text references customers(id) on delete restrict,
  title              text,                                -- นาย/นาง/นางสาว
  nationality        text check (nationality in ('Myanmar','Laos','Cambodia')),
  worker_uid         text unique,                         -- เลขประจำตัวคนต่างด้าว 13 หลัก
  permit_no          text,
  permit_expiry      date,
  first_name         text,
  last_name          text,
  dob                date,
  passport_no        text,
  passport_pob       text,
  passport_auth      text,
  passport_issue     date,
  passport_expiry    date,
  father_name        text,
  mother_name        text,
  gender             text,
  position           text,
  workplace          text,
  ref_no             text,
  status             text default 'ปกติ',
  photo              text,                                 -- URL หรือ Base64 (แนะนำย้ายไป Supabase Storage แล้วเก็บ path)
  attachments        jsonb default '{}'::jsonb,             -- เดิมเก็บเป็น JSON string
  attachment_names   jsonb default '{}'::jsonb,
  drive_folder_id    text,
  created_at         timestamptz default now()
);

create index if not exists idx_workers_employer on workers(employer_id);
create index if not exists idx_workers_permit_expiry on workers(permit_expiry);
create index if not exists idx_workers_passport_expiry on workers(passport_expiry);

-- ============================================================================
-- 3. JOBS (ใบสั่งงาน/ใบงาน)
-- ============================================================================
create table if not exists jobs (
  id            text primary key,                        -- job-xxxx
  customer_id   text references customers(id) on delete restrict,
  worker_id     text references workers(id) on delete restrict,
  job_type      text,                                       -- เช่น "แจ้งเข้า (2000)"
  fee           numeric(12,2) default 0,
  status        text,                                       -- เช่น "ชำระเงินแล้ว (เงินสด)"
  notes         text,
  order_no      text,                                       -- เลขที่ใบสั่ง/อ้างอิง (app.js: job.orderNo)
  batch_id      text,                                       -- ผูกใบงานที่แตกจากการแจ้งงานครั้งเดียวกัน (app.js: job.batchId)
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_jobs_customer on jobs(customer_id);
create index if not exists idx_jobs_worker on jobs(worker_id);
create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_jobs_batch on jobs(batch_id);

-- ============================================================================
-- 4. BANKS (บัญชีธนาคาร/PromptPay)
-- ============================================================================
create table if not exists banks (
  id             text primary key,
  bank_name      text,
  account_name   text,
  account_number text,
  prompt_pay_id  text,
  qr_image       text                                       -- แนะนำย้ายเป็นไฟล์ใน Supabase Storage แทน Base64
);

-- ============================================================================
-- 5. LINE_GROUPS / LINE_LOGS (แจ้งเตือนผ่าน Line OA)
-- ============================================================================
create table if not exists line_groups (
  id           text primary key default gen_random_uuid()::text,
  group_id     text unique not null,                        -- Line group ID จาก webhook
  group_name   text,
  customer_id  text references customers(id) on delete set null,
  created_at   timestamptz default now()
);

create table if not exists line_logs (
  id          bigint generated always as identity primary key,
  group_id    text,
  event_type  text,
  payload     jsonb,
  created_at  timestamptz default now()
);

-- ============================================================================
-- 6. PROFILES (ผูก role/สิทธิ์เข้ากับผู้ใช้ที่ล็อกอินผ่าน Supabase Auth)
-- ทุกคนที่ต้องเข้าระบบต้องมีบัญชีใน auth.users (สร้างผ่าน Supabase Auth Admin API
-- หรือหน้า Dashboard) แล้วเพิ่มแถวใน profiles ผูก id เดียวกัน 1:1
-- ============================================================================
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text,
  role         text check (role in ('admin','manager','staff','client')) not null default 'staff',
  customer_id  text references customers(id) on delete set null,   -- ใช้เฉพาะ role = client
  created_at   timestamptz default now()
);

alter table profiles enable row level security;

-- ฟังก์ชัน security definer เพื่ออ่าน role/customer_id ของผู้ใช้ปัจจุบัน
-- (ต้องเป็น security definer ไม่งั้นจะเกิด infinite recursion ตอน policy ของ profiles เรียกตัวเอง)
create or replace function my_role() returns text
  language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function my_customer_id() returns text
  language sql security definer stable as $$
  select customer_id from profiles where id = auth.uid();
$$;

-- ============================================================================
-- 7. Row Level Security Policies (ตรงตามสิทธิ์เดิมใน Code.gs)
-- ============================================================================
alter table customers   enable row level security;
alter table workers     enable row level security;
alter table jobs        enable row level security;
alter table banks       enable row level security;
alter table line_groups enable row level security;
alter table line_logs   enable row level security;

-- ---- profiles: ผู้ใช้เห็น/แก้ไขได้เฉพาะของตัวเอง, admin เห็น/แก้ไขได้ทุกคน ----
create policy "profiles_select_own_or_admin" on profiles for select
  using (id = auth.uid() or my_role() = 'admin');
create policy "profiles_admin_write" on profiles for insert with check (my_role() = 'admin');
create policy "profiles_admin_update" on profiles for update using (my_role() = 'admin');
create policy "profiles_admin_delete" on profiles for delete using (my_role() = 'admin');

-- ---- customers: admin/manager/staff เห็นทั้งหมด, client เห็นเฉพาะของตัวเอง ----
create policy "customers_select" on customers for select
  using (my_role() in ('admin','manager','staff') or id = my_customer_id());
create policy "customers_write" on customers for insert with check (my_role() in ('admin','manager'));
create policy "customers_update" on customers for update using (my_role() in ('admin','manager'));
create policy "customers_delete" on customers for delete using (my_role() = 'admin');

-- ---- workers: admin/manager/staff เห็นทั้งหมด (staff อ่านอย่างเดียว), client เห็น/แก้ไขเฉพาะของตัวเอง ----
create policy "workers_select" on workers for select
  using (my_role() in ('admin','manager','staff') or employer_id = my_customer_id());
create policy "workers_write" on workers for insert
  with check (my_role() in ('admin','manager') or (my_role() = 'client' and employer_id = my_customer_id()));
create policy "workers_update" on workers for update
  using (my_role() in ('admin','manager') or (my_role() = 'client' and employer_id = my_customer_id()));
create policy "workers_delete" on workers for delete using (my_role() = 'admin');

-- ---- jobs: เช่นเดียวกับ workers ----
create policy "jobs_select" on jobs for select
  using (my_role() in ('admin','manager','staff') or customer_id = my_customer_id());
create policy "jobs_write" on jobs for insert
  with check (my_role() in ('admin','manager') or (my_role() = 'client' and customer_id = my_customer_id()));
create policy "jobs_update" on jobs for update
  using (my_role() in ('admin','manager') or (my_role() = 'client' and customer_id = my_customer_id()));
create policy "jobs_delete" on jobs for delete using (my_role() = 'admin');

-- ---- banks: ทุกคนที่ล็อกอินแล้วอ่านได้ (ใช้แสดง QR ชำระเงิน), แก้ไขได้เฉพาะ admin/manager ----
create policy "banks_select" on banks for select using (auth.uid() is not null);
create policy "banks_write" on banks for insert with check (my_role() in ('admin','manager'));
create policy "banks_update" on banks for update using (my_role() in ('admin','manager'));
create policy "banks_delete" on banks for delete using (my_role() = 'admin');

-- ---- line_groups / line_logs: เฉพาะ admin/manager/staff (client ไม่เห็น ตรงกับ getData เดิม) ----
create policy "line_groups_select" on line_groups for select using (my_role() in ('admin','manager','staff'));
create policy "line_groups_write" on line_groups for insert with check (my_role() in ('admin','manager'));
create policy "line_groups_update" on line_groups for update using (my_role() in ('admin','manager'));
create policy "line_logs_select" on line_logs for select using (my_role() in ('admin','manager','staff'));
