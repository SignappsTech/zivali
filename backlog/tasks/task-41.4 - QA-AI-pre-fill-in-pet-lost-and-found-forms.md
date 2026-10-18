---
id: TASK-41.4
title: 'QA: AI pre-fill in pet, lost and found forms'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-18 21:26'
labels:
  - qa
  - 'est:XS'
milestone: m-2
dependencies:
  - TASK-41.1
  - TASK-41.2
  - TASK-41.3
  - TASK-40.3
  - TASK-40.4
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C19-ai-extraction.md
parent_task_id: TASK-41
priority: high
ordinal: 390200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify TASK-41 on main against its acceptance criteria once all its tasks are merged.

## Packet

Unblocks on: TASK-41.1 merged; TASK-41.2 merged; TASK-41.3 merged; TASK-40.3 merged; TASK-40.4 merged
Review: QA report in the task notes; bugs as tasks.
Branch: agent/task-41.4-qa
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
