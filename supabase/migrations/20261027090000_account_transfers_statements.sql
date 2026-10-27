-- โอนเงินระหว่างบัญชีของบริษัท + รายการจาก statement ธนาคาร (owner 2026-10-27)
--
-- account_transfers: ย้ายเงินระหว่างบัญชีธนาคาร / เงินสดของบริษัทเอง (ฝากเงินสดเข้าแบงค์, ถอนเงินสด, โอนข้ามบัญชี)
--   ไม่ใช่รายรับ/รายจ่าย — แค่ย้ายยอดคงเหลือ (bankAccountBalance / cashBalance ใน app.js)
--   from_account / to_account = id ในตาราง banks หรือ 'cash'
-- bank_statement_lines: บรรทัดจาก statement ที่นำเข้า (PDF ธนาคาร) — 1 แถว = 1 รายการเดินบัญชี
--   amount บวก = เงินเข้า, ลบ = เงินออก; match_kind/match_id = จับคู่กับ receipt / payment / expense / transfer
--   หรือ 'ignored' (ไม่เกี่ยวกับงาน) — id สร้างจาก bank + วันที่ + ยอด + ยอดคงเหลือ จึงนำเข้าไฟล์เดิมซ้ำได้ไม่เกิดแถวซ้ำ

create table if not exists account_transfers (
  id text primary key,
  transfer_date date not null,
  from_account text not null,
  to_account text not null,
  amount numeric(14,2) not null check (amount > 0),
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (from_account <> to_account)
);

alter table account_transfers enable row level security;
drop policy if exists account_transfers_select on account_transfers;
create policy account_transfers_select on account_transfers for select using (can_finance());
drop policy if exists account_transfers_insert on account_transfers;
create policy account_transfers_insert on account_transfers for insert with check (can_finance());
drop policy if exists account_transfers_update on account_transfers;
create policy account_transfers_update on account_transfers for update using (can_finance()) with check (can_finance());
drop policy if exists account_transfers_delete on account_transfers;
create policy account_transfers_delete on account_transfers for delete using (can_finance());

create table if not exists bank_statement_lines (
  id text primary key,
  bank_id text not null,
  line_date date not null,
  description text,
  amount numeric(14,2) not null,
  balance numeric(14,2),
  match_kind text check (match_kind in ('receipt', 'payment', 'expense', 'transfer', 'ignored')),
  match_id text,
  note text,
  imported_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists bank_statement_lines_bank_date on bank_statement_lines (bank_id, line_date);

alter table bank_statement_lines enable row level security;
drop policy if exists bank_statement_lines_select on bank_statement_lines;
create policy bank_statement_lines_select on bank_statement_lines for select using (can_finance());
drop policy if exists bank_statement_lines_insert on bank_statement_lines;
create policy bank_statement_lines_insert on bank_statement_lines for insert with check (can_finance());
drop policy if exists bank_statement_lines_update on bank_statement_lines;
create policy bank_statement_lines_update on bank_statement_lines for update using (can_finance()) with check (can_finance());
drop policy if exists bank_statement_lines_delete on bank_statement_lines;
create policy bank_statement_lines_delete on bank_statement_lines for delete using (can_finance());
