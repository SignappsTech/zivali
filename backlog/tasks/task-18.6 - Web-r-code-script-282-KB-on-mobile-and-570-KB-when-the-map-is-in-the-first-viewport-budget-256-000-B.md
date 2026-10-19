---
id: TASK-18.6
title: >-
  Web /r/[code]: script 282 KB on mobile and 570 KB when the map is in the first
  viewport (budget 256 000 B)
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 18:38'
updated_date: '2026-10-19 18:43'
labels:
  - bug
  - 'est:S'
  - web
  - performance
dependencies: []
parent_task_id: TASK-18
priority: high
ordinal: 439200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: Lighthouse 12.6.1 CLI, mobile and desktop presets, against https://najdimo.si/r/zvsmkB5v, /en/r/zvsmkB5v, /r/E1ScbpGF, /r/WD8k8UgN (live 69d07c97, web code = main).
Expected: script transfer <= 256000 B on /r/* (lighthouserc.json assertMatrix, default group).
Actual: mobile 282592-282631 B on the longer pages; on /r/WD8k8UgN (one photo, short page) MapLibre loads on mobile too: script 570075 B, TBT 1102 ms, perf 0.62. Desktop is always 570 KB because the map is in view. Largest chunks: 3dmm3v_fq28gc.js 72.7 KB, 3t-5imqwt2t47.js 44.7 KB. Baseline /kako-deluje: 156 KB.
Severity: major (story gate AC#6, TASK-18.4). TASK-112 covers /prijava/* and /zemljevid, not /r/*.

## Packet

Unblocks on: -
Branch: agent/<id>-detail-js from main
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lighthouse mobile on live /r/<code> pages, short and long: resource-summary script <= 256000 B and TBT not above the content pages'
<!-- AC:END -->
