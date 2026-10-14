---
id: TASK-88.1
title: 'Shelter directory data: 17 shelters, 212 municipality assignments, sources'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 23:36'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C18-shelter-directory.md
  - docs/tech/contracts/C6-location-geo-maps.md
parent_task_id: TASK-88
priority: high
ordinal: 281000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners and finders have legal duties towards the responsible shelter of their municipality; the directory needs researched, sourced data before the API and checklists can use it (FR-044).
## Packet
Unblocks on: nothing (ready now)
Contracts: C18, C6 (in references); conventions in C1 and ADR-020
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-88.1-dir-data
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 apps/api/prisma/seeders/data/shelters.csv lists the 17 registered shelters from the veterinary administration (UVHVVR) register with name, address, phone (E.164 and as published), opening hours, website, registry id, source and verified date.
- [ ] #2 apps/api/prisma/seeders/data/municipality_shelters.csv maps all 212 municipalities (GURS slugs from supabase/seed/geo) to a shelter or marks them unconfirmed, with the source (municipal contracts and reports, shelter websites) and date per row.
- [ ] #3 A validation test checks 212 municipality rows, that every confirmed row points to an existing shelter, E.164 phones and unique slugs, and prints the unconfirmed list for the client.
- [ ] #4 The data holds no personal data and cites its sources so the yearly refresh can repeat the research.
<!-- AC:END -->
