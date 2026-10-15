
## Packet

Branch: agent/task-6.16-report-fks

AC#2 deviation (accepted by the lead): ads.species is app."SPECIES"[] with no non-null check. House ads store NULL (= every species), so a not-null check fails the migration; the enum is the only constraint. The non-null, non-empty check belongs to alert_subscriptions.species, which stays text[] (not part of this task). The migration also adds the matches.lost_report_id / other_report_id FKs promised in the 6.7 migration header.
