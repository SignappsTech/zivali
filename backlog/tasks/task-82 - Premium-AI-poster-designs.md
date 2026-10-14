---
id: TASK-82
title: 'Premium AI: poster designs'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 22:13'
labels:
  - story
  - 'req:FR-026'
  - 'req:NFR-AI'
milestone: m-3
dependencies:
  - TASK-52
  - TASK-40
  - TASK-24
priority: medium
ordinal: 172000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Premium owners can pick from several AI-assisted poster designs; the standard PDF poster with QR stays free for everyone.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a Premium user, when they open Poster, then at least 3 design variants (layout, emphasis, colour) are offered for their report in SL or EN and each downloads as a print-ready A4 PDF.
- [ ] #2 Given any variant, when generated, then the QR resolves to the public listing only, contrast and greyscale rules of the standard poster apply and no phone number appears.
- [ ] #3 Given a free user, when they open Poster, then the standard poster downloads as before.
- [ ] #4 Given AI caps, when reached, then the standard poster is offered.
<!-- AC:END -->

## Packet

Unblocks on: hasEntitlement (TASK-52); AI service (TASK-40); poster generator and QR rule (TASK-24)
