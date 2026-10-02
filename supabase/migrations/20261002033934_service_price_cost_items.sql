-- ต้นทุนมาตรฐานต่อประเภทงาน (ภายในเท่านั้น ไม่พิมพ์ลงบิล) — คนละส่วนกับค่าธรรมเนียมรัฐที่เก็บแทน
-- เช่น ตี VISA → [{"name":"ค่าตรวจโรค","amount":500},{"name":"ค่าแปลเอกสาร","amount":300}]
-- กำไรต่องานโดยประมาณ = service_fee − ผลรวม amount (แสดงในแท็บ "ราคามาตรฐาน")
alter table service_prices add column if not exists cost_items jsonb not null default '[]'::jsonb;
