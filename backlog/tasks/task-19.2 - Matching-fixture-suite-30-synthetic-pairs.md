---
id: TASK-19.2
title: 'Matching fixture suite: 30+ synthetic pairs'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 21:27'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-19.1
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C8-matching.md
parent_task_id: TASK-19
priority: high
ordinal: 166000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Thresholds must be tunable with evidence and regressions caught locally without cloud services (R-010).

## Packet

Unblocks on: Matching engine v1: chip, geo, time, attributes; idempotent suggestions merged (TASK-19.1)
Contracts: C8 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-19.2-matching-fixtures
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A fixture set of at least 30 synthetic pairs (chip, near and far, early and late, species mismatch, sex conflict, colour and size overlaps, a rejected pair) runs locally without cloud services.
- [x] #2 Tests assert expected inclusion, order and strength for each fixture, and that a rejected pair never reappears after a rerun.
- [x] #3 Results print as a small table so thresholds can be tuned later.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
apps/api/test/domains/matching.fixtures.test.ts: 36 synthetic pairs in 8 groups (chip, chip-sighting, distance, time, species-sex, colour, size, rejected), hand-labelled with inclusion, rank and strength for the C8 defaults; points pinned after insert, so scores repeat exactly. Runs on the local DB only (mocks, no cloud). Prints a table (group, fixture, km, Δh, expected, got, score, rank) plus the matching.* config in use; to tune: change app_config, rerun, relabel. Rejected pair: rejectMatch, then match.report for every report from both sides; it stays rejected with its score and never returns. Mutation check: a mislabelled fixture fails its group test. Verified on scratch DB task_19_2.
<!-- SECTION:NOTES:END -->
