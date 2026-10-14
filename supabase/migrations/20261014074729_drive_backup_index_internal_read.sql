-- ปุ่ม "เปิดใน Google Drive" ในแฟ้มคนงาน/นายจ้าง ให้ผู้ใช้ภายในทุกตำแหน่งเห็น (ไม่ใช่แค่ admin) — owner 2026-10-14
-- อ่านได้แค่ดัชนีไฟล์/โฟลเดอร์ (path ↔ drive id) ลูกค้า (client) ยังอ่านไม่ได้; ตาราง runs / การสั่งสำรองยังเป็นของ admin
drop policy if exists drive_backup_folders_admin_read on drive_backup_folders;
drop policy if exists drive_backup_files_admin_read on drive_backup_files;
create policy drive_backup_folders_internal_read on drive_backup_folders for select using (is_internal());
create policy drive_backup_files_internal_read on drive_backup_files for select using (is_internal());
