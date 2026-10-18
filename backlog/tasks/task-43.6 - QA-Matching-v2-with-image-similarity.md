---
id: TASK-43.6
title: 'QA: Matching v2 with image similarity'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-18 21:27'
labels:
  - qa
  - 'est:XS'
milestone: m-2
dependencies:
  - TASK-43.1
  - TASK-43.2
  - TASK-43.3
  - TASK-43.4
  - TASK-43.5
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C8-matching.md
parent_task_id: TASK-43
priority: high
ordinal: 392200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify TASK-43 on main against its acceptance criteria once all its tasks are merged. The story's "v1" and "v2" are algo versions v2 (attributes, as built) and v3 (visual) in C8.

## Packet

Unblocks on: TASK-43.1 merged; TASK-43.2 merged; TASK-43.3 merged; TASK-43.4 merged; TASK-43.5 merged
Review: QA report in the task notes; bugs as tasks.
Branch: agent/task-43.6-qa
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a lost and a found report with photos, when scored, then visual similarity is blended into the v1 score (weights in config), the reasons include visually similar with a similarity band, and chip matches still score 1.0.
- [ ] #2 Given an evaluation set of at least 100 labelled pairs (synthetic plus pilot data when available), when the harness runs, then recall at 10 and precision are reported, v2 is not worse than v1 on the set and thresholds are documented.
- [ ] #3 Given the match review screen, when v2 suggestions show, then the most visually similar photo is shown first and owners can still reject.
- [ ] #4 Given a new found report, when it arrives, then all open lost reports in range are re-evaluated (reverse search) and owners are notified.
- [ ] #5 Given 1000 open lost reports, when a new found report arrives, then reverse search completes under 5 s.
<!-- AC:END -->
