---
id: TASK-29.9
title: >-
  Mobile lost flow: keep the idempotency key on 5xx/429/network, re-key on a
  time edit, reset the duplicate choice on pet change
status: Done
assignee: []
created_date: '2026-10-16 05:00'
updated_date: '2026-10-16 05:40'
labels:
  - bug
  - mobile
dependencies: []
parent_task_id: TASK-29
priority: high
ordinal: 345000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found in the TASK-29.3 web review; the web code was copied from apps/mobile/components/report-lost/lost-flow.tsx (about lines 716-775), which has the same defects. (1) After a NETWORK failure, an edit to only the date/time compares equal (make(prev.at)), so the old key and old event_at are sent and the edit is lost. (2) The key is cleared on 5xx and 429, but the API stores neither, and createReport dedupes on submission_id = key, so a 502/504 after commit creates a second report and a second alerts fan-out. (3) The 409 duplicate choice is never reset, so after switching to another pet 'update' PATCHes the first pet's search. (4) No re-entry guard on publish. (7) report_lost_submit is tracked after a duplicate PATCH too. Mirror the web fix round of TASK-29.3 once it lands.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A NETWORK failure followed by a time-only edit sends a new Idempotency-Key and the new event_at (jest test)
- [ ] #2 The key survives NETWORK, 5xx and RATE_LIMITED, and is cleared only on a definitive 4xx or a body change; the duplicate choice applies only to the same pet; a second publish while one is in flight is ignored; report_lost_submit is tracked on create only (jest tests, full mobile suite green)
<!-- AC:END -->
