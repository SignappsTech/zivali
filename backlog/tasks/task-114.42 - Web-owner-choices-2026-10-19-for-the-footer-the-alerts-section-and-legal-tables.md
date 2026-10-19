---
id: TASK-114.42
title: >-
  Web: owner choices 2026-10-19 for the footer, the alerts section and legal
  tables
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 10:00'
labels:
  - fe
  - 'est:S'
dependencies: []
references:
  - docs/design/wireframes/P1-footer.html
  - docs/design/wireframes/M-alerts-notifications.html
  - docs/design/wireframes/M-legal-table.html
  - docs/tech/frontend.md
parent_task_id: TASK-114
priority: high
ordinal: 410200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The owner picked between the options drawn in three approved wireframes (2026-10-19, recorded in TASK-116.1, 114.15 and 114.19). Change the built pages to match; only these points, nothing else.

## Packet

Unblocks on: - (wireframes approved, the base builds TASK-116.2, 114.15 and 114.19 are merged)
Design: docs/design/wireframes/P1-footer.html, M-alerts-notifications.html, M-legal-table.html (each has toggles for the options)
Copy: as built; the operator line uses the existing imprint copy (company name plus the Podatki o podjetju link)
Review: tech-lead code review (full mode); run pnpm verify for the changed packages before reporting done.
Branch: agent/task-114.42-owner-choices
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Footer: the Zavetišča link moves into the Pomoč column; the other headings and links stay as built
- [ ] #2 Footer: the operator line shows the company name with a link to the company data page (Podatki o podjetju), not the full address
- [ ] #3 Footer: the language switch sits under the logo; on mobile each group is one full-width column (no 2x2 grid)
- [ ] #4 Alerts page: the Kako vas obvestimo section is open by default and keeps the grey summary line; the /racun/obvestila redirect still opens it
- [ ] #5 Legal tables: zebra rows instead of divider lines, tables as wide as the text column (640 px), and every legal table including the cookie list becomes cards on mobile
- [ ] #6 Light and dark, SL and EN; unit tests updated; e2e specs that read the footer or the alerts section adjusted
<!-- AC:END -->
