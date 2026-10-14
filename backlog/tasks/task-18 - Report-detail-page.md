---
id: TASK-18
title: Report detail page
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:02'
labels:
  - story
  - 'req:FR-007'
milestone: m-1
dependencies:
  - TASK-6
  - TASK-8
priority: high
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every other story links to or acts from one listing page (matches, chat, share, poster, abuse report) and this page is also what Google and WhatsApp previews show, so it comes first.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a public report, when opened on web or mobile, then it shows photos, species, breed, colours, size, sex, a chip-on-file indicator (never the number), date and time, the fuzzed area on a map, status and circumstances.
- [ ] #2 Given the page layout, when rendered, then named action slots exist for Contact, Share, Poster, Report abuse, Owner actions and a labelled ad slot, so later stories plug in without re-layout.
- [ ] #3 Given a crawler or link preview, when the web page is fetched, then it is server-rendered with title, description, Open Graph image and structured data, and closed or hidden reports are not indexable.
- [ ] #4 Given a hidden or removed report, when its URL is opened, then a clear message explains it is no longer available.
- [ ] #5 Given SL and EN, when the language is switched, then page content and meta are localised.
<!-- AC:END -->

## Packet

Unblocks on: public report read model with fuzzed location (TASK-6); Card and Badge primitives (TASK-8)
