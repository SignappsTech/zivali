---
id: TASK-34.1
title: 'Design: Admin console shell (P19)'
status: To Do
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-14 21:51'
labels:
  - design
  - 'est:S'
  - 'req:FR-019'
dependencies:
  - TASK-11.1
references:
  - docs/design/system.md
  - docs/design/pages/P19-admin-shell.md
  - docs/content/pages/P19-admin-shell.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-34
priority: high
ordinal: 106000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
One console for ads, enquiries and later moderation needs a shell, a dense table pattern and access screens. Build the static HTML mockup for P19 from its page slice, the design system and the content slice (if docs/content/pages/P19-admin-shell.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell mockup merged (tokens, header patterns)
Branch: design/P19-admin-shell
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P19-admin-shell.md, when docs/design/mockups/P19-admin-shell.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the sidebar, when shown for an admin and for a moderator, then items are filtered by role, and the strong-authentication, access-denied, session-timeout and last-admin screens exist.
<!-- AC:END -->
