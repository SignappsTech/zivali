-- task: TASK-40.11
-- rollback: delete from app.app_config where key = 'ai.photos_since';
-- Owner, 2026-10-19: only photos created after the AI switch-on ever go to Anthropic or Voyage (C19, C20 §Privacy).
-- The switch-on (TASK-40.7) sets the instant; until then the value is null and no photo is sent (fail closed).
insert into app.app_config (key, value, description) values
    ('ai.photos_since', 'null', 'AI switch-on instant (JSON string, ISO 8601 with Z or an offset, not before 2026-10-19): only photos created after it go to Anthropic or Voyage; null or invalid = none (C19, C20)')
on conflict do nothing;
