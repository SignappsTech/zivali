---
id: TASK-85.1
title: 'Sync feed API: GET /v1/sync/reports, incremental area sync with removals'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:39'
updated_date: '2026-10-15 21:52'
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
Unblocks on: Reports, pets and photos models, deterministic fuzz, public report endpoint, seed merged (TASK-6.6)
Contracts: C4, C17 (in references); ADR-019
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-85.1-sync-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET /v1/sync/reports (areas ≤ 3 circles of ≤ 25 km, since, limit ≤ 1000) returns upserts with only the C4 CachedReport fields, removed_ids for reports in those areas that are no longer open and visible since `since`, server_time and has_more, through TypedSQL.
- [ ] #2 It never returns exact locations, chip numbers, tokens or contact data, works without a session and is rate limited to 60 calls per hour per device id.
- [ ] #3 Supertest covers the first sync (since empty), incremental changes, removal on close, reunite, expiry and hide, and the area filter; 1000 reports in an area return in under 500 ms locally.
- [ ] #4 The has_more cursor follows C4§sync (CH from the TASK-85.2 review): server_time is an opaque cursor the client always sends back as since; with has_more it encodes (updated_at, id) of the page's last row with upserts and removals in one order; the final value overlaps in-flight transactions slightly (upserts are idempotent). Test: rows sharing one updated_at across a page boundary are all delivered.
<!-- AC:END -->
