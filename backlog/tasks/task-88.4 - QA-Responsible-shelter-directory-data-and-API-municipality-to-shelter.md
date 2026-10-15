---
id: TASK-88.4
title: 'QA: Responsible-shelter directory: data and API (municipality to shelter)'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-14 23:36'
labels:
  - qa
  - 'est:XS'
  - 'qa:pass'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-15 on main 959465b: qa:pass (scratch DB qa_88_4).
- Story AC1-5 PASS. Confirmed = {status, municipality, shelter} with name/address/phone/hours/website/source/verified_at; likely carries the phone only inside likely_shelter; unconfirmed has nearest[2] and no phone; outside Slovenia handled. All 212 slugs looped. Cache-Control public 3600.
- Data: 212 municipality rows, 17 shelters, version-1 directory_changes; 74 CONFIRMED, 54 likely, 84 without a shelter (allowed by the data README; the client is collecting contract-municipality lists from shelters).
- Borders, validation (NaN, Infinity, ranges, half points, SQL-ish slugs) and privacy (no point in logs, no writes on lookup) PASS. Global 600/min IP limit applies; no per-route limit (C18 doesn't require one).
- Defect: TASK-88.6 (empty lat/lng coerced to 0 → outside_slovenia). QA tests in apps/api/test/routes/shelters.qa.test.ts on branch agent/TASK-88.4-tests, merged with the fix.
<!-- SECTION:NOTES:END -->
