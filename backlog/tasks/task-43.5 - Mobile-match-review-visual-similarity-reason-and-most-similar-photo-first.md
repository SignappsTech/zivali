---
id: TASK-43.5
title: 'Mobile match review: visual similarity reason and most similar photo first'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 21:25'
updated_date: '2026-10-18 21:29'
labels:
  - fe
  - 'est:S'
  - no-design
milestone: m-2
dependencies:
  - TASK-40.2
  - TASK-40.6
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C8-matching.md§Visual similarity
  - docs/design/pages/P11-match-review.md§Review screen
  - docs/content/pages/P11-match-review.md
parent_task_id: TASK-43
priority: high
ordinal: 387200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The same explanation and photo order in the app, where owners mostly review matches (FR-014, TASK-43 AC#3). One more reason line in the existing P11 pattern, no layout change.

## Packet

Unblocks on: AI wire types and the match fixture with a visual reason merged (TASK-40.2); P11 visual reason copy delivered (TASK-40.6). Code against the fixture until TASK-43.2 lands.
Design: P11 reason rows as built (no new layout; no-design)
Copy: docs/content/pages/P11-match-review.md (visual reason lines)
Contracts: C8 §Visual similarity 3 and 8; conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-43.5-match-visual-mobile
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A visual reason renders its band line (very similar, similar, some) in the existing reasons list with the P11 copy in SL and EN
- [ ] #2 The comparison shows the other report's photos in API order (most similar first) and the lost report's lost_photo_id first; confirm and reject work as before
- [ ] #3 jest-expo tests with the fixture; screen reader reads the reason line
<!-- AC:END -->
