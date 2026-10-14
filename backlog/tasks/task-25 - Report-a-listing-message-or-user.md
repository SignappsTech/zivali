---
id: TASK-25
title: 'Report a listing, message or user'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:02'
labels:
  - story
  - 'req:FR-018'
milestone: m-1
dependencies:
  - TASK-18
  - TASK-6
priority: medium
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Scams and spam target panicked owners; users must be able to flag anything suspicious in one or two taps from day one, even before the moderation queue exists.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a listing or profile, when a user taps Report abuse, then they pick a reason (scam, fake, spam, inappropriate image, other), add an optional note and submit, and anonymous visitors can report listings too (rate limited).
- [ ] #2 Given a submitted report, when stored, then it links to the target with reason and reporter, a confirmation is shown and duplicates from the same user are ignored.
- [ ] #3 Given 3 independent abuse reports on one listing (default), when received, then the listing is hidden from public view pending review and the owner is told.
- [ ] #4 Given a chat message report from the chat screen, when submitted, then the same abuse model is used.
- [ ] #5 Given flags, when stored, then moderators can read them through the admin shell until the full queue exists (M4).
<!-- AC:END -->

## Packet

Unblocks on: Report abuse action slot (TASK-18); abuse_reports schema (TASK-6)
