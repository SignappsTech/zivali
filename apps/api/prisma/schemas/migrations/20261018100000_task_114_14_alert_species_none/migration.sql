-- task: TASK-114.14
-- rollback: update app.alert_subscriptions set species = array['dog', 'cat']::text[], paused = true where cardinality(species) = 0; alter table app.alert_subscriptions drop constraint alert_subscriptions_species_check; alter table app.alert_subscriptions add constraint alert_subscriptions_species_check check (species is not null and cardinality(species) > 0 and species <@ array['dog', 'cat']::text[]);
-- Nearby alerts: every animal can be switched off. An empty list is allowed and matches no report, so it sends no
-- alert (`= any(species)` is false for '{}'). No new table: RLS is already on.
alter table app.alert_subscriptions drop constraint alert_subscriptions_species_check;
alter table app.alert_subscriptions
	add constraint alert_subscriptions_species_check check (species is not null and species <@ array['dog', 'cat']::text[]);
