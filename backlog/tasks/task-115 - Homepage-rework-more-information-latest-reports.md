---
id: TASK-115
title: 'Homepage rework: more information, latest reports'
status: To Do
assignee: []
created_date: '2026-10-16 14:00'
labels:
  - 'design'
  - 'pilot'
dependencies: []
priority: high
ordinal: 361000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16, after the pilot testers' feedback ("the design is a bit meh"): the homepage should carry more information, e.g. the latest reports. Today (apps/web/app/[locale]/page.tsx, P3 home) it is a hero with the two report buttons and a photo, then How it works, Safety and For shelters: nothing shows that the service is alive or what is happening near the visitor.

Ideas for the wireframe (the design lead proposes, the owner decides): latest lost and found reports (cards with photo, species, place, time; links to the report and to the map), a "near you" variant once a location is known, a few live numbers (open reports, reunited this month) if they help trust, the responsible shelter search, a shorter How it works, the For shelters/vets entry for the pilot visits.

**Gate (owner rule 2026-10-16):** a wireframe confirmed by a person (the owner, or someone they name) comes first. It may be a low-fidelity wireframe (layout, sections, order, content blocks; grey boxes, real labels) or a mock built from our real components (design system, ui kit), whichever is less or equal work; HTML in docs/design/wireframes/. Record the approval in the wireframe task's notes (who, date, the version approved). No mockup or implementation task starts before it. A component mock that was approved also serves as the mockup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Wireframe (or component mock) approved by a person (TASK-115.1) before any further design or code
- [ ] #2 The new homepage ships per the approved design, SL and EN, desktop and mobile, with the quality gates (axe, the TASK-112 Lighthouse budgets, e2e)
<!-- AC:END -->
