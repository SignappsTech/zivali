---
id: TASK-25.6
title: 'QA: Report a listing, message or user'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-25.2
  - TASK-25.3
  - TASK-25.4
  - TASK-25.5
  - TASK-25.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P10-report-abuse.md
  - docs/design/pages/P19-admin-shell.md
parent_task_id: TASK-25
priority: medium
ordinal: 243000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-25 (Report a listing, message or user) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-25 merged to main (TASK-25.2, TASK-25.3, TASK-25.4, TASK-25.5, TASK-25.1); leads add any later TASK-25 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a listing or profile, when a user taps Report abuse, then they pick a reason (scam, fake, spam, inappropriate image, other), add an optional note and submit, and anonymous visitors can report listings too (rate limited).
- [x] #2 Given a submitted report, when stored, then it links to the target with reason and reporter, a confirmation is shown and duplicates from the same user are ignored.
- [x] #3 Given 3 independent abuse reports on one listing (default), when received, then the listing is hidden from public view pending review and the owner is told.
- [x] #4 Given a chat message report from the chat screen, when submitted, then the same abuse model is used.
- [x] #5 Given flags, when stored, then moderators can read them through the admin shell until the full queue exists (M4).
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
  - QA note: verify, e2e, Lighthouse: merge queue on main at e2457eef. Local: web vitest (abuse, admin, matches, chat, report) and mobile jest (report-abuse, report-detail) green; i18n check OK.
<!-- AC:END -->
