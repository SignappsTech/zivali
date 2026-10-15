---
id: TASK-6.16
title: 'Schema follow-up: report FKs on collab and commerce tables, ads.species as SPECIES[]'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-15 12:55'
labels:
  - be
  - 'est:XS'
dependencies:
  - TASK-6.6
  - TASK-6.7
  - TASK-6.8
references:
  - docs/tech/backend.md
parent_task_id: TASK-6
priority: high
ordinal: 320000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-6.7/6.8 review. 6.7 and 6.8 were built before the reports table (6.6) existed, so their report references are plain uuids. Once all three are on main, add the FKs with the on-delete the retention purge expects, and type ads.species with the SPECIES enum. Seed the intake FOUND report deferred from TASK-6.8 AC#3.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 conversations.*_report_id and alert_deliveries.report_id reference reports with ON DELETE CASCADE (same as retention.purge); a test deletes a report and sees the rows go
- [ ] #2 ads.species is SPECIES[] (non-null, non-empty check kept)
- [ ] #3 The intake FOUND report from TASK-6.8 AC#3 is seeded; seeders stay safe when 00-users is skipped
- [ ] #4 prisma migrate diff --from-migrations --to-schema is empty; migration verified on a scratch DB only
<!-- AC:END -->

## Packet

Branch: agent/task-6.16-report-fks

AC#2 deviation (accepted by the lead): ads.species is app."SPECIES"[] with no non-null check. House ads store NULL (= every species), so a not-null check fails the migration; the enum is the only constraint. The non-null, non-empty check belongs to alert_subscriptions.species, which stays text[] (not part of this task). The migration also adds the matches.lost_report_id / other_report_id FKs promised in the 6.7 migration header.
