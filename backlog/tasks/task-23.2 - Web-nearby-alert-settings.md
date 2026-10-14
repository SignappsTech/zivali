---
id: TASK-23.2
title: Web nearby-alert settings
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-15.3
  - TASK-9.3
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
ordinal: 193000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Community members choose the area and species they want to help with (FR-010).

## Packet

Unblocks on: Web LocationPicker: GPS, pin, search, radius, permission fallback merged (TASK-15.3); Web sign-in, sign-up, verification, reset, account page and guards merged (TASK-9.3); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Notifications, nearby alerts and settings (P13) approved (TASK-22.2)
Design: P13 docs/design/pages/P13-alerts-inbox-settings.md (mockup docs/design/mockups/P13-alerts-inbox-settings.html; TASK-22.2)
Copy: docs/content/pages/P13-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report)
Contracts: C10, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-23.2-alerts-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /account/alerts sets the home area (LocationPicker alert mode), radius 1–25 km (default 5), species and opt-in or pause, per P13.
- [ ] #2 Opt-in fires alert_opt_in with species and region only (consent only); unverified users see the verify prompt.
- [ ] #3 axe 0 violations; Playwright covers opt-in and pause.
<!-- AC:END -->
