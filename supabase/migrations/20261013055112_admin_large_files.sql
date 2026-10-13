-- รายการไฟล์ขนาดใหญ่ผิดปกติใน Storage (owner, 2026-10-13) — ใช้กับเครื่องมือ "ย่อขนาดไฟล์ใหญ่" ในหน้าสำรองข้อมูล (Admin)
-- backed_up = มีสำเนาต้นฉบับใน Google Drive แล้ว (drive-backup ไม่อัปโหลดทับเมื่อเนื้อไฟล์เปลี่ยน → ต้นฉบับยังอยู่ใน Drive)
create or replace function admin_large_files(p_min_bytes bigint default 2097152)
returns table (name text, bytes bigint, mime text, created_at timestamptz, backed_up boolean)
language sql stable security definer set search_path = public, storage as $$
  select o.name, (o.metadata->>'size')::bigint, o.metadata->>'mimetype', o.created_at,
         exists (select 1 from public.drive_backup_files d where d.source_key = o.name and not d.deleted)
  from storage.objects o
  where o.bucket_id = 'worker-documents'
    and (o.metadata->>'size')::bigint >= p_min_bytes
    and public.my_role() = 'admin'
  order by (o.metadata->>'size')::bigint desc;
$$;

revoke execute on function admin_large_files(bigint) from public, anon;
grant execute on function admin_large_files(bigint) to authenticated;
