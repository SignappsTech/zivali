---
id: TASK-114.43
title: 'Web: uploaded photos are cropped so hard that the animal is cut off'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 10:13'
labels:
  - fe
  - bug
  - 'est:S'
dependencies: []
references:
  - docs/design/system.md
  - docs/tech/frontend.md
parent_task_id: TASK-114
priority: high
ordinal: 413200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-19, with four screenshots: uploaded photos are cropped hard everywhere we show them, and the crop mostly loses the cat's head. Typical phone photos are portrait and the animal's head sits in the upper part, while our frames are landscape (4:3) and object-fit cover crops around the centre.

## Packet

Unblocks on: - (bug fix to existing layouts; no wireframe needed)
Design: docs/design/system.md (photo frames and imagery rules); keep the existing frames and radii
Review: tech-lead code review (full mode) and design-lead visual review
Branch: agent/task-114.43-photo-crop
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Report detail, galleries and any full-size view show the whole photo uncropped (letterboxed on a design-system surface), for portrait, landscape and square photos
- [ ] #2 Cards, rows, thumbnails and map popups keep their frames but anchor the crop near the top, so the animal's head stays in view; one shared class or helper, not per-component values
- [ ] #3 Checked with a portrait 3:4 and a landscape 4:3 photo on every web screen that shows report or pet photos (listed in the report); unit tests
- [ ] #4 CHANGE rows: the mobile app equivalent; tech-lead: a focal point per photo from the AI's animal box later (C19)
<!-- AC:END -->
