---
id: TASK-87.1
title: >-
  Mobile geofence engine: region selection, offline handler, caps, local
  notifications
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:39'
updated_date: '2026-10-15 21:55'
labels:
  - fe
  - 'est:M'
  - no-design
milestone: m-2
dependencies:
  - TASK-85.2
  - TASK-12.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C17-mobile-offline-data.md
  - docs/tech/contracts/C10-notifications-alerts.md
  - docs/tech/adr/019-mobile-offline-data-layer.md
parent_task_id: TASK-87
priority: medium
ordinal: 267000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Walking near where a pet was last seen is the best moment to ask for help, even offline; OS geofences do it without continuous GPS (FR-043, NFR-BATT).
## Packet
Unblocks on: Mobile offline cache engine: area sync, thumbnails, limits, eviction, background refresh merged (TASK-85.2); Deep links (App Links, universal links) and push token registration path merged (TASK-12.3)
Design: none (no UI of its own)
Contracts: C17, C10 (in references); ADR-019
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-87.1-geofence
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Regions are chosen from open LOST areas in the cache, nearest then most recent, at most 18 on iOS and 50 on Android plus one 2 km boundary region whose exit re-runs selection; selection also re-runs after each cache sync.
- [ ] #2 The expo-task-manager handler works offline: skips reports no longer open, applies once per pet per area, the daily cap (default 3) and cached quiet hours, then shows a local notification ("You are near where Maks was last seen yesterday, keep an eye out") with a deep link to the listing.
- [ ] #3 No network call is made from the handler and no location is uploaded; only public fuzzed areas are monitored.
- [ ] #4 Turning the feature off, signing out or losing the Always permission stops geofencing and clears registered regions; jest tests with a mocked task manager cover selection limits, caps, quiet hours and cleanup.
<!-- AC:END -->
