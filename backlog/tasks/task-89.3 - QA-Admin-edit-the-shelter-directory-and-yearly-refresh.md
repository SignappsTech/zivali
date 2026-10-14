---
id: TASK-89.3
title: 'QA: Admin: edit the shelter directory and yearly refresh'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 23:36'
updated_date: '2026-10-14 23:38'
labels:
  - qa
  - 'est:XS'
milestone: m-2
dependencies:
  - TASK-89.1
  - TASK-89.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C18-shelter-directory.md
  - docs/design/pages/P19-admin-shell.md
parent_task_id: TASK-89
priority: low
ordinal: 287000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-89 (Admin: edit the shelter directory and yearly refresh) on main once all its tasks are merged: acceptance criteria below and the quality gates. File bug tasks for failures and set qa:pass or qa:fail.
## Packet
Unblocks on: Directory admin API: edits with versions, CSV import with dry run, yearly reminder job merged (TASK-89.1); Web admin directory: edit shelters and assignments, history, CSV import merged (TASK-89.2)
Contracts: C18 (in references); conventions in C1 and ADR-020
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an admin, when they edit a shelter or the municipality assignments, then the change is validated, saved with the source, audit-logged and visible in the app at once.
- [ ] #2 Given the yearly cycle, when 1 April passes, then admins see a reminder with the list of entries older than 12 months.
- [ ] #3 Given a CSV, when imported, then a dry run shows changes before they apply.
- [ ] #4 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
