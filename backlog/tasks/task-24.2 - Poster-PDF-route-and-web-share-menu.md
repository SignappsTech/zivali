---
id: TASK-24.2
title: Poster PDF route and web share menu
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-16 06:27'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-18.2
  - TASK-7.1
  - TASK-24.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P18-poster-share.md
  - docs/tech/contracts/C15-routes-deeplinks.md
  - docs/tech/contracts/C12-analytics-consent.md
parent_task_id: TASK-24
priority: medium
ordinal: 195000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners still print posters and post in Facebook groups; a QR poster and one-tap share pull that traffic back (FR-011).

## Packet

Unblocks on: Web report detail /r/[code]: SSR, slots, OG image, JSON-LD, 410 merged (TASK-18.2); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Poster and sharing (P18) approved (TASK-24.1)
Design: P18 docs/design/pages/P18-poster-share.md (mockup docs/design/mockups/P18-poster-share.html; TASK-24.1)
Copy: docs/content/pages/P18-poster-share.md
Contracts: C15, C12 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-24.2-poster-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /r/[code]/poster.pdf?lang=sl|en generates an A4 PDF in under 5 s with a large photo, key details, area name, QR code and short link (no phone number), high contrast and greyscale-safe, per P18.
- [ ] #2 Reports without a usable photo block the poster with a prompt; closed reports show 'reunited' or are unavailable.
- [ ] #3 The share slot offers WhatsApp, Facebook, copy link and the Web Share API with localised prefilled text.
- [ ] #4 poster_download and share fire with consent only; the OG preview shows the photo and type label and never an exact or holding location.
- [ ] #5 A greyscale print's QR scans and opens the listing (manual check, photo attached).
- [ ] #6 The share slot offers a Facebook share kit: ready SL text, a square 1080×1080 image (next/og route) and links to the regional Facebook lost-pet groups (share.facebook_groups from GET /v1/config/public, supplied by the client) plus the Radio Aktual submission form.
<!-- AC:END -->
