---
id: TASK-85.3
title: 'Mobile offline states for map and list, offline data settings'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:39'
updated_date: '2026-10-16 00:15'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-85.2
  - TASK-31.5
  - TASK-12.2
  - TASK-31.2
  - TASK-22.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C17-mobile-offline-data.md
  - docs/design/pages/P4-map-list.md
  - docs/design/pages/P13-alerts-inbox-settings.md
parent_task_id: TASK-85
priority: medium
ordinal: 264000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users must see clearly that they are offline and how fresh the data is, and control what the app keeps on the device (FR-041 R-041.2, R-041.3).
## Packet
Unblocks on: Mobile offline cache engine: area sync, thumbnails, limits, eviction, background refresh merged (TASK-85.2); Mobile Map tab with list sheet and filters merged (TASK-31.5); Mobile shell: tabs, Report action, permission primer, settings stack merged (TASK-12.2); Design: Map and list (browse) (P4) approved (TASK-31.2); Design: Notifications, nearby alerts and settings (P13) approved (TASK-22.2)
Design: P4 docs/design/pages/P4-map-list.md (TASK-31.2); offline states requested from the design lead (CHANGE); P13 docs/design/pages/P13-alerts-inbox-settings.md (TASK-22.2); offline states requested from the design lead (CHANGE)
Copy: docs/content/pages/P4-map-list.md; docs/content/pages/P13-alerts-inbox-settings.md (add offline-state keys as SL/EN drafts if missing and list them)
Contracts: C17 (in references); ADR-019
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-85.3-cache-ui
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Offline, the Map tab and list show cached reports with an "Offline, last updated …" state; first launch offline shows an explanatory empty state.
- [ ] #2 Actions that need a connection (contact, report abuse, share link, poster) are disabled with a short reason; reading cached details still works.
- [ ] #3 Settings → Offline data shows size used and last update, offers "Clear offline data" and the "Use mobile data for offline photos" switch (off by default).
- [ ] #4 Airplane-mode screenshots on Android are attached; screen-reader announces the offline state.
- [ ] #5 The root _layout mounts useOfflineCache() from lib/offline (TASK-85.2), so the background task is defined on a headless launch and the home area follows the profile (null when signed out).
<!-- AC:END -->
