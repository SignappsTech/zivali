---
id: TASK-19
title: Matching engine v1
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:02'
labels:
  - story
  - 'req:FR-008'
milestone: m-1
dependencies:
  - TASK-6
priority: high
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The product promise is active matching, not a feed; v1 must be fast, explainable and safe to run on every new report (goal G-2: first suggestion in under 10 minutes).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a new or updated report, when it is saved, then matching runs automatically and stores suggestions within 2 minutes (p95), idempotently.
- [ ] #2 Given two reports with equal normalised chip numbers (one LOST, one FOUND or SIGHTED), when matched, then the score is 1.0, the suggestion is flagged as a chip match and the owner is notified immediately.
- [ ] #3 Given no chip match, when scoring, then species must match and the score blends distance decay, time proximity (found after lost, within 30 days by default) and attribute overlap (size, colour, sex), with weights and threshold (default 0.5, top 10) in config and human-readable reasons stored.
- [ ] #4 Given owner feedback, when a suggestion is rejected, then the pair never reappears and the feedback is kept for later tuning.
- [ ] #5 Given a fixture set of at least 30 synthetic pairs, when tests run, then chip, geo, time and attribute rules are covered locally without cloud services.
- [ ] #6 Given privacy, when a match is suggested, then neither side sees the other contact data until the owner confirms and chat opens.
<!-- AC:END -->

## Packet

Unblocks on: reports and matches schema and scoring config contract merged (TASK-6)
