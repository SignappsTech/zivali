---
id: TASK-70
title: 'Observability, backups and recovery drill'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:05'
labels:
  - story
  - 'req:NFR-OBS'
  - 'req:NFR-AVAIL'
milestone: m-4
dependencies:
  - TASK-5
priority: medium
ordinal: 70000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A lost-pet product must be available when people panic; errors must be seen quickly and data must be recoverable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given web and edge functions, when errors occur, then they are captured (error tracking with personal data scrubbing) and alert the team within 5 minutes.
- [ ] #2 Given external uptime monitoring, when home, API health and Realtime checks fail, then an alert reaches the defined channel.
- [ ] #3 Given a restore drill on staging, when the database is restored from backup, then it completes within the documented recovery time target and photo storage restore is documented.
- [ ] #4 Given the runbook, when reviewed, then it covers incident steps, AI, Stripe and Supabase outages and rollback of a bad migration.
<!-- AC:END -->

## Packet

Unblocks on: staging and production environments exist (TASK-5)
