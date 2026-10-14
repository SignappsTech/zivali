---
id: TASK-8
title: UI kit core primitives for web and mobile
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:01'
labels:
  - story
  - 'req:NFR-A11Y'
milestone: m-0
dependencies:
  - TASK-1
  - TASK-3
priority: high
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Features on both platforms need the same accessible building blocks (shadcn/ui on web, React Native Reusables on mobile) bound to the shared tokens, so stories do not each invent buttons and forms.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the tokens, when the kit is built, then web (shadcn/ui) and mobile (React Native Reusables on NativeWind) provide Button, Input, Textarea, Select, Checkbox, Radio, Switch, FormField with error text, Card, Badge, Dialog or Sheet, Toast, Tabs, Skeleton, EmptyState and Avatar with matching names and props.
- [ ] #2 Given each component, when shown in the documented gallery, then default, focus, disabled, error and loading states are visible in SL and EN and axe reports no violations on web.
- [ ] #3 Given touch use, when components are interactive, then targets are at least 44 px and contrast follows the DS tokens.
- [ ] #4 Given a token change, when the tokens package updates, then both platforms pick it up without component edits.
<!-- AC:END -->

## Packet

Unblocks on: tokens spec in docs/03 and packages/tokens skeleton merged (TASK-1, TASK-3)
