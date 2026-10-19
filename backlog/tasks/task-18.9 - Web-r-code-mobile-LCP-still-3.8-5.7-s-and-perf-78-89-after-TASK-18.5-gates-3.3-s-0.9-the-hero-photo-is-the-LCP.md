---
id: TASK-18.9
title: >-
  Web /r/[code]: mobile LCP still 3.8-5.7 s and perf 78-89 after TASK-18.5
  (gates 3.3 s, 0.9); the hero photo is the LCP
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:19'
labels:
  - bug
  - 'est:M'
  - web
milestone: m-1
dependencies: []
parent_task_id: TASK-18
priority: high
ordinal: 453200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: Lighthouse 12.6.1 CLI, mobile preset, headless Chrome, 3 runs each against live najdimo.si (version 1ce206002ec1, TASK-18.5/18.6 merged).
Expected: perf >= 0.9, LCP <= 3.3 s (lighthouserc.json, docs/tech/frontend.md DoD; TASK-18.5 AC).
Actual: /r/zvsmkB5v perf 80/79/78, LCP 5127/5509/5655 ms; /en/r/zvsmkB5v 81/82, LCP 4975/4905 ms; /r/WD8k8UgN 87/88/89, LCP 3880/3872/3799 ms. FCP 1.1-1.2 s, TBT 63-129 ms, CLS 0, script 251.3 KB (in budget now). Desktop passes (perf 98, LCP 1.05-1.08 s). Baseline /kako-deluje mobile: perf 94, LCP 2.9 s.
LCP element = hero gallery <img> (fetchpriority=high, preloaded at byte 135 of the HTML, before S:0: discovery is fixed; the consent banner is not the LCP here, so not TASK-112.2). Simulated phases: map report TTFB 0.49 s, load delay 2.88 s, load 0.42 s, render delay 1.72 s; short report 0.47 / 2.01 / 0.32 / 1.07 s.
Hints: on a phone sizes calc((100vw - 40px) * 0.5625) = 209 px x DPR 1.75 = 366 px > the 360w thumb, so display.webp 1200w (176 KB) is chosen; Lighthouse image-delivery estimates 170 KB waste. The four other thumbs also load at High priority beside it. media.najdimo.si is a second origin with no preconnect. Render delay 1.1-1.7 s points at main-thread work before the photo paints (3dmm3v_fq28gc.js ~0.55 s bootup).
Severity: major (story gate AC#6 of TASK-18.4).

## Packet

Unblocks on: -
Branch: agent/task-18.9-r-lcp from main
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lighthouse mobile (3 runs) on live /r/zvsmkB5v (5 photos), /en/r/zvsmkB5v and /r/WD8k8UgN (1 photo): performance >= 0.9 and LCP <= 3300 ms in every run
<!-- AC:END -->
