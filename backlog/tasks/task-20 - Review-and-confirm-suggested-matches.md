---
id: TASK-20
title: Review and confirm suggested matches
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:02'
labels:
  - story
  - 'req:FR-008'
milestone: m-1
dependencies:
  - TASK-6
  - TASK-8
  - TASK-9
  - TASK-7
priority: high
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A suggestion is only useful if the owner can judge it fast and act: compare photos and details side by side, confirm to open a chat or reject so it stops reappearing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an owner with an open lost report, when suggestions exist, then a ranked list shows each candidate with photo comparison, distance, time gap, matching reasons and a clear strength label (not only a percentage).
- [ ] #2 Given a suggestion, when the owner confirms, then a chat with the other party opens and both are notified, and when the owner rejects it, then it is hidden for good.
- [ ] #3 Given a chip match, when shown, then it is labelled the strongest match and the owner is told no personal data is revealed until they confirm.
- [ ] #4 Given no suggestions yet, when the owner opens the screen, then it explains that matching is running and shows next steps (poster, share, alerts).
- [ ] #5 Given instrumentation, when suggestions are viewed or confirmed, then match_suggested and match_confirmed fire with region and species only, and only with consent.
<!-- AC:END -->

## Packet

Unblocks on: matches and conversations contracts, seeded matches (TASK-6); primitives (TASK-8); session (TASK-9); track() and taxonomy (TASK-7)
