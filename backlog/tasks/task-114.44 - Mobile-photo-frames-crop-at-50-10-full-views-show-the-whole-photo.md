---
id: TASK-114.44
title: 'Mobile: photo frames crop at 50% 10%, full views show the whole photo'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 15:00'
updated_date: '2026-10-19 15:08'
labels:
  - fe
  - bug
  - mobile
  - 'est:S'
  - no-design
dependencies: []
references:
  - docs/tech/frontend.md§Standards
  - docs/design/system.md
parent_task_id: TASK-114
priority: medium
ordinal: 424200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mobile equivalent of web lib/photo.ts (TASK-114.43, CH-604). Owner photos are mostly portrait phone shots with the head in the upper part; a centre crop cuts it off.

## Packet

Unblocks on: - (bug fix to existing layouts; no wireframe needed)
Standard: docs/tech/frontend.md§Standards (Photo frames). Web reference: apps/web/lib/photo.ts (PHOTO_FOCUS 50% 10%).
Scope: apps/mobile only; one shared helper (e.g. lib/photo.ts exporting the expo-image props), not per-component values.
Review: tech-lead code review and design-lead visual review
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every report or pet photo in a row, card, thumb or map marker uses expo-image contentFit cover with contentPosition 50% 10% from one shared helper
- [ ] #2 Full views (report detail gallery, pet detail, match comparison, manage, reunited) show the whole photo (contain) on the muted surface
- [ ] #3 Checked with a portrait 3:4 and a landscape 4:3 photo on every mobile screen that shows report or pet photos (listed in the notes); jest tests for the helper
<!-- AC:END -->
