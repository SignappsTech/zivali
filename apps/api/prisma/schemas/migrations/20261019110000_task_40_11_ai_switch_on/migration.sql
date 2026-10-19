-- task: TASK-40.11
-- rollback: update app.app_config set value = 'null'::jsonb, updated_at = now() where key = 'ai.photos_since'; (stops all sending; in a new migration)
-- AI switch-on (TASK-40.7, owner 2026-10-19): the hosted database changes only through deploy migrations, so the
-- cutoff of the previous migration becomes the moment the deploy applies this one. Only while it is still unset
-- (JSON null): a cutoff already set is never moved, so a re-run or an older database keeps its value. Privacy
-- policy v0.8 ships in this deploy or an earlier one: every photo after the cutoff was uploaded under it.
update app.app_config set value = to_jsonb(now()), updated_at = now()
where key = 'ai.photos_since' and value = 'null'::jsonb;
