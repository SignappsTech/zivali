-- task: TASK-17.1
-- rollback: drop index app.photos_sha256_idx; drop index app.reports_device_hash_created_at_idx; drop index app.reports_manage_token_hash_key; alter table app.reports drop column device_hash; delete from app.app_config where key in ('rate.anon_report_per_hour', 'rate.anon_report_per_day');
-- Anonymous reporter safeguards (C7): the device hash behind the 7-day hold rule, the manage token lookup for
-- POST /v1/manage/claim, the same-image lookup across owners (photo hold rule) and the anonymous submission limits
-- (per IP and per device).

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "device_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "reports_manage_token_hash_key" ON "reports"("manage_token_hash");

-- CreateIndex
CREATE INDEX "reports_device_hash_created_at_idx" ON "reports"("device_hash", "created_at");

-- CreateIndex
CREATE INDEX "photos_sha256_idx" ON "photos"("sha256");

insert into app.app_config (key, value, description) values
    ('rate.anon_report_per_hour', '5', 'Reports an anonymous finder may send per hour, per IP and per device (C7)'),
    ('rate.anon_report_per_day', '20', 'Reports an anonymous finder may send per day, per IP and per device (C7)')
on conflict do nothing;
