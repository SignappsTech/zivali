---
id: TASK-23.1
title: 'Nearby alerts: subscriptions and spatial fan-out'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-6.7
  - TASK-6.3
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C10-notifications-alerts.md
  - docs/tech/contracts/C6-location-geo-maps.md
parent_task_id: TASK-23
priority: medium
ordinal: 171000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Community members become helpers when lost pets near them reach them within minutes (FR-010).

## Packet

Unblocks on: Matching, chat, notification and alert schema with RLS and seed merged (TASK-6.7); Job queue: pgmq, enqueue_job, pg_cron trigger, worker with handler registry merged (TASK-6.3)
Contracts: C10, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-23.1-alerts-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 upsert_alert_subscription requires a verified email, validates radius 1–25 km and species, and supports pausing.
- [ ] #2 fanout_alerts on a visible LOST report finds subscribers whose area covers the fuzzed location (GiST; excluding the report's managers and users at their daily cap, default 5) and enqueues nearby_lost notifications in chunks of 500.
- [ ] #3 Closing or reuniting a report stops pending deliveries (status check in notify); paused or disabled subscriptions receive nothing.
- [ ] #4 A local test creates 1000 matching subscribers and completes the fan-out in under 60 s.
<!-- AC:END -->
