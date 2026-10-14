---
id: TASK-19.3
title: 'QA: Matching engine v1'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-19.1
  - TASK-19.2
references:
  - docs/tech/frontend.md
parent_task_id: TASK-19
priority: high
ordinal: 237000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-19 (Matching engine v1) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-19 merged to main (TASK-19.1, TASK-19.2); leads add any later TASK-19 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a new or updated report, when it is saved, then matching runs automatically and stores suggestions within 2 minutes (p95), idempotently.
- [ ] #2 Given two reports with equal normalised chip numbers (one LOST, one FOUND or SIGHTED), when matched, then the score is 1.0, the suggestion is flagged as a chip match and the owner is notified immediately.
- [ ] #3 Given no chip match, when scoring, then species must match and the score blends distance decay, time proximity (found after lost, within 30 days by default) and attribute overlap (size, colour, sex), with weights and threshold (default 0.5, top 10) in config and human-readable reasons stored.
- [ ] #4 Given owner feedback, when a suggestion is rejected, then the pair never reappears and the feedback is kept for later tuning.
- [ ] #5 Given a fixture set of at least 30 synthetic pairs, when tests run, then chip, geo, time and attribute rules are covered locally without cloud services.
- [ ] #6 Given privacy, when a match is suggested, then neither side sees the other contact data until the owner confirms and chat opens.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
