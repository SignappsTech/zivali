---
id: TASK-23.1
title: 'Nearby alerts: subscription API and spatial fan-out job'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-14 23:38'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-6.7
  - TASK-6.3
  - TASK-6.12
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C10-notifications-alerts.md
  - docs/tech/contracts/C6-location-geo-maps.md
  - docs/content/notifications-and-emails.md
parent_task_id: TASK-23
priority: medium
ordinal: 171000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Community members become helpers when lost pets near them reach them within minutes (FR-010).

## Packet

Unblocks on: Matching, chat, notification and alert models with seed merged (TASK-6.7); Worker and jobs: pg-boss, queue registry with stubs, schedules, keep-alive, drain merged (TASK-6.3); API auth and platform middleware: JWKS verification, guards, rate limits, idempotency, ctx, audit, public config merged (TASK-6.12)
Contracts: C10, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-23.1-alerts-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET, PUT and DELETE /v1/alert-subscription require a non-anonymous, verified user, validate radius 1–25 km and species, and support pausing.
- [ ] #2 alerts.fanout on a visible LOST report finds subscribers whose area covers the fuzzed location (TypedSQL prisma/sql/alertRecipients.sql with GiST; excluding the report's managers and users at their daily cap, default 5) and sends nearby_lost notifications in chunks of 500.
- [ ] #3 Closing or reuniting a report stops pending deliveries (status check in notify.send); paused or disabled subscriptions receive nothing.
- [ ] #4 A local test creates 1000 matching subscribers and completes the fan-out in under 60 s.
<!-- AC:END -->
