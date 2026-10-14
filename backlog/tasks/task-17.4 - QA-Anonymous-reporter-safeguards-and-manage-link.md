---
id: TASK-17.4
title: 'QA: Anonymous reporter safeguards and manage link'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-17.1
  - TASK-17.2
  - TASK-17.3
references:
  - docs/tech/frontend.md
  - docs/design/pages/P7-report-found.md
parent_task_id: TASK-17
priority: high
ordinal: 235000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-17 (Anonymous reporter safeguards and manage link) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-17 merged to main (TASK-17.1, TASK-17.2, TASK-17.3); leads add any later TASK-17 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an anonymous submission, when received, then it needs a valid captcha token (privacy-friendly provider chosen in the TDD) and is rate limited per IP and device (default 5 per hour, 20 per day, configurable) with a friendly error.
- [ ] #2 Given a created report, when the finder returns through the secret manage link (high entropy, invalid after close), then they can edit, close or mark returned and open chat on any device without an account.
- [ ] #3 Given the anonymous finder, when they chat, then they act through an anonymous session bound to the report and can later claim it by creating an account.
- [ ] #4 Given other stories, when they need it, then the anonymous submit endpoint, token model and RLS rules are documented as a contract slice.
- [ ] #5 Given abuse patterns (many reports from one device, identical photo hash), when detected, then reports are held for moderation instead of published.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
