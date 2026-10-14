---
id: TASK-90.2
title: 'QA: Public shelter pages /zavetisca/{slug}'
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
  - TASK-90.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C18-shelter-directory.md
  - docs/design/pages/P3-public-pages.md
parent_task_id: TASK-90
priority: medium
ordinal: 289000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-90 (Public shelter pages /zavetisca/{slug}) on main once all its tasks are merged: acceptance criteria below and the quality gates. File bug tasks for failures and set qa:pass or qa:fail.
## Packet
Unblocks on: Public shelter pages /zavetisca and /zavetisca/[slug] with AnimalShelter JSON-LD and sitemap merged (TASK-90.1)
Contracts: C18 (in references); conventions in C1 and ADR-020
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a shelter, when /zavetisca/{slug} is opened, then it shows name, address, phone with a call button, opening hours, municipalities served, a link to report found or lost, and the latest verified date, in SL and EN.
- [ ] #2 Given a crawler, when the page is fetched, then it is server-rendered with valid AnimalShelter structured data and appears in the sitemap.
- [ ] #3 Given the shelter directory index /zavetisca, when opened, then it lists shelters and a municipality search.
- [ ] #4 Given content flags, when legal timings are not yet confirmed, then no legal duty text is shown on these pages.
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
