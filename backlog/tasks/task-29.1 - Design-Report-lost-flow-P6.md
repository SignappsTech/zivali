---
id: TASK-29.1
title: 'Design: Report lost flow (P6)'
status: In Progress
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-15 00:40'
labels:
  - design
  - 'est:M'
  - 'req:FR-005'
dependencies:
  - TASK-11.1
  - TASK-12.1
  - TASK-15.1
  - TASK-9.1
references:
  - docs/design/system.md
  - docs/design/pages/P6-report-lost.md
  - docs/content/pages/P6-report-lost.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-29
priority: high
ordinal: 93000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
An owner under stress reports a loss in minutes; one question per screen and no ads keep it calm. Build the static HTML mockup for P6 from its page slice, the design system and the content slice (if docs/content/pages/P6-report-lost.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns); P5 location picker and P16 auth (gate sheet) mockups merged
Branch: design/P6-report-lost
Branch: agent/TASK-29.1-p6-report-lost
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P6-report-lost.md, when docs/design/mockups/P6-report-lost.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given any screen of the flow, when reviewed, then no ad slot or payment prompt appears, except the collapsed optional support row on the confirmation screen.
- [ ] #5 Given the flow, when counted, then it asks one question per screen with step bars (five bars with a saved pet, up to seven with a new pet) and the sign-in gate keeps the entered data.
<!-- AC:END -->
