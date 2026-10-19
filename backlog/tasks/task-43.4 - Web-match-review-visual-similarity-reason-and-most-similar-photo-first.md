---
id: TASK-43.4
title: 'Web match review: visual similarity reason and most similar photo first'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 21:25'
updated_date: '2026-10-19 10:15'
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
ordinal: 386200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners see why a photo-based suggestion was made and look at the closest photo first, and can still reject it (FR-014, TASK-43 AC#3). One more reason line in the existing P11 pattern, no layout change.

## Packet

Unblocks on: AI wire types and the match fixture with a visual reason merged (TASK-40.2); P11 visual reason copy delivered (TASK-40.6). Code against the fixture until TASK-43.2 lands.
Design: P11 reason rows as built (no new layout; no-design)
Copy: docs/content/pages/P11-match-review.md (visual reason lines)
Contracts: C8 §Visual similarity 3 and 8; conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-43.4-match-visual-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A visual reason renders its band line (very similar, similar, some) in the existing reasons list with the P11 copy in SL and EN
- [x] #2 The comparison shows the other report's photos in API order (most similar first) and the lost report's lost_photo_id first; confirm and reject work as before
- [ ] #3 Tests with the fixture; axe clean
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Lead 2026-10-19: dispatched by hand for the owner's AI test today; the P11 visual reason copy is delivered (TASK-40.6 AC2). Its pending legal approval gates switching AI on (TASK-40.7), not this build.
<!-- SECTION:NOTES:END -->
