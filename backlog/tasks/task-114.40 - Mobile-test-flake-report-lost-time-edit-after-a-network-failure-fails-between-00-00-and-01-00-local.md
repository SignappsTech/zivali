---
id: TASK-114.40
title: >-
  Mobile test flake: report-lost 'time edit after a network failure' fails
  between 00:00 and 01:00 local
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 22:41'
labels:
  - bug
  - fe
  - 'est:XS'
  - trivial
  - no-design
dependencies: []
references:
  - apps/mobile/__tests__/report-lost.test.tsx
parent_task_id: TASK-114
priority: high
ordinal: 402200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
apps/mobile/__tests__/report-lost.test.tsx ~587-603 enters the date '1. 1. 2020' and keeps the current local time, then expects event_at (UTC) to match /^2020-01-01/. Between 00:00 and 01:00 Europe/Ljubljana (UTC+1 in January) the UTC value is 2019-12-31T23:xx, so the test fails (seen 2026-10-19 00:37, main red after the TASK-40.2 merge, unrelated). Make it time-of-day independent without weakening it: set a fixed time in the form too, or freeze the clock (jest fake timers / setSystemTime) for this test, or assert the local calendar date of event_at. Check the same file and the web report-lost tests for the same pattern.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The test passes with the system clock at 00:30 and 23:30 local (fake timers or TZ), and still fails if event_at keeps the old date
<!-- AC:END -->
