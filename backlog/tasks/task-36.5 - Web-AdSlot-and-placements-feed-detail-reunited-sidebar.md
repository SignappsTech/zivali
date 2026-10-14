---
id: TASK-36.5
title: 'Web AdSlot and placements: feed, detail, reunited, sidebar'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-14 23:37'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-35.2
  - TASK-31.4
  - TASK-18.2
  - TASK-26.4
  - TASK-7.1
  - TASK-36.4
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C14-ads-partners.md
  - docs/design/pages/P21-ad-slots.md
  - docs/tech/contracts/C12-analytics-consent.md
parent_task_id: TASK-36
priority: high
ordinal: 213000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Sponsors pay only for visible, trusted placements; ads must be clearly labelled and kept out of panic flows (FR-030).

## Packet

Unblocks on: Ad click endpoint GET /v1/ads/:id/click (counting redirect, no open redirect) merged (TASK-35.2); Web map and list browse with filters merged (TASK-31.4); Web report detail /r/[code]: SSR, slots, OG image, JSON-LD, 410 merged (TASK-18.2); Web My reports, owner actions and reunited screen merged (TASK-26.4); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Ad slots and house ads (P21) approved (TASK-36.4)
Design: P21 docs/design/pages/P21-ad-slots.md (mockup docs/design/mockups/P21-ad-slots.html; TASK-36.4)
Copy: docs/content/pages/P21-ad-slots.md
Contracts: C14, C12 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-36.5-adslot-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AdSlot renders the ad with the label Oglas/Ad, alt text, keyboard focus, rel "sponsored noopener", 44 px targets and reserved size (no layout shift), and collapses silently on failure, per P21.
- [ ] #2 Placements: a feed card every 8 cards (never first, never adjacent), one slot below the primary actions on the detail page, one on the reunited screen and one in the sidebar from lg.
- [ ] #3 An impression is recorded once per render in our DB regardless of consent; ad_impression and ad_click go to GA only with consent (slot, ad id, region, species).
- [ ] #4 An automated route test proves no ad on report-lost, report-found, manage, inbox, sign-in and payment routes; CLS stays below 0.1 on pages with slots.
- [ ] #5 Detail-slot copy never claims "nearest" unless true (for example "a vet in your region"); Vet Partner units render only when vet_partner.enabled is on and always carry the Oglas/Ad label.
<!-- AC:END -->
