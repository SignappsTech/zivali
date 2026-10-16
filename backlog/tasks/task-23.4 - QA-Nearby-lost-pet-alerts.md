---
id: TASK-23.4
title: 'QA: Nearby lost-pet alerts'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-16 09:28'
labels:
  - qa
milestone: m-1
dependencies:
  - TASK-23.1
  - TASK-23.2
  - TASK-23.3
references:
  - docs/tech/frontend.md
  - docs/design/pages/P13-alerts-inbox-settings.md
parent_task_id: TASK-23
priority: medium
ordinal: 241000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-23 (Nearby lost-pet alerts) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-23 merged to main (TASK-23.1, TASK-23.2, TASK-23.3); leads add any later TASK-23 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a signed-in user, when they set a home area, radius (default 5 km, range 1-25 km) and species and opt in, then alert_opt_in fires (consent only) and alerts are enabled.
- [x] #2 Given a new LOST report, when published, then users whose area covers its fuzzed location receive one push or in-app alert within 2 minutes, never exceeding the daily cap (default 5).
- [x] #3 Given the owner closes or reunites a report, when alerts are still pending, then they are cancelled.
- [x] #4 Given the user pauses or disables alerts, when a new report appears, then nothing is sent.
- [ ] #5 Given the fan-out, when 1000 recipients match, then it completes under 60 s using spatial indexes (tested locally).
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA run (worktree, no DB/e2e/Lighthouse per machine rules). PASS by code read + tests: AC1-4. Web vitest alerts 12/12, mobile jest alerts 23/23. API alerts.domain/route tests read (radius/species/pause/manager exclusion/dedupe/cap/public_point/1000 recipients in chunks of 500) - not run here. AC5 (1000 recipients test) and AC6 (pnpm verify, pnpm quality): verify, e2e, Lighthouse: merge queue on main at b965dff9. Open: TASK-23.2 AC3 (axe + Playwright) and TASK-23.3 AC3 (Android screen reader) need e2e and a device. Added e2e radius clamp test (apps/web/e2e/alerts.spec.ts), unrun. Notes (not bugs): alert_deliveries row is written even if the user's nearby_lost channels are all off, so it counts toward the daily cap; unsubscribe link turns off only the nearby_lost email, not the subscription (per C10).
<!-- SECTION:NOTES:END -->
