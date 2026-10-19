---
id: TASK-24.6
title: 'Web poster dialog: language pills overflow the dialog at 200 percent text'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 19:48'
labels:
  - bug
  - 'est:XS'
  - web
  - a11y
dependencies: []
parent_task_id: TASK-24
ordinal: 450200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: https://najdimo.si/r/zvsmkB5v (live 030da43f, 2026-10-19), Chromium at 390x800 and 320x800, inject html{font-size:200%} (as TASK-18.8), open 'Deli ali natisni plakat' > 'Plakat s QR kodo', measure the open dialog.
Expected: no horizontal scroll at 200 % text (docs/tech/frontend.md DoD 'works at 320 px width and 200 % text'); the language pills wrap.
Actual: dialog scrollWidth 530 vs clientWidth 310 (240 at 320 px). The pills 'SlovenÅ¡Äina' (291 px) and 'English' (175 px) stay on one row, 'English' at x 395 to 570, off the screen. Cause: PosterOptions in apps/web/components/report/share-menu.tsx puts the pills in `flex gap-2` without flex-wrap, and Pill is whitespace-nowrap. TASK-18.8 (merged) fixed Button, not this row; 'Prenesi PDF' also overflowed live (377 px, pre-18.8 build), so recheck it once main is deployed.
Severity: minor (WCAG 1.4.4 / 1.4.10, large-text users).

## Packet

Unblocks on: - (TASK-18.8 merged)
Branch: agent/TASK-24.6-poster-pills-wrap
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given /r/[code] at 390 px and 320 px with root text at 200 percent, when the poster dialog is open, then it has no horizontal scroll: the language pills wrap and Prenesi PDF fits
<!-- AC:END -->
