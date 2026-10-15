-- task: TASK-14.1
-- rollback: alter table app.photos drop column updated_at;
-- Photos (C5): updated_at is the 24 h purge clock of unattached photos (retention.purge); POST /v1/photos answering
-- `existing: true` touches it (CH-134). Existing rows start the clock now.

-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
