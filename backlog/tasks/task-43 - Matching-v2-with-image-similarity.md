---
id: TASK-43
title: Matching v2 with image similarity
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:04'
labels:
  - story
  - 'req:FR-014'
milestone: m-2
dependencies:
  - TASK-42
  - TASK-19
priority: high
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Matching by photo is the headline AI feature; it must measurably improve suggestions and stay explainable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a lost and a found report with photos, when scored, then visual similarity is blended into the v1 score (weights in config), the reasons include visually similar with a similarity band, and chip matches still score 1.0.
- [ ] #2 Given an evaluation set of at least 100 labelled pairs (synthetic plus pilot data when available), when the harness runs, then recall at 10 and precision are reported, v2 is not worse than v1 on the set and thresholds are documented.
- [ ] #3 Given the match review screen, when v2 suggestions show, then the most visually similar photo is shown first and owners can still reject.
- [ ] #4 Given a new found report, when it arrives, then all open lost reports in range are re-evaluated (reverse search) and owners are notified.
- [ ] #5 Given 1000 open lost reports, when a new found report arrives, then reverse search completes under 5 s.
<!-- AC:END -->

## Packet

Unblocks on: similarity query function (TASK-42); scoring config and reasons model (TASK-19)
