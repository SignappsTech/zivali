---
id: TASK-24
title: Printable poster and sharing
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:02'
labels:
  - story
  - 'req:FR-011'
milestone: m-1
dependencies:
  - TASK-18
  - TASK-12
  - TASK-7
priority: medium
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners still print posters and post in Facebook groups; a good poster with a QR code and one-tap share pull that traffic back into the app.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an open lost report, when the owner taps Poster, then an A4 PDF in SL or EN is generated with a large photo, key details, area, a QR code and short link to the listing and no phone number, and poster_download fires (consent only).
- [ ] #2 Given the poster printed in greyscale, when scanned and read, then the QR still scans and the text stays legible.
- [ ] #3 Given a report, when the user taps Share, then WhatsApp, Facebook, copy link and the native share sheet are offered with prefilled localised text, and share fires (consent only).
- [ ] #4 Given a shared link, when previewed in WhatsApp or Facebook, then an Open Graph image shows the pet photo with type label and no exact location.
- [ ] #5 Given a FOUND report, when shared, then the preview never reveals where the animal is kept.
<!-- AC:END -->

## Packet

Unblocks on: detail route and action slots (TASK-18); deep link scheme (TASK-12); track() (TASK-7)
