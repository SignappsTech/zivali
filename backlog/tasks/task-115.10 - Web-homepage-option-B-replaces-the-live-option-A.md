---
id: TASK-115.10
title: 'Web: homepage option B (replaces the live option A)'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 10:13'
labels:
  - fe
  - 'est:M'
dependencies: []
references:
  - docs/design/wireframes/P3-home.html
  - docs/content/pages/P3-public-pages.md§T1 Home
  - docs/design/pages/P3-public-pages.md§Assets
  - docs/tech/frontend.md
parent_task_id: TASK-115
priority: high
ordinal: 412200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The owner switched the homepage to option B on 2026-10-19 (TASK-115.1 notes). Replace the live option A (TASK-115.5) with B as drawn in docs/design/wireframes/P3-home.html §Option B, with one change: 'Opažena žival' is a quiet text link (as in A), not a third hero choice. Keep what A does well: public latest-report cards (status, species, rough area, time; alt text without the pet name), the live numbers from GET /v1/stats/public hidden while counts are under 50, the focused card scrolling into view, and full rows only.

## Packet

Unblocks on: - (wireframe approved by the owner 2026-10-19; A's data and components are merged)
Design: docs/design/wireframes/P3-home.html Option B frames (Desktop 1440, Mobile 390); the frame is a component mock, so it is also the mockup
Copy: docs/content/pages/P3-public-pages.md §T1 Home; the chooser reuses the header Prijavi menu labels
Assets: docs/design/pages/P3-public-pages.md §Assets (the licensed placeholder set, as in A)
Review: tech-lead code review (full mode) and design-lead visual review
Branch: agent/task-115.10-home-b
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Matches Option B on desktop and mobile, light and dark, SL and EN, with 'Opažena žival' as a quiet link
- [ ] #2 Section order as B: hero with the chooser, recent reports (list next to a map teaser), numbers band (hidden under 50), how it works, safe by design, shelters
- [ ] #3 The map teaser loads no map library on the homepage and the page stays within the TASK-112 budgets
- [ ] #4 Unit tests updated; e2e specs that read the homepage (content.spec and others) adjusted
<!-- AC:END -->
