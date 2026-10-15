---
id: TASK-8.3
title: >-
  Mobile UI kit: RN Reusables primitives styled to the design system, gallery
  screen
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 07:05'
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
- [x] #1 components/ui provides the same components with the same names and props as the web kit using React Native Reusables, styled to docs/design/system.md §10, with Phosphor icons, sonner-native toasts and @gorhom/bottom-sheet for sheets.
- [x] #2 A dev-only gallery screen shows every component in default, focus, disabled, error and loading states, in SL and EN and in light and dark, matching P23.
- [ ] #3 Targets are at least 44 px, text scales to 200 % (maxFontSizeMultiplier 2) without clipping, and components expose accessibility roles and labels (TalkBack spot check on Android).
- [x] #4 Component tests cover the FormField error state and the Button loading state.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Done: components/ui on @rn-primitives (checkbox, switch, radio-group, tabs, dialog, alert-dialog, avatar, slot, hooks): Button/Spinner, Text, Icon, Label, FormField/FieldError, Input, Textarea, Select (bottom sheet of choice rows), Checkbox, RadioGroup/RadioGroupItem/ChoiceRow, Switch, Tabs, StatusLabel, Badge, Card, Avatar, Skeleton, EmptyState, Progress, Dialog, AlertDialog, Sheet (@gorhom/bottom-sheet), Toaster/toast (sonner-native). Dev gallery app/dev/kit.tsx (SL/EN, light/dark), no _layout edits. Tests: mobile 6 suites / 22 tests green; expo export android green; typecheck + lint clean. Full pnpm verify not run to the end (api#test needs local Postgres).

Follow-ups: (1) AC#3 TalkBack spot check and Android screenshots not done: react-native-svg and react-native-gesture-handler are new native modules, so a new EAS dev build is needed first. (2) TASK-12.2 shell: move GestureHandlerRootView + BottomSheetModalProvider + <Toaster closeLabel={t('common.close')}> into app/_layout.tsx (the gallery mounts them itself for now). (3) Gallery leaves out what the web kit also leaves out: bottom nav, flow top bar, pet row/tile, toggle pill, popover menu, map markers, the in-gallery 200 % frame (check with the OS setting). (4) No primary-action haptic: expo-haptics is not in ADR-017. (5) Web kit chip help still says 705 1234 5678 901 (content slice v0.3 is 9012).
<!-- SECTION:NOTES:END -->
