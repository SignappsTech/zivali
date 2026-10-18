---
id: TASK-43.3
title: >-
  Matching evaluation harness: at least 100 labelled pairs, recall@10 and
  precision, v2 vs v3, thresholds
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:25'
updated_date: '2026-10-18 21:29'
labels:
  - be
  - 'est:M'
milestone: m-2
dependencies:
  - TASK-43.1
  - TASK-42.1
references:
  - docs/tech/contracts/C8-matching.md§Visual similarity
  - docs/tech/contracts/C20-image-embeddings.md§Adapter
  - docs/tech/backend.md§Commands
parent_task_id: TASK-43
priority: high
ordinal: 385200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Photo matching ships only if it measurably does not make suggestions worse, and its thresholds are chosen on data, not guessed (FR-014 R-014.4).

## Packet

Unblocks on: v3 scorer merged (TASK-43.1); photo.embed with the Voyage adapter merged (TASK-42.1); the owner provides or approves the labelled photo set (open question in the M3 breakdown)
The real-photo run happens once in the main checkout with the owner's VOYAGE_API_KEY (within the free allowance); its vectors are cached as fixtures so later runs send nothing.
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-43.3-matching-eval
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm --filter api eval:matching scores at least 100 labelled pairs (at least 50 positives, at least 50 hard negatives) through v2 and v3 and reports recall@10 per lost report and precision at notify_min_strength; the synthetic set (mock embedder labels) runs in pnpm verify and asserts v3 is not worse than v2
- [ ] #2 A real-photo set in apps/api/test/eval/matching/ (licence per file, at least 50 positive pairs of the same animal in different photos) embedded once with Voyage; its vectors are committed as fixtures
- [ ] #3 The run picks visual_floor, visual_ceiling, weights_visual and the band cut-offs; v3 ships only if not worse than v2 on both metrics; results and chosen values are in the task notes and a CHANGE to C8§Visual similarity records them
<!-- AC:END -->
