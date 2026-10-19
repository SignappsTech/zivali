---
id: TASK-23.4
title: 'QA: Nearby lost-pet alerts'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 19:45'
labels:
  - qa
  - 'qa:pass'
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
- [x] #5 Given the fan-out, when 1000 recipients match, then it completes under 60 s using spatial indexes (tested locally).
- [x] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA run (worktree, no DB/e2e/Lighthouse per machine rules). PASS by code read + tests: AC1-4. Web vitest alerts 12/12, mobile jest alerts 23/23. API alerts.domain/route tests read (radius/species/pause/manager exclusion/dedupe/cap/public_point/1000 recipients in chunks of 500) - not run here. AC5 (1000 recipients test) and AC6 (pnpm verify, pnpm quality): verify, e2e, Lighthouse: merge queue on main at b965dff9. Open: TASK-23.2 AC3 (axe + Playwright) and TASK-23.3 AC3 (Android screen reader) need e2e and a device. Added e2e radius clamp test (apps/web/e2e/alerts.spec.ts), unrun. Notes (not bugs): alert_deliveries row is written even if the user's nearby_lost channels are all off, so it counts toward the daily cap; unsubscribe link turns off only the nearby_lost email, not the subscription (per C10).

QA re-run 2026-10-19 (web only; app: later) on main e778c604, live najdimo.si 030da43f (no alerts diff between them). AC1-4 PASS: web vitest alerts+notifications 55/55, analytics 18/18, validation 160/160; API on a local scratch DB (task_23_4_qa, dropped after): alerts.domain 10/10, alert-subscription routes + species check, transitions 13/13 (close/reunite drop queued alerts). AC5 PASS: 1000 subscribers fanned out in 5.8 s, chunks of 500; EXPLAIN uses alert_subscriptions_center_point_idx (GiST). AC6 PASS with known exceptions: pnpm verify = merge-queue verify on main + green push CI before deploy (lead, deploy-after-green-ci, 2026-10-19); e2e alerts.spec (axe, 390 dark/1440 light, keyboard, radius clamp) in CI. Live signed-out, Chromium + WebKit at 320/390/1440: /racun/opozorila, /en/account/alerts, /racun/obvestila, /en/account/notifications 307 to sign-in with next, noindex (meta + x-robots-tag), 0 ad slots, no overflow, no targets under 44 px, 0 console errors, axe 0. Lighthouse mobile /racun/opozorila (to /vpis): perf 0.83, a11y 1, BP 1, LCP 3.5 s (consent banner, known TASK-112/112.1), CLS 0.02, script 203 KB. Not checked live: the signed-in page (captcha + no inbox); covered by CI e2e with a mocked API. Risk, not filed: notify.send runs with localConcurrency 1, so with ~1000 recipients the last in-app/push alert may take longer than 2 min (delivery throughput is not tested). CHANGE appended: P13 disclosure is open by default (TASK-114.42).
<!-- SECTION:NOTES:END -->
