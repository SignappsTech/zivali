---
id: TASK-26.11
title: >-
  API: story consent on lost reports (C4 PUT /v1/reports/:code/story-consent;
  CH-340)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:29'
labels:
  - be
  - 'est:S'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C4-reports-and-pets.md§REST
parent_task_id: TASK-26
priority: medium
ordinal: 477200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision CH-340: the P14 story switch (A-023, explicit opt-in, withdrawable) is stored on the report. One endpoint sets and withdraws it, also after the report is reunited (PATCH answers GONE then).

## Packet
Unblocks on: -
Branch: agent/task-26.11-story-consent-api
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Migration adds `reports.story_consent_at timestamptz null`; `PUT /v1/reports/:code/story-consent { consent: boolean }` by the owner-role manager of a lost report (any status except removed) sets it to now() or null and answers `ReportOwnerView` with `story_consent_at`
- [ ] #2 Errors: FORBIDDEN (not the owner manager), VALIDATION (not a lost report), GONE (removed), NOT_FOUND; route tests
- [ ] #3 Data inventory lists the column; openapi.json regenerated and `gen:api` run
<!-- AC:END -->
