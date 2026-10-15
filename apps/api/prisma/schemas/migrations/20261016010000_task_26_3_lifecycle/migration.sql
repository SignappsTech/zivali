-- task: TASK-26.3
-- rollback: alter table app.reports drop column expiry_warned_at, drop column reminder_day; delete from app.app_config where key in ('lifecycle.reminder_days', 'lifecycle.lost_idle_days', 'lifecycle.found_idle_days', 'lifecycle.expiry_warning_days', 'lifecycle.reopen_days');
-- Report lifecycle (C4 status machine, report.lifecycle job): what the hourly job already sent per report, so a
-- reminder or an expiry warning goes out once, and the lifecycle.* timings.

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "expiry_warned_at" TIMESTAMPTZ(6),
ADD COLUMN     "reminder_day" SMALLINT;

insert into app.app_config (key, value, description) values
    ('lifecycle.reminder_days', '[7, 14, 30]', 'Days after creation when a LOST report''s managers get a reminder (C4)'),
    ('lifecycle.lost_idle_days', '90', 'Days without an owner update after which an open LOST report closes as expired (C4)'),
    ('lifecycle.found_idle_days', '30', 'Days without an update after which an open FOUND or SIGHTED report (not an organisation intake) closes as expired (C4)'),
    ('lifecycle.expiry_warning_days', '7', 'Days before the automatic close when the managers get report_expiring with the one-tap extend (C4, C10)'),
    ('lifecycle.reopen_days', '7', 'Days after closing or reuniting in which a manager can reopen the report (C4) and claim its manage link (C7)')
on conflict do nothing;
