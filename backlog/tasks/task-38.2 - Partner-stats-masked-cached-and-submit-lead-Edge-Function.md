---
id: TASK-38.2
title: 'Partner stats (masked, cached) and submit-lead Edge Function'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-6.8
  - TASK-6.3
  - TASK-6.4
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C14-ads-partners.md
  - docs/tech/contracts/C6-location-geo-maps.md
parent_task_id: TASK-38
priority: high
ordinal: 182000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Partners page is the client's pitch tool: live, honest numbers and a working contact form (FR-032).

## Packet

Unblocks on: Abuse, payments, ads, leads and organisations schema with RLS and seed merged (TASK-6.8); Job queue: pgmq, enqueue_job, pg_cron trigger, worker with handler registry merged (TASK-6.3); Geo reference tables and geo_lookup() merged (TASK-6.4)
Contracts: C14, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-38.2-partners-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 get_partner_stats returns totals and per-region users, active reports and 90-day reunions from a materialised view refreshed hourly, with every value from 1 to 4 returned as '<5'.
- [ ] #2 submit-lead validates input, verifies captcha (mock locally), rate limits 3/hour per IP hash, stores the lead with consent time and emails LEADS_NOTIFY_EMAIL through the email adapter.
- [ ] #3 GA Data API enrichment stays behind the partners.ga_enrichment flag (off) and the stats work DB-only.
- [ ] #4 Tests cover masking, the lead flow and the rate limit.
<!-- AC:END -->
