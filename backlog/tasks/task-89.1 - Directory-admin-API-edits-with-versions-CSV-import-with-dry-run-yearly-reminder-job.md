---
id: TASK-89.1
title: >-
  Directory admin API: edits with versions, CSV import with dry run, yearly
  reminder job
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-14 23:36'
updated_date: '2026-10-15 21:22'
labels:
  - be
  - 'est:S'
milestone: m-2
dependencies:
  - TASK-88.2
  - TASK-34.2
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C18-shelter-directory.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-89
priority: low
ordinal: 285000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New shelters and municipal contracts change the directory; admins must correct it safely and be reminded every year after 31 March (FR-044 R-044.3).
## Packet
Unblocks on: Shelter directory API: models, versioned seed, public lookup endpoints merged (TASK-88.2); Admin API: aal2 enforcement, users and roles, audit log, queues, admin bootstrap script merged (TASK-34.2)
Contracts: C18, C1 (in references); conventions in C1 and ADR-020
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-89.1-dir-admin-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST and PUT /v1/admin/shelters and PUT /v1/admin/municipality-shelters/:municipality (admins, aal2) validate input, write a directory_changes version and an audit entry, and the public endpoints show the change at once.
- [ ] #2 POST /v1/admin/directory/import?dry_run=true returns the diff for an uploaded CSV without writing; without dry_run it applies the same diff in one transaction.
- [ ] #3 The directory.reminder job runs on 1 April 08:00 Europe/Ljubljana and notifies admins with the entries older than 12 months.
<!-- AC:END -->
