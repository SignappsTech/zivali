---
id: TASK-29.2
title: >-
  Report write API: create_report, update_report, publish trigger (all report
  types)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-6.6
  - TASK-6.3
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/tech/contracts/C1-platform-conventions.md
  - docs/tech/contracts/C6-location-geo-maps.md
parent_task_id: TASK-29
priority: high
ordinal: 159000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
One validated write path serves lost, found and sighted reports from owners and anonymous finders and starts matching and alerts immediately (FR-005, FR-006).

## Packet

Unblocks on: Reports, pets and photos schema, deterministic fuzz, public read model, seed merged (TASK-6.6); Job queue: pgmq, enqueue_job, pg_cron trigger, worker with handler registry merged (TASK-6.3)
Contracts: C4, C1, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-29.2-report-write-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 create_report and update_report implement C4 for lost, found and sighted (inline attributes or pet_id, photo_ids, location, event_at, circumstances, contact_pref, linked_report_id) with an idempotent client_request_id.
- [ ] #2 Validation: a future event_at is rejected, events older than 30 days return the OLD_EVENT warning, a pet with an open lost report returns DUPLICATE_OPEN_REPORT with the existing code, and chips are normalised.
- [ ] #3 The creator is added to report_managers; a stub submission_guard(p jsonb) is called first (the anonymous rules come from the anonymous-reporter task).
- [ ] #4 The on_report_published trigger enqueues publish_photos, match_report and, for lost reports, fanout_alerts; a published report is returned by get_public_report within one minute after `pnpm db:drain`.
- [ ] #5 pgTAP covers every validation, manager RLS and the enqueued jobs.
<!-- AC:END -->
