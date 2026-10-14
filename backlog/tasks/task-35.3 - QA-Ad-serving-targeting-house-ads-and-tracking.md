---
id: TASK-35.3
title: 'QA: Ad serving, targeting, house ads and tracking'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-14 22:17'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-35.1
  - TASK-35.2
references:
  - docs/tech/frontend.md
parent_task_id: TASK-35
priority: high
ordinal: 253000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-35 (Ad serving, targeting, house ads and tracking) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-35 merged to main (TASK-35.1, TASK-35.2); leads add any later TASK-35 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the slot registry (feed every N cards, lost-pet detail, reunited screen, web sidebar), when a client requests an ad for a slot with context (region, species, language), then the server returns the best active ad whose dates, region or municipality and species match, rotating fairly between several matches.
- [ ] #2 Given no sponsored ad matches, when a slot is requested, then a house ad (become a supporter, partner with us, adopt) is returned so a slot is never empty in the pilot.
- [ ] #3 Given the report-lost and report-found flows, when ads are requested for them, then the API refuses (no such slots exist) and a test enforces it.
- [ ] #4 Given impressions and clicks, when counted, then they are aggregated per ad, slot, day and region in our DB without user identifiers, cookies or device storage, clicks go through a counting redirect with rel sponsored, and this DB is the source of truth for sponsor reports.
- [ ] #5 Given targeting, when regions are used, then Slovenian statistical regions and municipalities (open data, licence checked) are loaded as reference data and a point maps to its region and municipality.
- [ ] #6 Given an ad record, when stored, then it has an image with required alt text, title, text, https link, language, dates, status and targeting, and only admins can write.
- [ ] #7 Given a request whose context marks the user as ad-free (active Premium entitlement), when a slot is requested, then no ad and no house ad is returned; Podpornik supporters are not ad-free.
- [ ] #8 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
