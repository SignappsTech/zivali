-- task: TASK-19.4
-- rollback: delete from app.app_config where key = 'matching.lead_hours';
-- Matching lead window (C8 §Engine 2, owner decision 2026-10-20), read through lib/config-store.ts; a value an admin
-- already set stays.
insert into app.app_config (key, value, description) values
    ('matching.lead_hours', '48', 'Hours before the loss in which a found or sighted report still matches (C8)')
on conflict do nothing;
