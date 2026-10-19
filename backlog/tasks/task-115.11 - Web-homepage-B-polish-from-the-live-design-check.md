---
id: TASK-115.11
title: 'Web: homepage B polish from the live design check'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 12:46'
labels:
  - fe
  - 'est:S'
dependencies:
  - TASK-112.1
references:
  - docs/design/pages/P3-public-pages.md
  - docs/design/wireframes/P3-home.html
  - docs/design/system.md
  - docs/tech/frontend.md
parent_task_id: TASK-115
priority: high
ordinal: 416200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Design-lead visual check of homepage B on najdimo.si (2026-10-19, 1440 and 390, light and dark). Layout, contrast and targets pass. Six fixes:
1. At 390 on first visit the cookie banner (392 px, 46 % of the screen) covers the chooser card. Make it at most about 1/3 of the screen: Zavrni and Sprejmi side by side, Prilagodi as a text button (system.md consent banner; TASK-112.1 moved the banner to the top of the body, build on that).
2. Recent-report rows without a photo show an empty muted tile: add the paw-print icon.
3. The six teaser pins stack into one blob: use a cluster disc with the count where pins overlap.
4. The hero dog's head sits under the chooser card (1440) and under the scrim (390): move the focal point and lighten the scrim behind the card.
5. Row thumbnails: recheck the top-anchored crop (TASK-114.43) once deployed.
6. The gap before the footer is about 190 px: reduce it to 96.

## Packet

Unblocks on: TASK-112.1 merged (consent banner position)
Design: docs/design/pages/P3-public-pages.md (design-lead batch 2026-10-19), docs/design/wireframes/P3-home.html Option B, docs/design/system.md consent banner
Review: tech-lead code review (full mode)
Branch: agent/task-115.11-home-b-polish
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All six points fixed at 1440 and 390, light and dark; consent gating unchanged
- [ ] #2 Unit tests updated; e2e specs adjusted without running
<!-- AC:END -->
