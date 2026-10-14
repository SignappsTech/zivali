---
id: TASK-12.5
title: >-
  Mobile local data layer: expo-sqlite store, local migrations, network state,
  wipe
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:39'
updated_date: '2026-10-14 23:38'
labels:
  - fe
  - 'est:M'
  - no-design
milestone: m-0
dependencies:
  - TASK-3.4
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C17-mobile-offline-data.md
  - docs/tech/adr/019-mobile-offline-data-layer.md
parent_task_id: TASK-12
priority: medium
ordinal: 261000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Offline cache, offline report queue, drafts and later geofences share one on-device store; building it with the app shell means no screen or flow has to be reworked for offline (ADR-019, TASK-85/86/87).
## Packet
Unblocks on: Mobile app scaffold: Expo SDK 57, Expo Router, NativeWind + RN Reusables, tokens, dev build merged (TASK-3.4)
Design: none (no UI of its own)
Contracts: C17 (in references); ADR-019
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-12.5-mob-data
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 apps/mobile/lib/db opens zivali.db with expo-sqlite and runs versioned local migrations (PRAGMA user_version) that create every C17 table: drafts, outbox, outbox_photos, reports_cache, cache_areas, geofences, geofence_events.
- [ ] #2 lib/net.ts exposes useNetworkState() and isUnmetered() from expo-network and drives TanStack onlineManager; no TanStack query persister is installed.
- [ ] #3 lib/offline/wipe.ts implements wipeLocalData({ reason }) per C17 (cache, areas, drafts, thumbnails and draft files, geofence cleanup hook; outbox and manage tokens only on account deletion) and signOutAndWipe() that asks the caller to resolve pending outbox items first.
- [ ] #4 File-budget helpers report bytes used by thumbnails and queued photos; jest tests cover migrations from empty and from version n-1, wipe, and that no table outside C17 exists.
<!-- AC:END -->
