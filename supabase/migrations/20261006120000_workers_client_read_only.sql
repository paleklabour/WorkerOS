-- บัญชีนายจ้าง (client) ดูข้อมูล/แฟ้มเอกสารคนงานของบริษัทตัวเองได้อย่างเดียว (เจ้าของระบบกำหนด 2026-10-06)
-- เดิม workers_write / workers_update ให้ client เพิ่ม/แก้คนงานของบริษัทตัวเองได้ทั้งแถว (รวมรายการไฟล์แนบ)
-- ทั้งที่พอร์ทัลไม่มีหน้าไหนต้องเขียน — โน้ตถึงเจ้าหน้าที่ยังเขียนได้ผ่าน set_my_worker_note() (security definer, แก้ได้แค่โน้ต)
-- เหลือสิทธิ์เขียนเฉพาะฝ่ายปฏิบัติการ can_ops() = admin / operation_manager / staff (เหมือน 20261002042034_roles_gm_am_om_staff.sql)

drop policy if exists workers_write on workers;
create policy workers_write on workers for insert with check (can_ops());

drop policy if exists workers_update on workers;
create policy workers_update on workers for update using (can_ops());
