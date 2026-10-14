---
id: TASK-63
title: Automated image screening on upload
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:05'
labels:
  - story
  - 'req:FR-018'
milestone: m-3
dependencies:
  - TASK-40
  - TASK-25
priority: medium
ordinal: 63000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Public photo uploads from anonymous users invite inappropriate images; screening reuses the vision call so the added cost stays near zero.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an uploaded photo, when the vision result flags a prominent human face, nudity, gore or no animal, then the photo is held (not public) and queued for moderation with the reason.
- [ ] #2 Given a clean photo, when screening finds nothing, then it publishes without delay and flagged items are hidden within 60 s.
- [ ] #3 Given a false positive, when a moderator approves, then the photo goes public and the case is kept for threshold tuning.
- [ ] #4 Given the AI budget cap is exceeded, when new anonymous photos arrive, then they are held for review instead of being skipped.
<!-- AC:END -->

## Packet

Unblocks on: moderation signal in the extraction result (TASK-40); abuse_reports sink (TASK-25)
