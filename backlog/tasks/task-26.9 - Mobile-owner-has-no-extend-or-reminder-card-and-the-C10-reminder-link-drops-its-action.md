---
id: TASK-26.9
title: >-
  Mobile: owner has no extend or reminder card, and the C10 reminder link drops
  its action
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 07:50'
labels:
  - bug
  - 'est:S'
dependencies: []
parent_task_id: TASK-26
ordinal: 354000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AC: TASK-26.5#1 (owner actions incl. extend, per web owner-actions.tsx Open and my-reports.tsx DeepAction), P14 reminder card, C10 report_reminder / report_expiring links. Steps: read apps/mobile/components/report/slots/slot-a.tsx (no extend/notice for owners; only anonymous /m has it) and apps/mobile/lib/deep-link.ts toTargetPath (/my-reports?r=X&action=close becomes /r/X, action discarded). Expected: web parity. Actual: a mobile owner tapping the reminder push lands on the report with no keep or extend control; extend is unavailable to signed-in mobile owners, so the 90-day auto-close warning cannot be answered in-app. Severity: medium.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a LOST report idle 7+ days or a FOUND report within 5 days of expiry, when the signed-in owner opens it on mobile, then the reminder or expiry note with Nadaljuj iskanje / Podaljsaj shows and its press sends extend only
- [ ] #2 Given /my-reports?r=<code>&action=keep|extend|close, when the app opens it, then keep/extend show the note and close opens the reason sheet, nothing sent until pressed
<!-- AC:END -->
