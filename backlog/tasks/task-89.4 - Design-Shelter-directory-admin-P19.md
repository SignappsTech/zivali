---
id: TASK-89.4
title: 'Design: Shelter directory admin (P19)'
status: Done
assignee:
  - '@ui-designer'
created_date: '2026-10-14 23:49'
updated_date: '2026-10-15 03:30'
labels:
  - design
  - 'est:S'
  - 'req:FR-044'
milestone: m-2
dependencies:
  - TASK-34.1
references:
  - docs/design/system.md
  - docs/design/pages/P19-admin-shell.md
  - docs/content/pages/P19-admin-shell.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-89
priority: medium
ordinal: 293000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Admins keep the municipality-to-shelter directory correct without developer help, and every save is live in the app at once (FR-044 R-044.3). Build the static HTML mockup docs/design/mockups/P19-shelter-directory.html from the Shelter directory section of the P19 page slice, reusing the shell, table pattern and drawer from the P19 shell mockup. The content slice has no directory strings yet (CHANGE requested): use clearly marked sample copy and sample data.

## Packet
Unblocks on: P19 admin shell mockup approved (TASK-34.1: sidebar, table pattern, drawer, destructive dialog)
Branch: design/P19-shelter-directory
Branch: main (no worktree; committed directly with a pathspec)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given the Shelter directory section of the P19 slice, when docs/design/mockups/P19-shelter-directory.html is opened in light, dark and side by side, then every state in its Mockup scope is shown and nothing is clipped or scrolls horizontally at 768 and 1200 px.
- [x] #2 Given the yearly cycle, when the reminder is shown, then it is one calm note with the count of entries older than 12 months and a filter action, and stale rows carry an icon and a word, not colour alone.
- [x] #3 Given a CSV import, when the dry run has errors, then the changes and errors are listed with row numbers and the apply action is disabled with the reason in help text.
- [x] #4 Given accessibility, when the mockup is checked, then tables use header semantics, row actions are named, fields have labels above, targets are at least 44 px and a visible focus state is shown.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Mockup docs/design/mockups/P19-shelter-directory.html (generated, static). 1200 frames F1-F7 (shelters, stale filter and row menu, municipalities and toast, edit drawer with hours/municipalities/phone error, history before and after, CSV dry run with errors, delete refused), parts P1-P8 (hours error and closed day, combobox, save conflict, delete allowed, CSV choose/clean/applying, loading/empty/error, moderator read only, restore toast), 768 frames F8-F9 (stacked rows, full-width municipality drawer). Light, dark and side by side checked: no horizontal scroll or overflow at 1280 and 768 viewports, targets 44 px, labels above, named row actions. CHANGE: CH-81..CH-84.
<!-- SECTION:NOTES:END -->
