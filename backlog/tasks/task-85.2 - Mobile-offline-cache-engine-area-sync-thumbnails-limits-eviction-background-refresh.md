---
id: TASK-85.2
title: >-
  Mobile offline cache engine: area sync, thumbnails, limits, eviction,
  background refresh
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:39'
labels:
  - fe
  - 'est:M'
  - no-design
milestone: m-1
dependencies:
  - TASK-12.5
  - TASK-6.9
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C17-mobile-offline-data.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/tech/adr/019-mobile-offline-data-layer.md
parent_task_id: TASK-85
priority: medium
ordinal: 263000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
People search outdoors with weak signal; nearby public reports must be on the device before they are needed, without draining battery or data (FR-041, NFR-OFFLINE, NFR-BATT).
## Packet
Unblocks on: >- merged (TASK-12.5); >- merged (TASK-6.9)
Design: none (no UI of its own)
Contracts: C17, C4 (in references); ADR-019
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-85.2-cache-sync
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 @zivali/api/sync wraps sync_public_reports; the engine syncs the home area (profile, capped at 10 km) and the current area (last foreground location, 10 km), applies upserts and removed_ids and stores server_time as the next cursor.
- [ ] #2 Refresh runs on foreground resume when the last sync is older than 15 minutes, on regaining an unmetered connection and through expo-background-task on unmetered networks only; thumbnails download on Wi-Fi unless the user allowed mobile data.
- [ ] #3 Limits from settings (default 50 MB, 7 days) are enforced after each sync: stale rows first, then farthest and oldest, thumbnails included in the size budget.
- [ ] #4 lib/data/reports.ts serves map and list queries from the network when online (upserting the cache) and from SQLite when offline or on network errors, returning source and lastSyncAt.
- [ ] #5 A jest test dumps the database after a sync and proves it holds only C17 public columns, with every coordinate equal to a fuzzed area from the server fixture (no exact points, chips, contacts or chat).
<!-- AC:END -->
