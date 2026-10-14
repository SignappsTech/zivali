---
id: TASK-60
title: Shelter analytics and municipality reports
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:05'
labels:
  - story
  - 'req:FR-028'
milestone: m-3
dependencies:
  - TASK-58
  - TASK-48
priority: low
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shelters justify their work to municipalities with numbers; reports on intakes, returns and time in care are a Pro benefit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a Pro organisation, when it opens Analytics, then it sees intakes, returns to owner, adoptions, average days in care and match-to-return rate by month.
- [ ] #2 Given a date range, when exported, then a PDF and CSV report suitable for municipality contracts is generated with the organisation name.
- [ ] #3 Given counts below 5 in any breakdown relating to individuals, when shown, then they are aggregated to avoid identification.
- [ ] #4 Given SL and EN, when switched, then report labels follow the language.
<!-- AC:END -->

## Packet

Unblocks on: plan gating (TASK-58); organisation matches and outcomes data (TASK-48)
