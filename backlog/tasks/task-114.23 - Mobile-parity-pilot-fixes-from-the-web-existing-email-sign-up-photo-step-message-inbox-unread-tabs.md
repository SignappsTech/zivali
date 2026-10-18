---
id: TASK-114.23
title: >-
  Mobile parity: pilot fixes from the web (existing-email sign-up, photo-step
  message, inbox unread tabs)
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 02:19'
updated_date: '2026-10-18 05:10'
labels:
  - fe
  - mobile
  - 'est:S'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: low
ordinal: 363200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up from the web pilot fixes (2026-10-18). The developers found the same gaps in the Expo app (apps/mobile), which ships after the store accounts (web-first pilot):
1. TASK-114.1: mobile sign-up with an already confirmed email still shows the check-your-email screen; show the field error with sign-in and forgot-password links, as on the web.
2. TASK-114.5: the mobile lost flow probably jumps back to the photo step silently on a photo_ids VALIDATION (not checked); show the photos.rejected / photos.limit message on the photo step.
3. TASK-114.10: the mobile inbox tabs do not show which tab has unread items; mirror the web tab dot, its accessible name and the default tab.
Check each one first; close any item that is not a gap.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each of the three items checked in the mobile app; the gaps fixed like the web (SL and EN), the rest noted as not a gap
- [ ] #2 Unit tests updated for the changed screens
<!-- AC:END -->
