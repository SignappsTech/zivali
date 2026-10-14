---
id: TASK-88.4
title: 'QA: Responsible-shelter directory: data and API (municipality to shelter)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 23:36'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-88.1
  - TASK-88.2
  - TASK-88.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C18-shelter-directory.md
parent_task_id: TASK-88
priority: high
ordinal: 284000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-88 (Responsible-shelter directory: data and API (municipality to shelter)) on main once all its tasks are merged: acceptance criteria below and the quality gates. File bug tasks for failures and set qa:pass or qa:fail.
## Packet
Unblocks on: Shelter directory data: 17 shelters, 212 municipality assignments, sources merged (TASK-88.1); Shelter directory API: models, versioned seed, public lookup endpoints merged (TASK-88.2); Directory client in @zivali/api and useResponsibleShelter hook merged (TASK-88.3)
Contracts: C18 (in references); conventions in C1 and ADR-020
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a point or municipality, when the directory is queried, then it returns the responsible shelter (name, address, phone, opening hours, website, source and last-verified date) in one call usable by web, mobile and the offline cache.
- [ ] #2 Given the seed data, when loaded, then all 212 municipalities map to one of the 17 registered shelters from the veterinary administration register plus municipal reports, with the source and date recorded.
- [ ] #3 Given a municipality without a confirmed shelter, when queried, then the API says so and the UI falls back to a generic notice, never a wrong number.
- [ ] #4 Given the data, when changed, then every change is versioned and the data is public and contains no personal data.
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
