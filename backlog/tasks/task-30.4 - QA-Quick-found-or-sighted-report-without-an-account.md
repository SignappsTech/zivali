---
id: TASK-30.4
title: 'QA: Quick found or sighted report without an account'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-30.2
  - TASK-30.3
  - TASK-30.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P7-report-found.md
parent_task_id: TASK-30
priority: high
ordinal: 248000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-30 (Quick found or sighted report without an account) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-30 merged to main (TASK-30.2, TASK-30.3, TASK-30.1); leads add any later TASK-30 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a visitor on a phone, when they open Report found, then a short sequence (photo, location pre-filled from GPS or EXIF, I have the animal or I only saw it, optional note, optional contact email) completes in under 60 s median in usability testing.
- [ ] #2 Given an accepted submission, when saved, then the report is live, the finder gets a private manage link (and an email if given) and matching and alerts run.
- [ ] #3 Given I have the animal, when published, then the public location is where it was found (fuzzed) and where it is kept is never asked for or shown.
- [ ] #4 Given a lost listing, when a visitor taps I saw this pet, then a SIGHTED report is created linked to that lost report.
- [ ] #5 Given anonymous submissions over the limits, when received, then the safeguards from the anonymous-reporter story apply and the user sees a friendly message.
- [ ] #6 Given the flow, when it starts and when it is submitted, then report_found_start and report_found_submit fire (consent only) and no ad appears anywhere in the flow.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
