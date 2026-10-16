---
id: TASK-29.12
title: >-
  Mobile lost flow: VALIDATION on photo_ids, location or radius does not go back
  to its step
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 09:01'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-29
ordinal: 356000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Linked: TASK-29 AC#6 (errors specific, form keeps input). Steps: mobile lost flow, API answers 400 VALIDATION with issue path photo_ids (or location). Expected: edit(target step) like apps/web/components/report-lost/lost-flow.tsx failed(). Actual: apps/mobile/components/report-lost/lost-flow.tsx failed() only maps reward_note and event_at; other paths show a bare error on the review step pointing at nothing. Severity: low.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A VALIDATION issue on photo_ids opens the photos step, on location or radius_m the where step, on a step field that step, input kept, as the web flow does (jest test)
<!-- AC:END -->
