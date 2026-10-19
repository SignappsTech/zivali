---
id: TASK-18.5
title: >-
  Web /r/[code]: mobile LCP 5.3-6.1 s and Lighthouse perf 77-79 on najdimo.si
  (gates 3.3 s, 0.9)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 18:37'
labels:
  - bug
  - 'est:S'
  - web
  - performance
dependencies: []
parent_task_id: TASK-18
priority: high
ordinal: 438200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: Lighthouse 12.6.1 CLI, mobile preset, headless Chrome, against https://najdimo.si/r/zvsmkB5v (2 runs), /en/r/zvsmkB5v, /r/E1ScbpGF, /r/WD8k8UgN (live 69d07c97, web code = main 0b573340).
Expected: perf >= 0.9, LCP <= 3.3 s (lighthouserc.json, docs/tech/frontend.md DoD).
Actual: perf 77/78/78/79/62, LCP 5342/6135/5944/5385/4210 ms. Desktop passes (perf 91-96, LCP 1.3-1.6 s). Baseline /kako-deluje mobile: perf 94, LCP 3.0 s, so the gap is page-specific.
LCP element = hero gallery <img> (display.jpg, fetchpriority=high). Phases: TTFB 0.47 s, load delay 1.67 s, load 1.04 s, render delay 2.16 s. Hints: the photo sits in the streamed Suspense chunk (S:0 at ~116 KB of 167 KB HTML, after the loading.tsx "Nalaganje ..." fallback), so it is found late and painted late; display.jpg is 306 KB at 1200x1600 for a 350 px slot (no srcset or smaller variant).
Severity: major (story gate AC#6, TASK-18.4). Not covered by TASK-112 (report flows, map, content pages only).

## Packet

Unblocks on: -
Branch: agent/<id>-detail-lcp from main
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lighthouse mobile on a live /r/<code> with photos (e.g. /r/zvsmkB5v): performance >= 0.9 and LCP <= 3300 ms (2500 ms asserted on staging)
<!-- AC:END -->
