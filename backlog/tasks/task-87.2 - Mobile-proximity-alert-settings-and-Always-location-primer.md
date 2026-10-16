---
id: TASK-87.2
title: Mobile proximity-alert settings and Always-location primer
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:40'
updated_date: '2026-10-16 01:03'
labels:
  - fe
  - 'est:S'
milestone: m-2
dependencies:
  - TASK-87.1
  - TASK-23.3
  - TASK-22.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C17-mobile-offline-data.md
  - docs/design/pages/P13-alerts-inbox-settings.md
parent_task_id: TASK-87
priority: medium
ordinal: 268000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Background location is sensitive; it must be an explicit, well-explained opt-in that is easy to switch off (FR-043 R-043.1, R-043.4).
## Packet
Unblocks on: Mobile geofence engine: region selection, offline handler, caps, local notifications merged (TASK-87.1); Mobile nearby-alert settings merged (TASK-23.3); Design: Notifications, nearby alerts and settings (P13) approved (TASK-22.2)
Design: P13 docs/design/pages/P13-alerts-inbox-settings.md (TASK-22.2); offline states requested from the design lead (CHANGE)
Copy: docs/content/pages/P13-alerts-inbox-settings.md (add offline-state keys as SL/EN drafts if missing and list them)
Contracts: C17 (in references); ADR-019
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-87.2-geofence-ui
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Settings → Alerts has a "Nearby reminders" switch; turning it on shows a plain-language primer (what is monitored, nothing uploaded, how to turn off) before the OS asks for Always location; declining leaves everything else working.
- [ ] #2 Turning it off removes all geofences at once; a permission downgraded by the OS disables the feature with an explanation.
- [ ] #3 The daily cap and quiet hours are shown; screen-reader labels verified on Android.
- [ ] #4 From the TASK-87.1 review: the geofence engine (apps/mobile/lib/offline/geofence.ts alertNear) never alerts users about their own reports. Skip report ids with a local manage token (outbox listManageTokenIds) or that appear in the user's own reports, with a test.
- [ ] #5 From the TASK-87.1 review: alertNear claims the geofence_events row before scheduleNotificationAsync. If scheduling throws, delete the claim, so that pet and area can still alert and the daily cap isn't spent. Test it.
<!-- AC:END -->
