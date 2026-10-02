-- ลำดับบัญชีธนาคาร (ลากสลับได้ในแท็บ "บัญชีธนาคาร") — ลำดับเดียวกันทุกผู้ใช้
-- ใช้เรียงทั้งการ์ดบัญชี และรายการเลือกบัญชีทุกจุด (ออกบิล/รับเงิน/รายจ่าย/ค่าคอม)
alter table banks add column if not exists sort_order integer not null default 0;

-- บัญชีที่มีอยู่แล้ว: ตั้งลำดับเริ่มต้นตามชื่อธนาคาร
update banks b set sort_order = s.rn
from (select id, row_number() over (order by bank_name, id) as rn from banks) s
where b.id = s.id and b.sort_order = 0;
