---
id: TASK-13.4
title: 'QA: Consent banner and preferences (web and mobile)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-0
dependencies:
  - TASK-13.2
  - TASK-13.3
  - TASK-13.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P17-consent.md
parent_task_id: TASK-13
priority: high
ordinal: 231000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-13 (Consent banner and preferences (web and mobile)) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-13 merged to main (TASK-13.2, TASK-13.3, TASK-13.1); leads add any later TASK-13 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a first web visit or first mobile launch, when the page or app loads, then a banner or sheet in the user language offers Accept all, Reject all and Customise with equal visual weight and nothing pre-selected.
- [ ] #2 Given the user rejects or ignores the banner, when browsing, then only strictly necessary storage is used and Consent Mode signals stay denied.
- [ ] #3 Given the user accepts, when the choice is stored, then the record holds choice, version and timestamp, applies to analytics adapters at once and persists across sessions.
- [ ] #4 Given any page or the app settings, when the user opens Cookie settings, then they can change or withdraw consent as easily as they gave it.
- [ ] #5 Given keyboard and screen reader use, when the banner appears, then it is labelled, focus-managed and meets WCAG 2.2 AA.
- [ ] #6 Given the consent version changes (new vendor or purpose) or 12 months pass, when the user returns, then consent is requested again.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
