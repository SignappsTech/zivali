---
id: TASK-23.3
title: Mobile nearby-alert settings
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-16 09:28'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-15.5
  - TASK-9.4
  - TASK-6.10
  - TASK-7.1
  - TASK-22.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C10-notifications-alerts.md
  - docs/design/pages/P13-alerts-inbox-settings.md
  - docs/tech/contracts/C6-location-geo-maps.md
parent_task_id: TASK-23
priority: medium
ordinal: 194000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Alert settings live under Profile in the app (FR-010).

## Packet

Unblocks on: Mobile LocationPicker: GPS, pin, search, radius, permission fallback merged (TASK-15.5); Mobile sign-in, sign-up, verification, reset and profile merged (TASK-9.4); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Notifications, nearby alerts and settings (P13) approved (TASK-22.2)
Design: P13 docs/design/pages/P13-alerts-inbox-settings.md (mockup docs/design/mockups/P13-alerts-inbox-settings.html; TASK-22.2)
Copy: docs/content/pages/P13-alerts-inbox-settings.md
Contracts: C10, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-23.3-alerts-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Profile → Alerts sets the home area, radius 1–25 km (default 5), species and opt-in or pause, per P13.
- [x] #2 Opt-in fires alert_opt_in with consent only; unverified users see the verify prompt.
- [ ] #3 Screen-reader labels and the radius control are verified on Android.
<!-- AC:END -->
