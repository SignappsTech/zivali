---
id: TASK-37.3
title: 'Web admin ad management: editor with preview, stats and CSV'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-16 09:45'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-34.3
  - TASK-36.5
  - TASK-6.10
  - TASK-37.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C14-ads-partners.md
  - docs/design/pages/P20-admin-ads.md
parent_task_id: TASK-37
priority: high
ordinal: 215000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Admins create, schedule, target and report on ads by hand until self-serve (FR-031).

## Packet

Unblocks on: Web admin shell: role navigation, TOTP enrolment and challenge, audit log merged (TASK-34.3); Web AdSlot and placements: feed, detail, reunited, sidebar merged (TASK-36.5); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); Design: Admin ad management (P20) approved (TASK-37.1)
Design: P20 docs/design/pages/P20-admin-ads.md (mockup docs/design/mockups/P20-admin-ads.html; TASK-37.1)
Copy: docs/content/pages/P20-admin-ads.md
Contracts: C14 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-37.3-ads-admin-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Admins list ads and create or edit them with image upload, title, text, link, languages, slots, region or municipality, species, dates and status, with a live preview per slot using AdSlot, per P20.
- [ ] #2 Server validation errors are shown per field.
- [ ] #3 The ad detail shows impressions, clicks and CTR per day, slot and region with CSV export.
- [ ] #4 The three house ads are editable and can be enabled per language.
<!-- AC:END -->
