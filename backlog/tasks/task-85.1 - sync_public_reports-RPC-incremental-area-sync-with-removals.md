---
id: TASK-85.1
title: 'sync_public_reports RPC: incremental area sync with removals'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:39'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-6.6
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/tech/contracts/C17-mobile-offline-data.md
parent_task_id: TASK-85
priority: medium
ordinal: 262000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The mobile cache must refresh incrementally and drop closed, hidden and expired reports without downloading everything again (FR-041 R-041.4).
## Packet
Unblocks on: Reports, pets and photos schema, deterministic fuzz, public read model, seed merged (TASK-6.6)
Contracts: C4, C17 (in references); ADR-019
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-85.1-sync-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 sync_public_reports(areas ≤ 3 circles of ≤ 25 km, since, limit ≤ 1000) returns upserts with only the C4 CachedReport fields, removed_ids for reports in those areas that are no longer open and visible since `since`, server_time and has_more.
- [ ] #2 It never returns exact locations, chip numbers, tokens or contact data, is callable by anonymous and signed-in users, and is rate limited to 60 calls per hour per device id.
- [ ] #3 pgTAP covers first sync (since null), incremental changes, removal on close, reunite, expiry and hide, and the area filter; 1000 reports in an area return in under 500 ms locally.
<!-- AC:END -->
