---
id: TASK-12.2
title: 'Mobile shell: tabs, Report action, permission primer, settings stack'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 13:49'
labels:
  - fe
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-8.3
  - TASK-10.3
  - TASK-12.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P2-mobile-shell.md
  - docs/tech/contracts/C15-routes-deeplinks.md
  - docs/design/system.md
parent_task_id: TASK-12
priority: medium
ordinal: 139000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Feature screens need tab navigation, permission explainers and a settings stack first. This task owns app/_layout.tsx and the (tabs) layout.

## Packet

Unblocks on: Mobile UI kit: RN Reusables primitives styled to the design system, gallery screen merged (TASK-8.3); Mobile i18n: use-intl with shared catalogues, SL plural support, persisted choice merged (TASK-10.3); Design: Mobile shell (P2) approved (TASK-12.1)
Design: P2 docs/design/pages/P2-mobile-shell.md (mockup docs/design/mockups/P2-mobile-shell.html; TASK-12.1)
Copy: docs/content/pages/P2-mobile-shell.md
Contracts: C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-12.2-shell-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Signed in or out, the app shows bottom tabs Map, Report, Inbox and Profile with a prominent Report action, per the P2 mockup.
- [ ] #2 A PermissionPrimer component explains camera, location and notifications in plain language before the OS prompt, and a denial leaves a working fallback.
- [ ] #3 A settings stack exists (language, notifications, alerts, consent, payments, account) with placeholder screens for later stories.
- [ ] #4 Safe areas and dark mode work; Android screenshots are attached.
- [ ] #5 app/_layout.tsx mounts GestureHandlerRootView, BottomSheetModalProvider and Toaster (required by the TASK-8.3 kit: Sheet, Select, toast)
<!-- AC:END -->
