-- งาน "ไม่เรียกเก็บเงิน" (2026-10-06) — งานที่ตั้งใจไม่คิดเงินลูกค้า (แถม/แก้งานที่เราผิดเอง/รวมในบิลอื่นแล้ว ฯลฯ)
-- ไม่ต้องออกบิล 0 บาท: payment_status = 'ไม่เรียกเก็บเงิน' + เก็บเหตุผล/ใครกด/เมื่อไหร่ไว้ตรวจย้อนหลัง
-- ไม่ขึ้นเตือน "ปิดงานแล้ว ยังไม่ออกบิล" และไม่มีค่าคอม Agent — ดู isJobNoCharge() ใน app.js
-- กด/ยกเลิกได้เฉพาะ Admin และ Account Manager (can_finance) — บังคับด้วย trigger ด้านล่าง

alter table public.jobs add column if not exists no_charge_reason text;
alter table public.jobs add column if not exists no_charge_by     uuid references public.profiles(id) on delete set null;
alter table public.jobs add column if not exists no_charge_at     timestamptz;

-- ขยาย check ของ payment_status (constraint สร้างแบบ inline ใน 20260828034742 จึงหาชื่อจากระบบแทนการเดาชื่อ)
do $$
declare c text;
begin
  for c in
    select con.conname from pg_constraint con
    where con.conrelid = 'public.jobs'::regclass and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%payment_status%'
  loop
    execute format('alter table public.jobs drop constraint %I', c);
  end loop;
end $$;

alter table public.jobs add constraint jobs_payment_status_check
  check (payment_status in ('ยังไม่ออกบิล', 'ออกบิลแล้ว', 'ชำระเงินแล้ว', 'ไม่เรียกเก็บเงิน'));

-- คนที่ไม่มีสิทธิ์การเงินแก้ใบงานได้ตามปกติ แต่ห้ามเปลี่ยนสถานะ "ไม่เรียกเก็บเงิน" เอง
create or replace function public.guard_job_no_charge() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if can_finance() then return new; end if;
  if tg_op = 'INSERT' then
    if new.payment_status = 'ไม่เรียกเก็บเงิน' or new.no_charge_at is not null then
      raise exception 'เฉพาะ Admin / Account Manager เท่านั้นที่ตั้งงานเป็น "ไม่เรียกเก็บเงิน" ได้';
    end if;
    return new;
  end if;
  if (new.payment_status = 'ไม่เรียกเก็บเงิน') is distinct from (old.payment_status = 'ไม่เรียกเก็บเงิน')
     or new.no_charge_reason is distinct from old.no_charge_reason
     or new.no_charge_by     is distinct from old.no_charge_by
     or new.no_charge_at     is distinct from old.no_charge_at then
    raise exception 'เฉพาะ Admin / Account Manager เท่านั้นที่เปลี่ยนสถานะ "ไม่เรียกเก็บเงิน" ได้';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_job_no_charge on public.jobs;
create trigger trg_guard_job_no_charge before insert or update on public.jobs
  for each row execute function public.guard_job_no_charge();
