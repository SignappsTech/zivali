---
id: TASK-38.2
title: 'Partner stats job and endpoint, lead endpoint with captcha'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 21:54'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-6.8
  - TASK-6.3
  - TASK-6.4
  - TASK-3.9
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

Unblocks on: Abuse, payments, ads, leads and organisations models with seed merged (TASK-6.8); Worker and jobs: pg-boss, queue registry with stubs, schedules, keep-alive, drain merged (TASK-6.3); Geo reference models, GURS seeder and TypedSQL geo lookup merged (TASK-6.4); API adapters ported from the TASK-3.2 branch, plus a storage adapter (R2, MinIO, memory) merged (TASK-3.9)
Contracts: C14, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-38.2-partners-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The partners.stats job (hourly) computes totals and per-region users, active reports and 90-day reunions into partner_stats_snapshot; GET /v1/partners/stats returns them with every value from 1 to 4 shown as '<5' and public caching for 1 h.
- [ ] #2 POST /v1/leads validates the input (including interest ad, vet_partner or unsure), verifies the captcha through the adapter (mock locally), rate limits 3/hour per IP, stores the lead with the consent time and emails LEADS_NOTIFY_EMAIL; GET /v1/admin/leads lists leads for admins.
- [ ] #3 GA Data API enrichment stays behind the partners.ga_enrichment flag (off) and the stats work DB-only.
- [ ] #4 Tests cover masking, the lead flow and the rate limit.
<!-- AC:END -->
