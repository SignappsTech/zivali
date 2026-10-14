---
id: TASK-8.3
title: >-
  Mobile UI kit: RN Reusables primitives styled to the design system, gallery
  screen
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-14 22:41'
labels:
  - fe
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-3.4
  - TASK-8.1
references:
  - docs/tech/frontend.md
  - docs/design/system.md
  - docs/design/pages/P23-ui-kit-gallery.md
  - docs/tech/contracts/C2-design-tokens.md
parent_task_id: TASK-8
priority: high
ordinal: 134000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mobile features need the same building blocks with the same names and props as web, bound to the shared tokens.

## Packet

Unblocks on: Mobile app scaffold: Expo SDK 57, Expo Router, NativeWind + RN Reusables, tokens, dev build merged (TASK-3.4); Design: UI kit gallery (P23) approved (TASK-8.1)
Design: P23 docs/design/pages/P23-ui-kit-gallery.md (mockup docs/design/mockups/P23-ui-kit-gallery.html; TASK-8.1)
Copy: docs/content/pages/P23-ui-kit-gallery.md
Contracts: C2 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-8.3-kit-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 components/ui provides the same components with the same names and props as the web kit using React Native Reusables, styled to docs/design/system.md §10, with Phosphor icons, sonner-native toasts and @gorhom/bottom-sheet for sheets.
- [ ] #2 A dev-only gallery screen shows every component in default, focus, disabled, error and loading states, in SL and EN and in light and dark, matching P23.
- [ ] #3 Targets are at least 44 px, text scales to 200 % (maxFontSizeMultiplier 2) without clipping, and components expose accessibility roles and labels (TalkBack spot check on Android).
- [ ] #4 Component tests cover the FormField error state and the Button loading state.
<!-- AC:END -->
