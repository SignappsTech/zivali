---
id: TASK-35.1
title: >-
  Ad serving: get_ad targeting and rotation, house-ad fallback, aggregate
  counting
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-14 22:17'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-6.8
  - TASK-6.4
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C14-ads-partners.md
  - docs/tech/contracts/C6-location-geo-maps.md
parent_task_id: TASK-35
priority: high
ordinal: 179000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The client pitches sponsors as soon as users exist; serving must be cheap, privacy-safe and never empty (FR-029).

## Packet

Unblocks on: Abuse, payments, ads, leads and organisations schema with RLS and seed merged (TASK-6.8); Geo reference tables and geo_lookup() merged (TASK-6.4)
Contracts: C14, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-35.1-ads-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 get_ad(slot, ctx) returns the best active ad matching dates, slot, locale, region or municipality and species with weighted random rotation, and a house ad for the locale when nothing matches.
- [ ] #2 Unknown slots, including any report-flow slot, return VALIDATION; a pgTAP test enforces that only feed, detail, reunited and sidebar exist.
- [ ] #3 record_ad_event aggregates impressions and clicks per ad, slot, day (Europe/Ljubljana) and region with no user identifiers and a per-IP-hash guard; 100 impressions and 5 clicks yield exactly 100 and 5 (test).
- [ ] #4 Exclusive ads cannot overlap in dates for the same slot and region; only admins with aal2 can write ads.
- [ ] #5 The FR-029 example holds: a Gorenjska/dog ad is not served to a Ljubljana cat context (house ad returned).
- [ ] #6 get_ad returns no ad and no house ad when is_ad_free(auth.uid()) is true (active Premium entitlement); until entitlements exist (M4) the helper returns false; Podpornik supporters are not ad-free; pgTAP covers both.
<!-- AC:END -->
