-- เปิดตั้งเวลาสำรองลง Google Drive ทุกชั่วโมง — apply หลัง deploy ฟังก์ชัน drive-backup และตั้ง secrets แล้วเท่านั้น

-- ตั้งเวลาเรียก Edge Function ทุกชั่วโมง (นาทีที่ 20) — secret ของ cron เก็บใน Vault ชื่อ drive_backup_cron_secret
-- (สร้างแยกตอน deploy: select vault.create_secret('<สุ่มยาว ๆ>', 'drive_backup_cron_secret');
--  และตั้งค่าเดียวกันเป็น secret ของฟังก์ชัน: supabase secrets set DRIVE_BACKUP_CRON_SECRET=<ค่าเดียวกัน>)
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('drive-backup-hourly') where exists (select 1 from cron.job where jobname = 'drive-backup-hourly');
select cron.schedule(
  'drive-backup-hourly',
  '20 * * * *',
  $$
  select net.http_post(
    url := 'https://cagpzvrqtjkuabhqaqon.supabase.co/functions/v1/drive-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'drive_backup_cron_secret')
    ),
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);
