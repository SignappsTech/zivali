---
id: TASK-57
title: 'Tag scan page: notify the owner'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:05'
labels:
  - story
  - 'req:FR-027'
milestone: m-3
dependencies:
  - TASK-16
  - TASK-22
priority: medium
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A tag only helps if a stranger can scan it and reach the owner safely without seeing personal data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a QR tag, when anyone scans it (no app, no account), then a page shows the pet photo, name, notes the owner chose to make public and an I found this pet button.
- [ ] #2 Given the finder taps it, when they confirm (optionally sharing GPS), then the owner gets an immediate notification with the approximate location and a private chat link, and the finder never sees a phone number or address.
- [ ] #3 Given an open lost report for that pet, when the tag is scanned, then the page links to the listing.
- [ ] #4 Given scan abuse, when scans exceed a rate limit, then they are throttled, and a scan creates no account.
- [ ] #5 Given the page, when opened, then it is mobile first, SL and EN, and shows no ads.
<!-- AC:END -->

## Packet

Unblocks on: public pet subset (TASK-16); sendNotification contract (TASK-22)
