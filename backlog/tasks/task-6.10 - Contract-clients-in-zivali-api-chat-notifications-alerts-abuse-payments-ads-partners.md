---
id: TASK-6.10
title: >-
  Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments,
  ads, partners
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
labels:
  - fe
  - 'est:M'
  - no-design
milestone: m-0
dependencies:
  - TASK-3.5
  - TASK-6.5
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C9-chat.md
  - docs/tech/contracts/C10-notifications-alerts.md
  - docs/tech/contracts/C14-ads-partners.md
parent_task_id: TASK-6
priority: high
ordinal: 130000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
UI tasks code against these functions while backend tasks implement the RPCs and Edge Functions. Also covers C11 (abuse) and C13 (payments).

## Packet

Unblocks on: packages/api foundation: client conventions, ApiError, query defaults, fixtures merged (TASK-3.5); Domain wire types, zod schemas, chip normalisation and breed codes merged (TASK-6.5)
Design: none (no UI of its own)
Contracts: C9, C10, C14 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.10-api-collab
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 @zivali/api/chat, notifications, alerts, abuse, payments, ads and partners implement every client function named in C9, C10, C11, C13 and C14, including realtime subscriptions for messages and notifications.
- [ ] #2 useAd(slot, ctx) returns { ad, loading, error } and never throws to the caller (errors collapse the slot).
- [ ] #3 startCheckout returns the checkout URL; the web helper redirects and mobile opens it with expo-web-browser.
- [ ] #4 Fixtures from the contract examples exist for each domain; unit tests cover argument and error mapping.
<!-- AC:END -->
