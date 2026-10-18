---
id: TASK-115.5
title: 'Web: implement the homepage rework'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 14:00'
updated_date: '2026-10-18 20:31'
labels:
  - fe
  - 'est:M'
dependencies:
  - TASK-115.2
  - TASK-115.3
  - TASK-115.4
parent_task_id: TASK-115
priority: high
ordinal: 361500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the homepage (apps/web/app/[locale]/page.tsx) from the approved design (TASK-115.1, and 115.2 if it was needed) and the content (TASK-115.3); latest reports from GET /v1/reports, server-rendered with a short revalidate so the page stays fast; numbers from TASK-115.4 if any. Stay within the TASK-112 performance budgets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Matches the approved design on desktop and mobile, light and dark, SL and EN
- [ ] #2 Latest reports render server-side with an empty state; cards link to the report and the map
- [ ] #3 axe clean, LCP <= 2.5 s and the script budget in the CI Lighthouse run; unit and e2e tests updated
<!-- AC:END -->

## Packet

Branch: agent/TASK-115.5-home-layout-a
