---
id: TASK-6.8
title: 'Abuse, payments, ads, leads and organisations models with seed'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-14 23:38'
labels:
  - be
  - 'est:S'
milestone: m-0
dependencies:
  - TASK-6.6
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C11-abuse-reports.md
  - docs/tech/contracts/C13-payments.md
  - docs/tech/contracts/C14-ads-partners.md
parent_task_id: TASK-6
priority: high
ordinal: 128000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Abuse reporting, payments, ads, the Partners page and the shelter intake exemption build against agreed tables and seeded rows.

## Packet

Unblocks on: Reports, pets and photos models, deterministic fuzz, public report endpoint, seed merged (TASK-6.6)
Contracts: C11, C13, C14 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.8-commerce-schema
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Prisma models abuse_reports, moderation_flags, payments, payment_events, ads, ad_stats_daily, leads (with interest), partner_stats_snapshot, organisations and organisation_members per C11, C13 and C14, with RLS enabled and data-inventory entries.
- [ ] #2 The AD_SLOT enum has exactly FEED, DETAIL, REUNITED and SIDEBAR; database checks reject non-https ad links and alt text outside 5–140 characters.
- [ ] #3 Seeder 30-commerce creates the three house ads (SL and EN, placeholder copy marked for the content strategist), two sponsor ads targeted by region and species, and one verified shelter with an intake FOUND report.
<!-- AC:END -->
