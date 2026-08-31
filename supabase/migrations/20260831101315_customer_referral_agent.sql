-- ============================================================================
-- เพิ่มการติดตามว่าลูกค้า/นายจ้างรายนี้ถูก "แนะนำ/ส่งมา" โดย Agent คนไหน
-- (agents เดิมมีอยู่แล้วจาก 20260828034742_jobs_workflow_agents_openedby.sql
-- ใช้เป็น "ผู้ส่งงาน" บนใบงาน — คอลัมน์นี้ใช้ master list เดียวกัน แต่ผูกกับ
-- ลูกค้าแทน เพื่อรู้ว่าใครเป็นคนแนะนำลูกค้ารายนี้เข้ามาตั้งแต่แรก)
-- ============================================================================

alter table customers add column if not exists referred_by_agent_id text references agents(id) on delete set null;

create index if not exists idx_customers_referred_by_agent on customers(referred_by_agent_id);
