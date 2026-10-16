-- task: TASK-86.5
-- rollback: drop index app.reports_created_by_submission_id_key; alter table app.reports drop column submission_hash, drop column submission_id;
-- POST /v1/reports keeps the client's submission id (its Idempotency-Key: the mobile outbox id, C17) and a keyed hash
-- of the body with the report, so a repeat from the same creator after the 24 h replay window (C1) or after a
-- post-commit 5xx returns the report created then instead of a duplicate. No new table: RLS is already on.

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "submission_hash" TEXT,
ADD COLUMN     "submission_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "reports_created_by_submission_id_key" ON "reports"("created_by", "submission_id");
