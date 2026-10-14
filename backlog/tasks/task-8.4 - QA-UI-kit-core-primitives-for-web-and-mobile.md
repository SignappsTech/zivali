---
id: TASK-8.4
title: 'QA: UI kit core primitives for web and mobile'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
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
