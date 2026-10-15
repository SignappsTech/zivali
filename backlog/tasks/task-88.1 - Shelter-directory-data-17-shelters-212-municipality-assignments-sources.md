---
id: TASK-88.1
title: 'Shelter directory data: 17 shelters, 212 municipality assignments, sources'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-14 23:36'
updated_date: '2026-10-15 00:36'
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
- [x] #1 apps/api/prisma/seeders/data/shelters.csv lists the 17 registered shelters from the veterinary administration (UVHVVR) register with name, address, phone (E.164 and as published), opening hours, website, registry id, source and verified date.
- [x] #2 apps/api/prisma/seeders/data/municipality_shelters.csv maps all 212 municipalities (GURS slugs from supabase/seed/geo) to a shelter or marks them unconfirmed, with the source (municipal contracts and reports, shelter websites) and date per row.
- [x] #3 A validation test checks 212 municipality rows, that every confirmed row points to an existing shelter, E.164 phones and unique slugs, and prints the unconfirmed list for the client.
- [x] #4 The data holds no personal data and cites its sources so the yearly refresh can repeat the research.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Data: apps/api/prisma/seeders/data/{shelters,municipality_shelters}.csv + README (sources, rules, yearly refresh). Test: scripts/shelter-directory.test.mjs (runs in pnpm test/verify; prints the open list).
Counts: 74/212 municipalities confirmed for cats and dogs, 138 open (215 rows; species rows for Škofja Loka, Gorenja vas-Poljane, Rogaška Slatina).
Open because: Horjul 2024 list (21) predates its 2026 cuts; Pomurje list (26, Mala hiša) undated 2015 with 2 unnamed exceptions; Koroška has no shelter; re-tenders or no bidders (Dolenjska, Savinjska, Zasavje); no source found for the rest. 54 open rows carry a suggested_shelter.
Register fixes: registry_id = edition#position (no official number); malformed phones normalised (Zonzani, Ljubljana); personal e-mail dropped (Obalno); Mačja hiša address/phone and Muri phone from their websites.
CHANGE docs/tech/contracts/C18-shelter-directory.md: municipality_shelters needs species (null|cat|dog), PK (municipality_id, species), lookup prefers the species row; plus optional suggested_shelter (CSV only or column).
<!-- SECTION:NOTES:END -->
