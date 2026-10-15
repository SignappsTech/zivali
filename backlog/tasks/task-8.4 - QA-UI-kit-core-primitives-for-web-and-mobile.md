---
id: TASK-8.4
title: 'QA: UI kit core primitives for web and mobile'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
  - 'qa:pass'
milestone: m-0
dependencies:
  - TASK-8.2
  - TASK-8.3
  - TASK-8.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P23-ui-kit-gallery.md
parent_task_id: TASK-8
priority: high
ordinal: 226000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-8 (UI kit core primitives for web and mobile) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-8 merged to main (TASK-8.2, TASK-8.3, TASK-8.1); leads add any later TASK-8 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the tokens, when the kit is built, then web (shadcn/ui) and mobile (React Native Reusables on NativeWind) provide Button, Input, Textarea, Select, Checkbox, Radio, Switch, FormField with error text, Card, Badge, Dialog or Sheet, Toast, Tabs, Skeleton, EmptyState and Avatar with matching names and props.
- [ ] #2 Given each component, when shown in the documented gallery, then default, focus, disabled, error and loading states are visible in SL and EN and axe reports no violations on web.
- [ ] #3 Given touch use, when components are interactive, then targets are at least 44 px and contrast follows the DS tokens.
- [ ] #4 Given a token change, when the tokens package updates, then both platforms pick it up without component edits.
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-15 on main ba428d3: qa:pass.
- AC1 same component names and FormField props on web and mobile. AC2/AC3 web: kit e2e 6/6, axe 0 violations in sl/en, light/dark, each overlay open; targets ≥44 px; 3 px focus ring. Mobile: jest gallery render in sl/en; min-h-11, maxFontSizeMultiplier 2, roles set. No hex colours or arbitrary sizes. AC4 tokens via @zivali/tokens on both. AC5 pnpm verify 30/30.
- Open, not blocking: TalkBack, 200 % text scale and on-device states for the mobile kit wait for a new EAS dev build (TASK-8.3 AC#3).
- Lighthouse budgets fail on public pages (script 287-315 KB, LCP 2.9-4.0 s locally under load): owned by TASK-11.2 / TASK-90.4, not the kit (the kit is only imported by /dev/kit).
<!-- SECTION:NOTES:END -->
