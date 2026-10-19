---
id: TASK-17.16
title: >-
  Manage page /m: mobile Lighthouse perf 76-85 and LCP 3.5-3.7 s (gates 90 / 3.3
  s)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 18:34'
labels:
  - bug
  - 'est:S'
  - web
  - performance
milestone: m-1
dependencies: []
parent_task_id: TASK-17
priority: low
ordinal: 436200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-17 AC#6 (QA TASK-17.4, re-QA 2026-10-19). Steps: Lighthouse 12.6.1 mobile (simulated throttling), live https://najdimo.si/m and /en/m (version 69d07c9716f7 = main code), no consent cookie, 3 runs each. Expected: performance >= 0.9 and lab LCP <= 3300 ms (frontend.md DoD, lighthouserc). Actual: perf 85/78/82 on /m and 76/81/85 on /en/m; LCP 3464-3747 ms; TBT 163-387 ms; LCP element p#consent-body (the consent banner, first visit). Script 238.7 KB (budget met since TASK-17.9); a11y 100, best practices 100; desktop perf 99. Same runs on /kako-deluje: perf 88-90, LCP 3081-3155 ms, script 156 KB, so /m carries about 80 KB more JS and about 0.4 s more LCP. /m is not in lighthouserc.json collect.url, so CI never measures it. Related: TASK-112 (shell LCP and budgets, in progress; /m not in its scope), TASK-112.1 (banner as LCP element). Severity: minor (gate miss; page works).

## Packet

Unblocks on: - (ready now; coordinate with TASK-112)
Review: local
Branch: agent/task-17.16-m-perf
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lighthouse mobile on /m and /en/m (median of 3 runs, first visit): performance >= 0.9 and LCP <= 3300 ms with script <= 256000 B kept, or the tech lead sets a reasoned /m budget in lighthouserc.json and docs/05
- [ ] #2 /m and /en/m are in lighthouserc.json collect.url so the CI quality job measures them
<!-- AC:END -->
