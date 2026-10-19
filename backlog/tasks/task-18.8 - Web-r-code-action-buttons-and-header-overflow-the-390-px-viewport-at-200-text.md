---
id: TASK-18.8
title: >-
  Web /r/[code]: action buttons and header overflow the 390 px viewport at 200%
  text
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 18:38'
updated_date: '2026-10-19 18:46'
labels:
  - bug
  - 'est:S'
  - web
  - a11y
dependencies: []
parent_task_id: TASK-18
priority: low
ordinal: 441200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: https://najdimo.si/r/zvsmkB5v and /r/E1ScbpGF at 390x844 (Chromium), inject html{font-size:200%} (same as a 32 px browser default font), measure documentElement.scrollWidth.
Expected: no horizontal scroll at 200% text (docs/tech/frontend.md DoD "works at 320 px width and 200 % text").
Actual: scrollWidth 651 vs 390. Overflowing: header row (Prijavi 215 px + Odpri meni 88 px, right edge 611), "Sporoci opazanje" 456 px, "Deli ali natisni plakat" 449 px, "To je moja zival" 433 px, "Nazaj na zemljevid" 387 px; all are inline-flex shrink-0 buttons with nowrap labels. /kako-deluje overflows the same way, so the root cause is likely the shared Button and the shell header (UI kit), not only P9. At 320 px with normal text there is no overflow.
Severity: minor (WCAG 1.4.4 / 1.4.10, large-text users).

## Packet

Unblocks on: -
Branch: agent/<id>-text-200 from main
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 At 390 px with root text at 200%, /r/<code> has no horizontal page scroll: buttons wrap their label or stack, the header fits
<!-- AC:END -->
