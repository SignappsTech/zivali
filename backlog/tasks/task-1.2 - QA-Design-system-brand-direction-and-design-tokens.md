---
id: TASK-1.2
title: 'QA: Design system: brand direction and design tokens'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:14'
labels:
  - qa
  - 'est:XS'
milestone: m-0
dependencies:
  - TASK-1.1
references:
  - docs/tech/frontend.md
  - docs/design/system.md
parent_task_id: TASK-1
priority: high
ordinal: 219000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-1 (Design system: brand direction and design tokens) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-1 merged to main (TASK-1.1); leads add any later TASK-1 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the working name, when the design team presents it, then 2-3 name, logo and palette directions are proposed for client approval (Q-001) and the working name stays until one is approved.
- [ ] #2 Given the approved direction, when tokens are defined, then docs/03 lists colour, typography, spacing, radius and elevation tokens as CSS variables plus a Tailwind preset consumed by web and mobile.
- [ ] #3 Given every text and background token pair, when contrast is checked, then body text is at least 4.5:1, primary action text at least 7:1 (outdoor use) and focus indicators at least 3:1.
- [ ] #4 Given the Slovenian and English UI, when the type scale is applied, then diacritics (š, č, ž) render correctly and no style relies on colour alone to convey meaning.
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
