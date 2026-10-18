---
id: TASK-114.13
title: 'Map filters: type and species may be all off (none selected means all)'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 15:10'
updated_date: '2026-10-18 04:18'
labels:
  - bug
  - fe
  - 'est:XS'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 361300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: in the map/list filters, type (Izgubljene / Najdene / Opažene) and species (pes / mačka) force at least one option to stay selected. Everything unselected should simply mean the same as everything selected.

Code: apps/web/components/browse/filter-drawer.tsx lines ~123 and ~134 call `toggle(draft.types, type, 1)` and `toggle(draft.species, species, 1)`; the `min` of 1 blocks switching off the last pill (filters.ts `toggle`). The rest already treats an empty list as "all": filters.ts builds the query only for a partial list ("An empty or full list filters nothing") and the URL parser falls back to DEFAULT_FILTERS for an empty one.

Fix: drop the `min` for both groups; check that `isDefault` (filters.ts ~64) and the active-filter count/badge treat an empty group as default, that the reset button and the URL stay clean (no `type=` / `species=`), and that the ad slot species logic (browse.tsx `adSpecies`) handles an empty list. Same rule in the mobile app's filters if they also force one (follow-up task if different).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every type and species pill can be switched off; with none selected the results equal "all", the URL has no type/species parameter and the drawer counts no active filter
- [ ] #2 filters.test.ts and the browse tests cover the empty group; mobile filters checked
<!-- AC:END -->

Branch: agent/TASK-114.13-filter-empty
