---
id: TASK-43.1
title: >-
  Matching v3 scorer: visual term and bands, lifted veto, geo-time cap, v2
  fallback
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:24'
updated_date: '2026-10-18 23:01'
labels:
  - be
  - 'est:S'
milestone: m-2
dependencies:
  - TASK-40.2
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C8-matching.md§Visual similarity
  - docs/tech/contracts/C8-matching.md§Engine
parent_task_id: TASK-43
priority: high
ordinal: 383200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Visual similarity blended into the score, explainable through a band, without ever making the v2 behaviour worse when no vector exists (FR-014 R-014.2).

## Packet

Unblocks on: AI wire types merged, incl. the visual MatchReason (TASK-40.2)
Contracts: C8 §Visual similarity (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-43.1-scorer-v3
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 scoreMatch with visual null returns exactly the v2 result for every existing fixture (the 42-pair suite is unchanged)
- [x] #2 With visual: the matching.weights_visual blend; evidence A > 0 or V >= 0.5; a different known sex always vetoes, size and colour vetoes are lifted at V >= 0.8; visual-only or lifted-veto suggestions stay possible without a geo-time fit; a chip match is still 1.0 strong
- [x] #3 The visual reason carries the band and both photo ids; MATCH_ALGO_VERSION is v3; at least 20 new fixture pairs, including look-alike black cats far apart or days apart that never reach good
- [ ] #4 Unit tests; pnpm verify green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TASK-43.1 (backend-dev, 2026-10-19): v3 scorer in packages/validation/src/matching.ts. Geo-time cap generalised (V never raises the strength above the pair's v2 one without a geo-time fit), see CHANGE rows for C8 Visual similarity in backlog/changes.md (2 rows, TASK-43.1). Verified: validation tsc/eslint/vitest 156 green; api tsc green; matching.fixtures (42 pairs unchanged), matching.domain, matching-rescore on scratch DB task_43_1: 28/29, the 1 failure is auth.users missing in a plain scratch DB (notify delivery), not the scorer. Full pnpm verify not run in the worktree (next build forbidden there): run it at merge.
<!-- SECTION:NOTES:END -->
