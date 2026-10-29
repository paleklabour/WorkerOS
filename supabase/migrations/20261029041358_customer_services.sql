-- บริการที่นายจ้างรายนี้ใช้กับเรา (ติ๊กในฟอร์มนายจ้าง) — ฟอร์มเปิดใบงานไฮไลต์ประเภทงานเหล่านี้เป็นสีเขียว (เจ้าของระบบ 2026-10-29)
alter table public.customers add column if not exists services text[] not null default '{}';
