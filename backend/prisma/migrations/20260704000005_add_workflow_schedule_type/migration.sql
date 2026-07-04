-- EPIC9-HERMES-SCHEDULER-001: lịch tự động cho WorkflowRule.
-- MANUAL (mặc định) = không tự chạy; DAILY/WEEKLY/MONTHLY = scheduler dispatch theo kỳ.
ALTER TABLE "workflow_rules"
  ADD COLUMN "schedule_type" VARCHAR(20) NOT NULL DEFAULT 'MANUAL';
