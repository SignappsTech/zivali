-- task: TASK-114.33
-- rollback: delete from app.app_config where key = 'retention.purge_live';
-- The retention.purge steps added by TASK-114.33 (email_outbox, partner_stats_snapshot, leads, abuse_reports,
-- moderation_flags, reports) only count and roll back until this is true; the steps that purged before stay live. The
-- lead sets it to true after checking the staging counts in the job log.
insert into app.app_config (key, value, is_public, description)
values ('retention.purge_live', 'false', false, 'true = retention.purge also deletes the TASK-114.33 classes (email_outbox, partner stats, leads, abuse reports, moderation flags, reports); otherwise it only logs their counts (C1)')
on conflict (key) do nothing;
