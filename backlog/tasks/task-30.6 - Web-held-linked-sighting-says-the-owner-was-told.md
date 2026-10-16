---
id: TASK-30.6
title: 'Web: held linked sighting says the owner was told'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 07:31'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-30
ordinal: 353000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: web /report/found?type=sighted&linked_report_id=<lost id>&code=<code>, finish the 3 steps, API answers moderation_state=held. Expected (AC TASK-30.4 #7 held wording, mobile parity): held_note. Actual: apps/web/components/report-found/found-done.tsx line 56 ignores 'held' when linked, so it says 'Osebo, ki zival isce, smo obvestili' although a held report notifies nobody. Severity: medium (false statement to the finder). Test: found-flow.test.tsx 'a held linked sighting says it is being checked' (it.fails, remove .fails on fix).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A held linked sighting on web shows held_note (being checked, link already works), not sighting_done_body
<!-- AC:END -->
