---
id: TASK-26.6
title: 'QA: Mark reunited, close and expire reports'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-16 07:51'
labels:
  - qa
  - 'qa:fail'
milestone: m-1
dependencies:
  - TASK-26.3
  - TASK-26.4
  - TASK-26.5
  - TASK-26.1
  - TASK-26.2
  - TASK-26.7
references:
  - docs/tech/frontend.md
  - docs/design/pages/P14-reunited.md
parent_task_id: TASK-26
priority: high
ordinal: 244000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-26 (Mark reunited, close and expire reports) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-26 merged to main (TASK-26.3, TASK-26.4, TASK-26.5, TASK-26.1, TASK-26.2); leads add any later TASK-26 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given an owner (or an anonymous finder with the manage link), when they mark a report Reunited, then status becomes REUNITED, linked matches close, alerts and boosts stop, the counterpart is notified and reunited fires (consent only).
- [x] #2 Given My reports, when opened, then the owner can edit, close with a reason (found elsewhere, gave up, other) or reopen within 7 days.
- [x] #3 Given a LOST report, when it reaches 7, 14 and 30 days, then the owner gets an update reminder, and at 90 days without action it auto-closes with a one-tap extension.
- [x] #4 Given FOUND or SIGHTED reports, when 30 days pass without update, then they expire the same way, and shelter intakes are exempt (FR-015).
- [x] #5 Given the reunited screen, when shown, then it celebrates warmly, shows next steps and reserves slots for the thank-you tip (FR-021) and one labelled ad slot (FR-030).
- [x] #6 Given statistics, when a report is reunited, then time to reunite and time to first match are recorded for KPIs.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-16 on main e2457eef (worktree). Unit: web vitest report/manage/my-reports 186 pass; mobile jest lifecycle+manage 42 pass; i18n check OK (sl/en parity). Gates AC7: verify, e2e, Lighthouse, API tests: merge queue on main at e2457eef (not run here, shared DB). Read API lifecycle/expiry/blur code+tests: C4 machine, reopen window, removed GONE, intakes exempt, blur idempotent OK. FAIL AC1 (mobile /m no reunited event): TASK-26.8. FAIL AC3 (mobile owner cannot extend, reminder link drops action): TASK-26.9. Tip slot on web is empty until TASK-33.2 (ad-hidden-while-tip-asks unverifiable on web; mobile does it). Added e2e cases in apps/web/e2e/lifecycle.spec.ts (unrun: deep link keep/close sends nothing on load, bad code/action ignored, close dialog focus return); the focus-return one is a probe.
Re-check 2026-10-16 on main bd5a8271 (static + unit; machine rules: no e2e, API tests, build, Lighthouse). TASK-26.8 (reunited event on /m, trackReunited shared in lifecycle-helpers, manage.test case) and TASK-26.9 (owner reminder/extend card, C10 action deep link keeps keep/extend/close, nothing sent until pressed; lifecycle + deep-links tests) confirmed in code and tests. Mobile jest lifecycle, manage, deep-links 202/202 (with report-lost, browse, map suites), web vitest report/my-reports pass. AC1 and AC3 ticked. Only AC7 remains: verify, e2e, Lighthouse: merge queue on main at bd5a8271.
<!-- SECTION:NOTES:END -->
