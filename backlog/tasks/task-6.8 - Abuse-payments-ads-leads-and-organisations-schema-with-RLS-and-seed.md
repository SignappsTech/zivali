---
id: TASK-6.8
title: 'Abuse, payments, ads, leads and organisations schema with RLS and seed'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
labels:
  - be
  - 'est:M'
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

Unblocks on: Reports, pets and photos schema, deterministic fuzz, public read model, seed merged (TASK-6.6)
Contracts: C11, C13, C14 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.8-commerce-schema
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 abuse_reports, moderation_flags, payments, payment_events, ads, ad_stats_daily, leads, organisations and organisation_members (minimal: name, kind, verified_at; member role) exist with constraints and RLS from C11, C13 and C14; RLS matrix tests.
- [ ] #2 The ad_slot enum has exactly feed, detail, reunited and sidebar; the database rejects non-https ad links and missing or too-short alt text.
- [ ] #3 Seed: three house ads (supporter, partner, adopt) in SL and EN with placeholder copy marked for the content strategist, two sponsor ads targeted by region and species, and one verified shelter with an intake FOUND report (source organisation).
- [ ] #4 data-inventory.json entries are added and `pnpm gen:types` output is committed.
<!-- AC:END -->
