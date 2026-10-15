-- task: TASK-37.2
-- rollback: update app.app_config set value = value - 'prodajam' - 'prodajamo' - 'podarjam' - 'oddajam' - 'oddajamo' - 'v dobre roke' - 'sells' - 'rehomed' - 'rehomes' where key = 'ads.blocked_terms';
-- TASK-35.1 review: more SL and EN keywords for the C14 content rule (no ad may sell, give away or rehome animals).
-- Data only: appends the terms the list does not have yet, so terms admins added or removed since are kept; a value
-- that is not a JSON array is left alone. Inserts the row when it is missing.
insert into app.app_config (key, value, is_public, description, updated_at) values
    ('ads.blocked_terms', '["prodajam", "prodajamo", "podarjam", "oddajam", "oddajamo", "v dobre roke", "sells", "rehomed", "rehomes"]', false, 'Ad keywords refused on save and never served (C14 content rule), SL and EN', now())
on conflict (key) do update
set value = app.app_config.value || coalesce(
        (select jsonb_agg(term order by n)
         from jsonb_array_elements(excluded.value) with ordinality as added(term, n)
         where not app.app_config.value @> jsonb_build_array(term)),
        '[]'::jsonb),
    updated_at = now()
where jsonb_typeof(app.app_config.value) = 'array';
