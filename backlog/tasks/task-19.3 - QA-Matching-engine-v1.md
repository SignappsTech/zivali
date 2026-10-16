---
id: TASK-19.3
title: 'QA: Matching engine v1'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-16 01:51'
labels:
  - qa
  - 'qa:pass'
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
- [x] #1 Given a new or updated report, when it is saved, then matching runs automatically and stores suggestions within 2 minutes (p95), idempotently.
- [x] #2 Given two reports with equal normalised chip numbers (one LOST, one FOUND or SIGHTED), when matched, then the score is 1.0, the suggestion is flagged as a chip match and the owner is notified immediately.
- [x] #3 Given no chip match, when scoring, then species must match and the score blends distance decay, time proximity (found after lost, within 30 days by default) and attribute overlap (size, colour, sex), with weights and threshold (default 0.5, top 10) in config and human-readable reasons stored.
- [x] #4 Given owner feedback, when a suggestion is rejected, then the pair never reappears and the feedback is kept for later tuning.
- [x] #5 Given a fixture set of at least 30 synthetic pairs, when tests run, then chip, geo, time and attribute rules are covered locally without cloud services.
- [x] #6 Given privacy, when a match is suggested, then neither side sees the other contact data until the owner confirms and chat opens.
- [x] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA on main a20aaa8 (worktree reset), scratch DB task_qa_19_3 (stubs: auth.users table, no-op realtime.send; geo seeder 01 only). Tests: matching.domain 12, matching.fixtures (36 pairs), matches.routes, jobs, reports.write.routes, notifications.domain = 68 pass; validation matching 11 pass. Added test/routes/matching.qa.routes.test.ts (2 pass): POST/PATCH -> match.report -> drain -> GET matches; chip in two formats -> 1.0 chip_match + match_chip ids-only; other = public circle, no chip/contact/ids; finder sees nothing; reject -> edits on both sides -> never back, match_feedback kept; 31-day sighting and cat excluded. Gates: verify: merge queue, main at a20aaa8; quality: n/a (backend story, no pages). Privacy: reasons bands only, distance from lost exact to other public point, no chip number in reasons/push/list. No bugs.
<!-- SECTION:NOTES:END -->
