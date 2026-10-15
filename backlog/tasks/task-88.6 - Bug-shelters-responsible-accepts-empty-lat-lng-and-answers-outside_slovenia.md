---
id: TASK-88.6
title: 'Bug: /v1/shelters/responsible accepts empty lat/lng and answers outside_slovenia'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-15 14:20'
labels:
  - bug
  - be
  - 'est:XS'
dependencies: []
references:
  - docs/tech/contracts/C18-shelter-directory.md
parent_task_id: TASK-88
priority: low
ordinal: 322000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From QA TASK-88.4. Steps: GET /v1/shelters/responsible?lat=&lng=. Expected: 400 VALIDATION, same as missing params. Actual: 200 {"status":"outside_slovenia"}, cached 1 h: the empty strings are coerced to 0. Severity: low (a client bug would silently tell the user they're outside Slovenia).

## Packet

Branch: agent/TASK-88.4-tests (QA's branch with apps/api/test/routes/shelters.qa.test.ts; its it.fails documents this bug)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ResponsibleShelterQuery in @zivali/validation rejects empty strings for lat and lng (400 VALIDATION); other coerced-number queries checked for the same pattern
- [ ] #2 The it.fails in shelters.qa.test.ts becomes a passing it; the QA test file merges with the fix
<!-- AC:END -->
