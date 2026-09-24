-- หนังสือรับรองบริษัท (จากกรมพัฒนาธุรกิจการค้า) ไม่มีวันหมดอายุพิมพ์ไว้ในเอกสารจริง มีแค่ "วันที่ออก"
-- ทีมงานใช้กฎอายุการใช้งานเอง (ออกไม่เกิน 6 เดือนถึงใช้ยื่นได้) จึงเก็บวันที่ออกจาก OCR แล้วคำนวณวันหมดอายุ
-- โดยประมาณเก็บไว้เป็นคอลัมน์แยก เพื่อให้แจ้งเตือน/ค้นหาได้เหมือนวันหมดอายุพาสปอร์ต/ใบอนุญาตทำงานของคนงาน
alter table customers
  add column if not exists cert_issue_date date,
  add column if not exists cert_expiry date;

comment on column public.customers.cert_issue_date is
  'วันที่ออกหนังสือรับรองบริษัท อ่านจาก OCR (ocr-document) ตอนแนบไฟล์ cust-cert';
comment on column public.customers.cert_expiry is
  'วันหมดอายุโดยประมาณของหนังสือรับรองบริษัท = cert_issue_date + 6 เดือน (คำนวณฝั่ง client ตอนบันทึก ไม่ได้พิมพ์อยู่ในเอกสารจริง)';

create index if not exists idx_customers_cert_expiry on customers(cert_expiry);
