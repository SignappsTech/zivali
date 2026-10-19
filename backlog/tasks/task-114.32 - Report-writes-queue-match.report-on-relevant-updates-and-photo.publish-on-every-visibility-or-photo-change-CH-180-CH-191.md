---
id: TASK-114.32
title: >-
  Report writes queue match.report on relevant updates and photo.publish on
  every visibility or photo change (CH-180, CH-191)
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-18 22:06'
updated_date: '2026-10-19 00:57'
labels:
  - be
  - bug
  - 'est:M'
  - no-design
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C8-matching.md
  - docs/tech/contracts/C5-photos-storage.md
  - docs/tech/contracts/C4-reports-and-pets.md
parent_task_id: TASK-114
priority: high
ordinal: 394200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Two producers are missing in the report write path (CH-180, CH-191).

1. match.report (C8 'relevant update'): TASK-19.1 only consumes it. PATCH /v1/reports/:code that changes a matching input (location, event_at, species, sex, size, colours, pattern, chip) also queues match.report in the same transaction. Moderation release (held to visible) queues it too.
2. photo.publish { report_id } (with the write's tx) from every report write that changes visibility (create, hold/hide/remove/release, close/expire, end of the 30-day public window) or its photo_ids. photo.publish only sees attached photos, so detaching a published photo from a visible report must delete its media copies (photos.domain photoObjects/deleteObjects).
Hold/hide/remove/release actions are built in TASK-62 (moderation queue); that task calls the helper added here. Cover create, update, close/expire (report.lifecycle) and the 30-day window job here.

## Packet

Unblocks on: nothing open (TASK-29.2, TASK-14.1, TASK-19.1, TASK-26.3 are merged). TASK-62 uses the helper from this task.
Review: tech-lead code review; run pnpm verify before reporting done.
Branch: agent/task-114.32-report-producers
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PATCH /v1/reports/:code changing any of location, event_at, species, sex, size, colours, pattern or chip queues match.report in the same transaction; a PATCH that changes none of them (e.g. notes) queues nothing. Tests for both.
- [ ] #2 A helper (one call site per write) queues photo.publish { report_id } inside the write's tx for create, update with changed photo_ids, close/expire and the end of the 30-day public window; hold/hide/remove/release call it from TASK-62.
- [ ] #3 Detaching a published photo from a visible report deletes its media copies (photoObjects/deleteObjects); tests cover detach, re-attach and a hidden report.
- [ ] #4 Exposed helper documented in docs/tech/backend.md job table if one exists.
<!-- AC:END -->
