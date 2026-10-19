---
id: TASK-112.2
title: >-
  Web: mobile FCP/LCP 3.1-4 s on content and flow pages; the consent banner
  paints at FCP, so it is the LCP element
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 19:57'
updated_date: '2026-10-19 19:59'
labels:
  - fe
  - 'est:M'
  - web
dependencies: []
references:
  - lighthouserc.json
  - docs/tech/frontend.md
parent_task_id: TASK-112
priority: high
ordinal: 451200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
QA 2026-10-19 (TASK-17.4, 18.4, 23.4, 29.7, 30.4, 38.4, 11.3) measured mobile LCP 3.1-5.7 s on many pages with the consent banner as the LCP element, although TASK-112.1 is Done. TASK-18.6 found that on /r/ the banner is server-rendered and paints at FCP, so the real cost is the time to first paint. Tonight's merges already cut /r/ (18.6), /m (17.16) and auth (9.9) JS; measure after their deploy.

## Packet
Unblocks on: -
Branch: agent/task-112-first-paint
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lighthouse mobile (CI quality job, or the staging Lighthouse from TASK-90.8) on /, /kako-deluje, /prijava/izgubljena-zival, /prijava/najdena-zival and /vpis: LCP <= 3.3 s and perf >= 0.9, or each remaining gap is named with its cause and a follow-up task
- [ ] #2 The render-blocking cost before first paint is measured and cut where possible (font loading strategy and preloads, critical CSS size, blocking scripts, hydration of the shell and the consent banner); no visual change at 100% text and no CLS regression
- [ ] #3 Report flows keep their script budgets (TASK-112 AC#2); nothing analytics-related loads before consent
<!-- AC:END -->
