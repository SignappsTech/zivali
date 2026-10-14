---
id: TASK-11.1
title: 'Design: Web shell (P1)'
status: Done
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-14 22:29'
labels:
  - design
  - 'est:S'
  - 'req:FR-035'
dependencies: []
references:
  - docs/design/system.md
  - docs/design/pages/P1-web-shell.md
  - docs/content/pages/P1-web-shell.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-11
priority: medium
ordinal: 86000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every web page sits in this frame, so header, footer, layout variants and the shared loading, empty and error patterns are settled once. Build the static HTML mockup for P1 from its page slice, the design system and the content slice (if docs/content/pages/P1-web-shell.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Branch: design/P1-web-shell
Branch: agent/TASK-11.1-p1-web-shell
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P1-web-shell.md, when docs/design/mockups/P1-web-shell.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the Flow variant, when rendered, then there is no sidebar region and no ad slot, and the header is reduced.
- [ ] #5 Given the header at 1200 and 390 px, when viewed, then it has at most four text links, one primary "Report" action, a language switcher and no count badges.
<!-- AC:END -->
