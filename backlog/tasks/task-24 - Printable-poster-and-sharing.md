---
id: TASK-24
title: Printable poster and sharing
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:02'
updated_date: '2026-10-14 23:08'
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
- [ ] #6 Given the poster QR code, when scanned, then it resolves to the public listing only (never to a pet profile, owner data or a tag page).
- [ ] #7 Given a report, when the owner opens the Facebook share kit, then it provides ready SL text, a square image and a list of regional Facebook lost-pet groups to post in (group names supplied by the client, shown as links) plus the Radio Aktual submission form.
<!-- AC:END -->

## Packet

Unblocks on: detail route and action slots (TASK-18); deep link scheme (TASK-12); track() (TASK-7)
