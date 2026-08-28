alter table public.customers
  add column if not exists attachments jsonb default '{}'::jsonb;

comment on column public.customers.attachments is
  'เอกสารแนบของนายจ้าง/บริษัท เช่น บัตรประชาชนนายจ้าง หนังสือรับรองบริษัท ทะเบียนบ้าน ฯลฯ — เก็บเป็น jsonb keyed ด้วย docType เหมือน workers.attachments (คนละคอลัมน์ ก่อนหน้านี้ไม่มีเลย ทำให้ไฟล์ที่อัปโหลดแล้วไม่เคยถูกผูกกับข้อมูลลูกค้าจริง)';
