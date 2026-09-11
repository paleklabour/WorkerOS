-- ช่อง "ลบไฟล์" ในแฟ้มเอกสารคนงาน/นายจ้าง (deleteFolderFileIndex / deleteCustomerFolderFileIndex ใน app.js)
-- เดิมลบได้แค่ reference ใน workers.attachments / customers.attachments (jsonb) — ไฟล์จริงใน Storage
-- bucket "worker-documents" ยังค้างอยู่ตลอดไป เพราะ bucket นี้มีแค่ policy SELECT/INSERT/UPDATE
-- (worker_documents_authenticated_*) ไม่มี policy DELETE เลย ทำให้ storage.remove() ของ Supabase
-- ส่งกลับ success แบบเงียบๆ (data: [], error: null) โดยไม่ได้ลบไฟล์จริง
-- เพิ่ม policy DELETE ให้สิทธิ์ตรงกับที่แก้ไขข้อมูล workers/customers ได้อยู่แล้ว (admin/manager เท่านั้น)
create policy "worker_documents_authenticated_delete"
  on storage.objects for delete
  using (bucket_id = 'worker-documents' and my_role() in ('admin', 'manager'));
