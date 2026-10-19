---
id: TASK-90.11
title: >-
  Web shelter pages: no '0 občin' for a shelter without confirmed municipalities
  (P3 v1.2 T5/T6, CH-674)
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:48'
updated_date: '2026-10-19 21:01'
labels:
  - fe
  - 'est:XS'
  - web
dependencies: []
references:
  - docs/design/pages/P3-public-pages.md§T6 Shelter page
parent_task_id: TASK-90
priority: medium
ordinal: 472200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Design decision 2026-10-19 (design lead, CH-674, P3 v1.2) after QA TASK-90.2 found 6 of 17 live shelters showing 'Pristojno za 0 občin'. Copy is a proposal until the content strategist confirms the two strings (CHANGE).

## Packet
Unblocks on: design docs batch merged (P3 v1.2)
Branch: agent/TASK-90.11-shelter-unconfirmed-municipality
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A shelter with no confirmed municipality shows no count: T6 drops the 'Pristojno za n občin' line and the '(0)' list; JSON-LD omits areaServed (no empty array); T5 rows drop '· 0 občin'
- [ ] #2 Where unconfirmed (likely) municipalities exist, T6 shows a 'Morda pristojno' section (no count) with a 'Ni potrjeno' note and the plain list; with none, the section is omitted
- [ ] #3 SL and EN keys added with parity; unit tests for the three states (confirmed, only unconfirmed, none)
<!-- AC:END -->
