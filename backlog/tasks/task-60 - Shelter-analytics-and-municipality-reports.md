---
id: TASK-60
title: Shelter analytics and municipality reports
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:05'
updated_date: '2026-10-14 22:01'
labels:
  - story
  - 'req:FR-028'
milestone: m-2
dependencies:
  - TASK-48
priority: medium
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shelters justify their work to municipalities with numbers; intake, return and time-in-care reports are free for every verified organisation (mission first, no paid shelter tier).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a verified organisation member, when they open Analytics, then they see intakes, returns to owner, adoptions, average days in care and match-to-return rate by month, with no upgrade prompt or payment step.
- [ ] #2 Given a date range, when exported, then a PDF and CSV report suitable for municipality contracts is generated with the organisation name.
- [ ] #3 Given counts below 5 in any breakdown relating to individuals, when shown, then they are aggregated to avoid identification.
- [ ] #4 Given SL and EN, when switched, then report labels follow the language.
<!-- AC:END -->

## Packet

Unblocks on: organisation matches and outcomes data (TASK-48)
