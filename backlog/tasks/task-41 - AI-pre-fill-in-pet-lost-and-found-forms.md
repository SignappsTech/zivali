---
id: TASK-41
title: 'AI pre-fill in pet, lost and found forms'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:04'
updated_date: '2026-10-19 12:46'
labels:
  - story
  - 'req:FR-013'
milestone: m-2
dependencies:
  - TASK-40
  - TASK-16
  - TASK-29
  - TASK-30
priority: high
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users, especially panicked ones, must see, trust and override what the AI suggests; the form should feel faster, not riskier.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an uploaded photo, when extraction returns, then species, breed, colour, pattern and size fields are pre-filled, labelled Suggested, editable, and nothing is saved without user confirmation.
- [ ] #2 Given confidence below 0.6, when shown, then the field stays empty with a hint instead of a guess.
- [ ] #3 Given extraction takes longer than 3 s or fails, when the user continues, then they proceed manually and late suggestions never overwrite their edits.
- [ ] #4 Given the found flow with AI on, when tested with users, then median completion stays under 60 s (goal G-3).
- [ ] #5 Given SL and EN, when breeds are shown, then names are localised and unknown breeds fall back to Mixed or Unknown.
- [ ] #6 Given a screen reader, when suggestions arrive, then they are announced through a polite live region.
<!-- AC:END -->

## Packet

Unblocks on: extractAttributes contract and mock (TASK-40); existing forms to integrate (TASK-16, TASK-29, TASK-30)
