---
id: TASK-19.4
title: >-
  Matching: a found or sighted report may be up to 48 h before the loss (was 12
  h), as app_config matching.lead_hours
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-20 13:19'
updated_date: '2026-10-20 15:27'
labels:
  - be
  - 'est:S'
dependencies: []
references:
  - docs/tech/contracts/C8-matching.md
  - docs/tech/backend.md
parent_task_id: TASK-19
priority: high
ordinal: 530200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner decision 2026-10-20. The geo candidate join (apps/api/domains/matching/matching.dao.ts:61) only pairs o.event_at between l.event_at - interval '12 hours' and l.event_at + max_days. Owners often report a day late and leave 'last seen' at the time they report, so a finder's report from the evening before never matches (seen on najdimo.si: the 09:15 lost cat missed the found cats of the previous afternoon). Make the lead a config value like max_distance_km / max_days: app_config matching.lead_hours, default 48, seeded by a migration the same way the matching.* defaults were (migration 20261015151957), read in matching.domain.ts with the other limits, and used in the SQL as a parameter (no string interpolation of untrusted values). Chip matches stay time-independent. Update the doc comment at matching.dao.ts:51. Contract text in docs/tech/contracts/C8-matching.md goes through a CHANGE row (owner tech-lead). Also say in NOTES how open reports get re-matched after the deploy (existing rematch job, admin action or worker schedule) so the existing staging reports pick up the wider window; don't run anything against a hosted DB.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A found report 40 h before the lost report's event_at (same species, within max_distance_km) becomes a candidate; one 50 h before does not; an API/domain test covers both and the existing 12 h test cases are updated
- [x] #2 matching.lead_hours is an app_config value with default 48 seeded by a migration; changing it changes the window without a deploy (test)
- [x] #3 CHANGE row for C8-matching.md with the new rule; NOTES name the way to re-match open reports after the deploy
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Re-match after deploy: no bulk re-match exists (seeder 40-matching-rescore only re-scores stored suggestions, never inserts). New or edited reports run match.report on either side, so the 48 h window applies to them at once. Existing open staging pairs: a person queues match.report per open lost report (pnpm --filter api jobs:send match.report '{"report_id":"<uuid>"}'), or a follow-up one-off seeder queues it for all open/matched lost reports. Newly found good+ pairs notify the managers once.

Owner decision 2026-10-20: no one-off re-match of the reports that existed before the deploy; the 48 h window applies to reports created or edited from now on.
<!-- SECTION:NOTES:END -->

## Packet

Branch: agent/TASK-19.4-matching-lead-hours
