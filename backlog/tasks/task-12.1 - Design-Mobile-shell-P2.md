---
id: TASK-12.1
title: 'Design: Mobile shell (P2)'
status: To Do
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
labels:
  - design
  - 'est:M'
  - 'req:FR-037'
dependencies: []
references:
  - docs/design/system.md
  - docs/design/pages/P2-mobile-shell.md
  - docs/content/pages/P2-mobile-shell.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-12
priority: medium
ordinal: 87000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The native app needs one navigation, one Report sheet and permission primers before screens can be built. Build the static HTML mockup for P2 from its page slice, the design system and the content slice (if docs/content/pages/P2-mobile-shell.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Branch: design/P2-mobile-shell
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P2-mobile-shell.md, when docs/design/mockups/P2-mobile-shell.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the bottom navigation, when rendered, then it has exactly four items (Map, Inbox, Report action, Profile) with icon and label and no count badges.
- [ ] #5 Given each permission primer, when shown, then it explains why in two lines and the denied state shows a working fallback.
<!-- AC:END -->
