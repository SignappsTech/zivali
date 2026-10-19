---
id: TASK-17.18
title: >-
  Manage page /m: mobile perf median 88 and LCP 3.5 s after TASK-17.16 (gates 90
  / 3.3 s); /kako-deluje passes in the same runs
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:30'
updated_date: '2026-10-19 20:35'
labels:
  - bug
  - 'est:S'
  - web
  - performance
milestone: m-1
dependencies: []
parent_task_id: TASK-17
priority: low
ordinal: 466200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-17 AC#6 (QA TASK-17.4, re-QA 3, 2026-10-19, live najdimo.si version ee189f86e027, after TASK-17.15 and TASK-17.16).

Steps: Lighthouse 12.6.1 mobile (simulated throttling) on https://najdimo.si/m (6 runs) and /en/m (3 runs), first visit, no consent cookie; /kako-deluje x3 interleaved with /m in the same window as the shell baseline.

Expected: perf >= 0.9 and LCP <= 3300 ms (median; frontend.md DoD, lighthouserc /m group).

Actual: /m perf 96/88/82/87/89/90 (median 88.5), LCP 2.20-4.09 s (median 3.47 s), TBT 160-253 ms; /en/m perf 89/85/86 (median 86), LCP 3.38/3.60/3.96 s. LCP element p#consent-body (consent banner), FCP 1.05 s on both. Same window, same shell: /kako-deluje perf 94/94/93, LCP 2.86-3.01 s, TBT 104-148 ms, script 156.5 KB. So the miss is /m-specific, not only the shell first paint (TASK-112.2): /m ships 242.2 KB script (+86 KB) and its JS delays the banner's simulated paint by about 0.5 s. Improved since TASK-17.16 (was 76-85, LCP 3.5-3.7 s). Passing: CLS 0.022-0.064 mobile, 0.062-0.081 desktop (TASK-17.15 fixed); script 242.2 KB <= 256 KB; a11y 100, BP 100, desktop perf 97-99.

Severity: minor (gate miss; page works).

## Packet

Unblocks on: - (ready now; coordinate with TASK-17.17 and TASK-112.2)
Review: local
Branch: agent/task-17.18-m-perf-2
Branch: agent/task-17.17-m-perf-2 (with TASK-17.17)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lighthouse mobile on /m and /en/m (first visit, no consent cookie, median of 3): performance >= 0.9 and LCP <= 3300 ms, with script <= 256000 B and CLS < 0.1 kept; or the tech lead sets a reasoned /m budget in lighthouserc.json and docs/05
<!-- AC:END -->
