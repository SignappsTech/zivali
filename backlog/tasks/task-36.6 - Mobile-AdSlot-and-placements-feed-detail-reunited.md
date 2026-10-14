---
id: TASK-36.6
title: 'Mobile AdSlot and placements: feed, detail, reunited'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-14 22:43'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-31.5
  - TASK-18.3
  - TASK-26.5
  - TASK-6.10
  - TASK-7.1
  - TASK-36.4
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C14-ads-partners.md
  - docs/design/pages/P21-ad-slots.md
  - docs/tech/contracts/C12-analytics-consent.md
parent_task_id: TASK-36
priority: high
ordinal: 214000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The same labelled placements appear in the app, never in protected flows (FR-030).

## Packet

Unblocks on: Mobile Map tab with list sheet and filters merged (TASK-31.5); Mobile report detail screen with slots merged (TASK-18.3); Mobile My reports, owner actions and reunited screen merged (TASK-26.5); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Ad slots and house ads (P21) approved (TASK-36.4)
Design: P21 docs/design/pages/P21-ad-slots.md (mockup docs/design/mockups/P21-ad-slots.html; TASK-36.4)
Copy: docs/content/pages/P21-ad-slots.md
Contracts: C14, C12 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-36.6-adslot-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AdSlot shows the labelled ad (Oglas/Ad) with alt text and opens the /a/ click URL in the in-app browser, per P21; failures collapse silently.
- [ ] #2 Placements: list card every 8 items (never first or adjacent), detail screen and reunited screen.
- [ ] #3 Impressions are recorded in our DB; GA events only with consent; a component test proves no AdSlot on report-flow, manage, chat, sign-in and payment screens.
<!-- AC:END -->
