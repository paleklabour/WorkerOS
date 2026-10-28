-- บัญชีนายจ้าง (client) เขียนไฟล์ใน worker-documents ได้เฉพาะแท็บ "ขึ้นทะเบียน" ในพอร์ทัล (owner 2026-10-28)
-- เดิม: ใครล็อกอินแล้วก็อัปโหลด/เขียนทับไฟล์ได้ทุกโฟลเดอร์ รวมถึงไฟล์ของนายจ้างรายอื่น
-- client เขียนได้แค่:
--   <customer ของตัวเอง>/<คนงาน>/...  เมื่อคนงานยังไม่มีในระบบ (กำลังส่งรายชื่อใหม่) หรือยังอยู่ในรอขึ้นทะเบียนของตัวเอง
--     (เงื่อนไขเดียวกับ client_save_pending_worker)
--   avatars/<user id ของตัวเอง>/...  (รูปโปรไฟล์ตัวเอง)
-- เจ้าหน้าที่ (is_internal) เขียนได้เหมือนเดิม; การลบยังเป็น Admin / Operation Manager เท่านั้น

create or replace function public.client_can_write_storage(p_name text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select my_role() = 'client'
     and (
       (split_part(p_name, '/', 1) = 'avatars' and split_part(p_name, '/', 2) = auth.uid()::text)
       or (
         my_customer_id() is not null
         and split_part(p_name, '/', 1) = my_customer_id()
         and split_part(p_name, '/', 2) ~ '^work-[0-9a-z]+$'
         and not exists (
           select 1 from workers w
           where w.id = split_part(p_name, '/', 2)
             and (w.employer_id is distinct from my_customer_id()
                  or w.status <> 'pending_register'
                  or w.registration_round_id is not null)
         )
       )
     );
$$;

revoke execute on function public.client_can_write_storage(text) from public, anon;
grant execute on function public.client_can_write_storage(text) to authenticated;

drop policy if exists worker_documents_authenticated_write on storage.objects;
create policy worker_documents_authenticated_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'worker-documents' and (is_internal() or client_can_write_storage(name)));

drop policy if exists worker_documents_authenticated_update on storage.objects;
create policy worker_documents_authenticated_update on storage.objects
  for update to authenticated
  using (bucket_id = 'worker-documents' and (is_internal() or client_can_write_storage(name)))
  with check (bucket_id = 'worker-documents' and (is_internal() or client_can_write_storage(name)));
