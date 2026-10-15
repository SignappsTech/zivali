---
id: TASK-8.2
title: 'Web UI kit: shadcn primitives styled to the design system, /dev/kit gallery'
status: In Review
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 03:10'
labels:
  - fe
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-3.3
  - TASK-8.1
references:
  - docs/tech/frontend.md
  - docs/design/system.md
  - docs/design/pages/P23-ui-kit-gallery.md
  - docs/tech/contracts/C2-design-tokens.md
parent_task_id: TASK-8
priority: high
ordinal: 133000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Web features need the same accessible building blocks bound to the tokens instead of each story inventing buttons and forms.

## Packet

Unblocks on: Web app scaffold: Next.js 16, Tailwind 4 + shadcn, tokens, locale routing, Supabase helpers merged (TASK-3.3); Design: UI kit gallery (P23) approved (TASK-8.1)
Design: P23 docs/design/pages/P23-ui-kit-gallery.md (mockup docs/design/mockups/P23-ui-kit-gallery.html; TASK-8.1)
Copy: docs/content/pages/P23-ui-kit-gallery.md
Contracts: C2 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-8.2-kit-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 components/ui provides Button, Input, Textarea, Select, Checkbox, RadioGroup and ChoiceRow, Switch, FormField (label, hint, error), Card, Badge, StatusLabel, Dialog, Sheet, AlertDialog, Toast (sonner), Tabs (segmented), Skeleton, EmptyState, Avatar and Progress, styled to docs/design/system.md §10 with semantic tokens only and Phosphor icons.
- [x] #2 /dev/kit shows every component in default, focus, disabled, error and loading states, in SL and EN and in light and dark, matching the P23 mockup.
- [x] #3 Playwright with axe reports 0 violations on /dev/kit; interactive targets are at least 44 px and focus rings follow the tokens.
- [x] #4 Component tests cover FormField error wiring (aria-describedby, announced on submit) and the Button loading state.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Done on agent/task-8.2-kit-web: components/ui (shadcn + FormField, StatusLabel, EmptyState, ChoiceRow) styled to system §10 with tokens and Phosphor; gallery at app/[locale]/dev/kit (SL /dev/kit, EN /en/dev/kit; 404 when APP_ENV=production); e2e/kit.spec.ts (axe light/dark x SL/EN incl. open overlays, 44 px targets, ring 3/2 px); FormField and Button unit tests. pnpm verify green. CHANGE CH-78..80.
<!-- SECTION:NOTES:END -->
