---
id: TASK-114.3
title: >-
  Header nav: Zemljevid stays underlined on Izgubljene and Najdene (the same
  page with a filter)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 13:20'
labels:
  - bug
  - fe
  - 'est:S'
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 360300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: Zemljevid, Izgubljene and Najdene in the header all open the same page (/zemljevid, the lost and found items add `?type=lost` / `?type=found`), so Zemljevid is always the underlined (current) item, also when the visitor chose Izgubljene or Najdene. This needs changing.

Code: apps/web/components/shell/header.tsx: only the map item has `route: '/map'`; the lost and found items are hrefs with a query and no route, so the current-page match sees /map for all three.

Options for the owner/design lead: (a) mark the current item by pathname plus the `type` filter (Zemljevid when no type or both, Izgubljene for type=lost, Najdene for type=found), and keep it in sync when the filter changes on the page; or (b) give lost and found their own paths (e.g. /izgubljene, /najdene as filtered views) if they should be separate pages for sharing and SEO. (a) is the small fix.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Exactly one header item is marked current (underline and aria-current="page"): Zemljevid without a type filter, Izgubljene with type=lost, Najdene with type=found, in SL and EN, desktop and mobile menu
- [ ] #2 Changing the type filter on the page updates the current item
- [ ] #3 Unit or e2e test for the three states
<!-- AC:END -->
