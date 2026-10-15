-- task: TASK-38.2
-- rollback: delete from app.app_config where key in ('partners.pilot', 'partners.ga_enrichment');
-- C14 partner stats: `pilot` in GET /v1/partners/stats (the page shows the pilot note while it is true; an admin
-- switches it off after the pilot) and the optional GA Data API enrichment, off (the stats stay DB-only).
insert into app.app_config (key, value, is_public, description, updated_at) values
    ('partners.pilot', 'true', false, 'Partner stats report pilot status (C14 PartnerStats.pilot)', now()),
    ('partners.ga_enrichment', 'false', false, 'GA Data API enrichment of the partner stats (C14); off = DB-only', now())
on conflict (key) do nothing;
