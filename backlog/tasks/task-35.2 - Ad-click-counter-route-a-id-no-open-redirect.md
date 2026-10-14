---
id: TASK-35.2
title: 'Ad click counter route /a/[id] (no open redirect)'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
labels:
  - fe
  - 'est:S'
  - no-design
milestone: m-1
dependencies:
  - TASK-3.3
  - TASK-6.10
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C14-ads-partners.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-35
priority: high
ordinal: 180000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Clicks are counted in our DB through a redirect that can only go to the stored sponsor link (FR-029 R-029.4).

## Packet

Unblocks on: Web app scaffold: Next.js 16, Tailwind 4 + shadcn, tokens, locale routing, Supabase helpers merged (TASK-3.3); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10)
Design: none (no UI of its own)
Contracts: C14, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-35.2-ads-click-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET /a/[id]?s=<slot>&r=<region> records a click through record_ad_event and redirects 302 to the stored https link only; unknown ids return 404 and no user-supplied target is ever followed.
- [ ] #2 The route is excluded from indexing and sets no cookies.
- [ ] #3 A test proves the count increments and that no open redirect is possible.
<!-- AC:END -->
