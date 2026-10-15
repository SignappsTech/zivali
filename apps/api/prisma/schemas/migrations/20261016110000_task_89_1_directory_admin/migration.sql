-- task: TASK-89.1
-- rollback: alter table app.directory_changes drop column audit_note;
-- Directory admin (C18): the admin's note on each version, returned by GET /v1/admin/shelters/:slug/changes.

-- AlterTable
ALTER TABLE "directory_changes" ADD COLUMN     "audit_note" TEXT;
