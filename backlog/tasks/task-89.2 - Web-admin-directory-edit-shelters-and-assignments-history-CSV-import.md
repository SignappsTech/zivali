---
id: TASK-89.2
title: 'Web admin directory: edit shelters and assignments, history, CSV import'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 23:36'
updated_date: '2026-10-14 23:56'
labels:
  - fe
  - 'est:M'
milestone: m-2
dependencies:
  - TASK-89.4
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C18-shelter-directory.md
  - docs/design/pages/P19-admin-shell.md
parent_task_id: TASK-89
priority: low
ordinal: 286000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Admins keep the directory correct without developer help (FR-044 R-044.3).
## Packet
Unblocks on: Web admin shell: role navigation, TOTP enrolment and challenge, audit log merged (TASK-34.3); Directory client in @zivali/api and useResponsibleShelter hook merged (TASK-88.3); Design: Admin console shell (P19) approved (TASK-34.1)
Design: P19 admin table pattern (TASK-34.1); a dedicated directory admin screen is requested from the design lead (CHANGE)
Contracts: C18 (in references); conventions in C1 and ADR-020
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-89.2-dir-admin-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Admins list shelters and municipality assignments in the admin shell (P19 table pattern), edit them with source and verified date, and see the version history.
- [ ] #2 CSV import shows the dry-run diff and applies it on confirmation.
- [ ] #3 The yearly reminder appears for admins with the list of stale entries; axe reports 0 violations.
<!-- AC:END -->
