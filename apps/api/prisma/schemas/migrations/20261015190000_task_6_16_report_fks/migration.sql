-- task: TASK-6.16
-- rollback: alter table app.ads alter column species type text[] using species::text[];
--   alter table app.ads add constraint ads_species_check check (species <@ array['dog', 'cat']);
--   alter table app.matches drop constraint matches_lost_report_id_fkey, drop constraint matches_other_report_id_fkey;
--   alter table app.conversations drop constraint conversations_lost_report_id_fkey, drop constraint conversations_other_report_id_fkey,
--   drop constraint conversations_about_report_id_fkey; alter table app.alert_deliveries drop constraint alert_deliveries_report_id_fkey;
-- Follow-up to TASK-6.7 / TASK-6.8 now that app.reports (TASK-6.6) exists: foreign keys to reports (ON DELETE CASCADE,
-- as retention.purge expects) and ads.species as app."SPECIES"[]. Orphan rows (none expected) are removed first.
-- alert_subscriptions.species stays text[] (its own non-empty check); not part of this task.

-- Orphans: matches (and, via match_id SET NULL, nothing else), conversations (messages and participants cascade), deliveries.
do $$
declare n_matches int; n_conversations int; n_deliveries int;
begin
	delete from app.matches m
	where not exists (select 1 from app.reports r where r.id = m.lost_report_id)
		or not exists (select 1 from app.reports r where r.id = m.other_report_id);
	get diagnostics n_matches = row_count;
	delete from app.conversations c
	where not exists (select 1 from app.reports r where r.id = c.about_report_id)
		or (c.lost_report_id is not null and not exists (select 1 from app.reports r where r.id = c.lost_report_id))
		or (c.other_report_id is not null and not exists (select 1 from app.reports r where r.id = c.other_report_id));
	get diagnostics n_conversations = row_count;
	delete from app.alert_deliveries d where not exists (select 1 from app.reports r where r.id = d.report_id);
	get diagnostics n_deliveries = row_count;
	raise notice 'TASK-6.16 orphans removed: matches %, conversations %, alert_deliveries %', n_matches, n_conversations, n_deliveries;
end $$;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_lost_report_id_fkey" FOREIGN KEY ("lost_report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_other_report_id_fkey" FOREIGN KEY ("other_report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lost_report_id_fkey" FOREIGN KEY ("lost_report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_other_report_id_fkey" FOREIGN KEY ("other_report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_about_report_id_fkey" FOREIGN KEY ("about_report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ads.species: text[] ('dog' | 'cat' check) -> SPECIES[]; the enum rejects other values. NULL or empty still means every species (house ads store NULL).
alter table app.ads drop constraint ads_species_check;
alter table app.ads alter column species type app."SPECIES"[] using species::app."SPECIES"[];
