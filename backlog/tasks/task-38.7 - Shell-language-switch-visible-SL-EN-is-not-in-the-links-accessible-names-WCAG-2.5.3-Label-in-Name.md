---
id: TASK-38.7
title: >-
  Shell language switch: visible SL/EN is not in the links' accessible names
  (WCAG 2.5.3 Label in Name)
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 19:31'
updated_date: '2026-10-19 19:48'
labels:
  - bug
  - 'est:XS'
  - web
dependencies: []
parent_task_id: TASK-38
priority: low
ordinal: 446200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: open https://najdimo.si/oglasevanje or /en/advertise at desktop width (1280 px, header switch visible from md); run axe-core 4.14 with tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa. Expected: the visible label of each language link is part of its accessible name (WCAG 2.5.3), e.g. 'SL' plus the full name, so a voice-control user saying 'click SL' hits the link. Actual: the links show 'SL' / 'EN' but carry aria-label 'Slovenščina' / 'English' (apps/web/components/shell/parts.tsx LanguageSwitch, aria-label={labels.full[next]}); axe 4.14 reports label-content-name-mismatch, serious, 4 nodes. CI stays green because @axe-core/playwright ~4.13 does not run this rule; it fails once axe is bumped. Shell-wide (every page), seen on live 69d07c9716f7 and 030da43f44fe. Severity: minor (a11y). Found in TASK-38.4 QA.

## Packet

Unblocks on: - (no dependency)
Branch: agent/TASK-38.7-lang-switch-label-in-name
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each language link's accessible name contains its visible text (SL, EN) in SL and EN, and axe-core 4.14 reports no label-content-name-mismatch on /oglasevanje and /en/advertise
<!-- AC:END -->
