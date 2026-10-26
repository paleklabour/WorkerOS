-- ลิงก์โฟลเดอร์เอกสารปิดงาน (owner 2026-10-26): 1 ใบงาน = 1 ลิงก์ เปิดดู/โหลดได้โดยไม่ต้องล็อกอิน (share-job.html → edge function share-job-docs)
alter table public.jobs add column if not exists share_token text;

-- สร้าง/คืน token ของใบงาน — พนักงานภายใน หรือลูกค้าเจ้าของใบงาน (ลูกค้าแก้ jobs ตรงไม่ได้ จึงต้องผ่าน RPC นี้)
-- ให้เฉพาะใบงานที่ลูกค้าเปิดเอกสารได้แล้ว: ไม่เรียกเก็บเงิน / ชำระเงินแล้ว / นายจ้างตั้งปลดล็อกเอกสารงานค้างชำระ
create or replace function public.job_share_token(p_job_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  j record;
  unlocked boolean;
  tok text;
begin
  select jb.id, jb.customer_id, jb.payment_status, jb.share_token, coalesce(c.unlock_unpaid_job_docs, false) as unlock_all
    into j
    from jobs jb left join customers c on c.id = jb.customer_id
   where jb.id = p_job_id;
  if not found then raise exception 'ไม่พบใบงาน'; end if;
  if not (is_internal() or (my_customer_id() is not null and my_customer_id() = j.customer_id)) then
    raise exception 'ไม่มีสิทธิ์';
  end if;
  unlocked := j.payment_status in ('ไม่เรียกเก็บเงิน', 'ชำระเงินแล้ว') or j.unlock_all;
  if not unlocked then raise exception 'ใบงานนี้ยังไม่ได้ชำระเงิน'; end if;
  tok := j.share_token;
  if tok is null or tok = '' then
    tok := replace(gen_random_uuid()::text, '-', '');
    update jobs set share_token = tok where id = p_job_id;
  end if;
  return tok;
end;
$$;

revoke all on function public.job_share_token(text) from public, anon;
grant execute on function public.job_share_token(text) to authenticated;
