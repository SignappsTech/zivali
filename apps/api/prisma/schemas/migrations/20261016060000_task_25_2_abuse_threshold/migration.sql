-- task: TASK-25.2
-- rollback: delete from app.app_config where key = 'abuse.auto_hide_threshold';
-- Abuse reports (C11): the weighted open-report sum at which a listing is hidden automatically.

insert into app.app_config (key, value, description) values
    ('abuse.auto_hide_threshold', '3', 'Weighted open abuse reports (1.0, or 0.5 from accounts younger than 24 h) that hide a listing (C11)')
on conflict do nothing;
