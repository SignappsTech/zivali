---
id: TASK-35.2
title: 'Ad click endpoint GET /v1/ads/:id/click (counting redirect, no open redirect)'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 22:13'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-35.1
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C14-ads-partners.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-35
priority: high
ordinal: 180000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Clicks are counted in our DB through a redirect that can only go to the stored sponsor link (FR-029 R-029.4).

## Packet

Unblocks on: Ad serving API: slot endpoint, targeting and rotation, house ads, impressions, no animal-sale ads merged (TASK-35.1)
Design: none (no UI of its own)
Contracts: C14, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-35.2-ads-click-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET /v1/ads/:id/click?s=&r= counts the click in ad_stats_daily and redirects 302 to the stored https link only; unknown ids return 404 and no user-supplied target is ever followed.
- [ ] #2 No cookies are set and the endpoint is rate limited per IP hash.
- [ ] #3 Tests prove the count increments and that no open redirect is possible.
<!-- AC:END -->
