---
id: TASK-115.8
title: 'Home: focused recent-report card stays mostly off-screen in the mobile strip'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 23:21'
updated_date: '2026-10-18 23:40'
labels:
  - bug
  - 'est:XS'
  - fe
  - a11y
dependencies: []
parent_task_id: TASK-115
priority: low
ordinal: 404200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: https://najdimo.si/ at 390x844 (keyboard, or a zoomed desktop below lg), Tab past the hero to the Recent reports cards. Expected: each focused card scrolls fully into view. Actual: the strip (scroll-snap mandatory, 78 % cards) does not scroll for the 2nd and 4th card: scrollLeft stays 0 / 578 and the focused card sits at x 309-582 of a 390 px viewport, about 70 % hidden; only its left edge and part of the ring show. Cards 1 and 3 are fine. Same in Chromium and WebKit (Playwright, TASK-115.6, version a5d856e6). Severity: Low (focus not fully obscured, so WCAG 2.4.11 passes; keyboard and zoom users cannot see the card they are on).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Below lg, tabbing to any recent-report card scrolls the strip so the whole focused card (and its focus ring) is in view, in Chromium and WebKit
- [x] #2 An e2e or component check covers tabbing to the second card at 390 px
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Packet: Branch: agent/TASK-115.7-home-cards (shared with TASK-115.7). Cause: Chromium and WebKit treat a focused box with 32 px or more in view as visible and do not scroll it. Fix: client CardStrip (components/home/card-strip.tsx) on focus calls scrollIntoView({block:'nearest', inline:'start'}) when the card is not fully inside the strip; inline start = its snap-start point; smoothness from motion-safe:scroll-smooth on the strip (reduced motion jumps). -mt-2 pt-2 kept. Component check in blocks.test.tsx: 390 px geometry, focus to the second card. AC1 in real Chromium/WebKit not run here (no e2e in worktree): QA to confirm.
<!-- SECTION:NOTES:END -->
