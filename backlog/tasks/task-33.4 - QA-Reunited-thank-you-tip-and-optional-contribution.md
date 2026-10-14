---
id: TASK-33.4
title: 'QA: Voluntary support: Pomagajte nam izboljšati Najdimo'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-14 22:17'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-33.2
  - TASK-33.3
  - TASK-33.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P15-support-moments.md
parent_task_id: TASK-33
priority: medium
ordinal: 251000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-33 (Reunited thank-you tip and optional contribution) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-33 merged to main (TASK-33.2, TASK-33.3, TASK-33.1); leads add any later TASK-33 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an owner who just marked a pet reunited, when the thank-you screen shows, then one-tap amounts EUR 3, EUR 5 (highlighted, not pre-selected), EUR 10 and a custom amount (minimum EUR 2) are offered and Skip is as visible as Pay.
- [ ] #2 Given the lost-report confirmation screen, when shown, then the same optional support ask is collapsed by default, nothing is pre-selected and it is not shown again for that report once skipped.
- [ ] #3 Given the profile screen on web and mobile, when opened, then a Pomagajte nam izboljšati Najdimo card offers the same amounts and the monthly Podpornik option (FR-022), with no nagging or repeated prompts.
- [ ] #4 Given a completed contribution, when recorded, then the user sees a warm thank-you, a receipt email arrives and donation fires with an amount bucket and no personal data (consent only).
- [ ] #5 Given the wording, when displayed, then it says support or contribution (podpora, prispevek) and not charitable donation unless the legal entity allows it (FR-024).
- [ ] #6 Given the user ignores any ask, when continuing, then nothing blocks or delays their report, matching or alerts.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
