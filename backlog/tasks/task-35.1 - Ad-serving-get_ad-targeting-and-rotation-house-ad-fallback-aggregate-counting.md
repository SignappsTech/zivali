---
id: TASK-35.1
title: >-
  Ad serving API: slot endpoint, targeting and rotation, house ads, impressions,
  no animal-sale ads
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 18:19'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-6.8
  - TASK-6.4
  - TASK-6.12
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

Unblocks on: Abuse, payments, ads, leads and organisations models with seed merged (TASK-6.8); Geo reference models, GURS seeder and TypedSQL geo lookup merged (TASK-6.4); API auth and platform middleware: JWKS verification, guards, rate limits, idempotency, ctx, audit, public config merged (TASK-6.12)
Contracts: C14, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-35.1-ads-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET /v1/ads/slot/:slot returns the best active ad matching dates, slot, locale, region or municipality and species with weighted random rotation, and a house ad for the locale when nothing matches; unknown slots, including any report-flow slot, return VALIDATION.
- [ ] #2 POST /v1/ads/:id/impressions aggregates impressions per ad, slot, day (Europe/Ljubljana) and region with no user identifiers, rate limited per IP hash; 100 impressions yield exactly 100 (test).
- [ ] #3 Ads that sell, give away or rehome animals are rejected on save and never served (category blocklist plus ads.blocked_terms keywords in SL and EN).
- [ ] #4 Exclusive ads cannot overlap in dates for the same slot and region; only admins with aal2 can write ads; a user with an active Premium entitlement (M4) gets no ad, until then nobody is ad-free.
- [ ] #5 The FR-029 example holds: a Gorenjska/dog ad is not served to a Ljubljana cat context (house ad returned).
<!-- AC:END -->
