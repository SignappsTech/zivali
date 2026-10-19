---
id: TASK-115.1
title: 'Wireframe: homepage rework (person approval gate)'
status: Done
assignee:
  - '@design-lead'
created_date: '2026-10-16 14:00'
updated_date: '2026-10-19 10:12'
labels:
  - design
  - wireframe
  - 'est:S'
dependencies: []
parent_task_id: TASK-115
priority: high
ordinal: 361100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wireframe of the reworked homepage (TASK-115), desktop 1440 and mobile 390, as docs/design/wireframes/P3-home.html: section order, content blocks (latest reports and their card contents, the empty state when there are none, optional numbers, CTAs), what links where. One or two layout options if the choice is real. Note the data each block needs (latest reports: the public GET /v1/reports, sort=recent; numbers: no public endpoint yet). A mock from our real components is fine if it is no more work.

**Gate (owner rule 2026-10-16):** a wireframe confirmed by a person (the owner, or someone they name) comes first. It may be a low-fidelity wireframe (layout, sections, order, content blocks; grey boxes, real labels) or a mock built from our real components (design system, ui kit), whichever is less or equal work; HTML in docs/design/wireframes/. Record the approval in the wireframe task's notes (who, date, the version approved). No mockup or implementation task starts before it. A component mock that was approved also serves as the mockup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 docs/design/wireframes/P3-home.html (desktop and mobile), linked from this task, with the data each block needs
- [ ] #2 A person approved it; their name, the date and the approved version are in this task's notes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
docs/design/wireframes/P3-home.html: v1 ready for owner review (2026-10-18). Not approved yet.

Review sheet for the owner (private claude.ai page, v1 2026-10-18): https://claude.ai/artifact/MTTBPrLTPgEJM8r6QfZQ45. Awaiting owner approval.

APPROVED: Primož Božič (owner), 2026-10-18, wireframe v1 (docs/design/wireframes/P3-home.html). Owner: "A for home". Layout A: compact hero with the two report buttons, recent report cards straight under it. Questions 2-4 were not answered one by one, so they follow A as shown: public latest-report cards (status, species, rough area, time only); "Opažena žival" as a quiet link; the live numbers block stays optional (needs a public stats endpoint, hidden while numbers are small). Confirm those three when 115.2 starts. Owner said not to start building yet (2026-10-18).

Owner answers 2026-10-19 (Primož Božič), review sheet: (1) B; (2) yes, latest reports for everyone (status, species, rough area, time only); (3) yes, keep the live numbers block; (4) 'Opažena žival' as a quiet link (as in A). (1) differs from 'A for home' on 2026-10-18, which is live (TASK-115.5); the lead asked the owner to confirm before a rebuild.

APPROVED: Primož Božič (owner), 2026-10-19, wireframe v1 (docs/design/wireframes/P3-home.html) option B, confirmed in chat ('Switch to B'), with one change: 'Opažena žival' is a quiet text link as in A, not a third hero choice. Keep: public latest-report cards, the live numbers block (hidden under 50). Built by TASK-115.10, replacing the live A (TASK-115.5).
<!-- SECTION:NOTES:END -->
