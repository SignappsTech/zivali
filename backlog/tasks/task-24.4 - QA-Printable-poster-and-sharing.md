---
id: TASK-24.4
title: 'QA: Printable poster and sharing'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-14 23:37'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-24.2
  - TASK-24.3
  - TASK-24.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P18-poster-share.md
parent_task_id: TASK-24
priority: medium
ordinal: 242000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-24 (Printable poster and sharing) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: Poster PDF route and web share menu merged (TASK-24.2); Mobile share sheet and poster download merged (TASK-24.3); Design: Poster and sharing (P18) approved (TASK-24.1)
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an open lost report, when the owner taps Poster, then an A4 PDF in SL or EN is generated with a large photo, key details, area, a QR code and short link to the listing and no phone number, and poster_download fires (consent only).
- [ ] #2 Given the poster printed in greyscale, when scanned and read, then the QR still scans and the text stays legible.
- [ ] #3 Given a report, when the user taps Share, then WhatsApp, Facebook, copy link and the native share sheet are offered with prefilled localised text, and share fires (consent only).
- [ ] #4 Given a shared link, when previewed in WhatsApp or Facebook, then an Open Graph image shows the pet photo with type label and no exact location.
- [ ] #5 Given a FOUND report, when shared, then the preview never reveals where the animal is kept.
- [ ] #6 Given the poster QR code, when scanned, then it resolves to the public listing only (never to a pet profile, owner data or a tag page).
- [ ] #7 Given a report, when the owner opens the Facebook share kit, then it provides ready SL text, a square image and a list of regional Facebook lost-pet groups to post in (group names supplied by the client, shown as links) plus the Radio Aktual submission form.
- [ ] #8 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
