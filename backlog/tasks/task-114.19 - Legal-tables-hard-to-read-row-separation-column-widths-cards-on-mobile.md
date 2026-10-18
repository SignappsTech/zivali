---
id: TASK-114.19
title: 'Legal tables are hard to read: row separation, column widths, cards on mobile'
status: To Do
assignee:
  - '@frontend-dev'
  - '@design-lead'
created_date: '2026-10-16 16:10'
updated_date: '2026-10-18 09:12'
labels:
  - fe
  - design
  - 'est:S'
dependencies:
  - TASK-114.18
parent_task_id: TASK-114
priority: high
ordinal: 361900
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16 (screenshot of najdimo.si/zasebnost §3 "Katere podatke obdelujemo"): the tables are very hard to read. Rows have no visual separation, row spacing is uneven (some rows airy, others run together: Pogovori / Obvestila in opozorila / Zlorabe in moderiranje / Plačila), the header row is not distinguished, and the left column wraps badly.

Part of the cause is TASK-114.18 (the MDX `<table>`, `<th>`, `<td>` get no styles at all). This task makes them readable beyond that: a clear header row; a divider (or zebra rows) between rows with even padding; top-aligned cells; a sensible first-column width (about 30 %, label in bold); text at body size with line height; on narrow screens each row becomes a stacked card (label as a heading, value under it) instead of a squeezed two-column table or a sideways scroll. Same component for every legal table (privacy, cookies: the cookie list with name, purpose, duration, provider; terms if any). Print stays a plain table.

**Wireframe rule (owner, 2026-10-16):** the mobile card layout is a layout change: show the owner a quick mock from our real components (one table, desktop and mobile) before rolling it out; record who and when in the notes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Owner approved the table mock (desktop and mobile) in the notes
- [ ] #2 Every legal table (SL and EN) has a distinct header, row dividers, even padding, top alignment and a fixed label column; at 390 px rows read as stacked cards
- [ ] #3 Screen readers still get a table (or a definition list) with correct header associations; axe clean; light and dark
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
docs/design/wireframes/M-legal-table.html: v1 ready for owner review (2026-10-18). Not approved yet.

Review sheet for the owner (private claude.ai page, v1 2026-10-18): https://claude.ai/artifact/MTTBPrLTPgEJM8r6QfZQ45. Awaiting owner approval.

MOCK APPROVED: Primož Božič (owner), 2026-10-18, wireframe v1 (docs/design/wireframes/M-legal-table.html). Owner: "legal good", so the mock's defaults: divider lines (not zebra), 640 px text-column width, stacked cards on mobile for every legal table including the cookie list. Implementation not started: owner said not to build yet (2026-10-18).
<!-- SECTION:NOTES:END -->
