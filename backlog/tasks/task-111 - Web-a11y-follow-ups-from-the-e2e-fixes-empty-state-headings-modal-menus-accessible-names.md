---
id: TASK-111
title: >-
  Web a11y follow-ups from the e2e fixes: empty-state headings, modal menus,
  accessible names
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 12:05'
updated_date: '2026-10-19 10:27'
labels:
  - fe
  - a11y
  - 'est:S'
dependencies: []
parent_task_id: TASK-69
priority: medium
ordinal: 356000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-ups the e2e fixer agent noted while fixing the 17 web e2e failures on main (2026-10-16; the fixes themselves are merged: shared toast id, non-modal menus, the EmptyState heading prop, missing poster copy keys, the pill aria-label). Not blocking the web-first pilot.

- Empty states on the chat list and the pets list render without a heading (the EmptyState heading prop exists now): screen-reader users land on a page with no heading for the empty case.
- The chat and admin row menus were made non-modal to fix focus and axe failures; check that each menu still traps and returns focus as the WAI-ARIA menu pattern expects, and that Escape closes it.
- Accessible names built from text nodes with a stray space (e.g. a name ending in " ,"): prefer aria-label or trimmed text where names are composed from several nodes.

## Packet

Branch: agent/TASK-111-web-a11y-follow-ups
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The chat list and pets list empty states have a heading (h2) with the slice's copy, in SL and EN
- [ ] #2 The chat and admin row menus open, move focus into the menu, close on Escape and return focus to the trigger (keyboard test or RTL test)
- [ ] #3 No composed accessible name on the touched components has a leading, trailing or doubled space (unit tests assert the exact names)
- [ ] #4 axe passes on the touched pages (the e2e axe helper)
<!-- AC:END -->
