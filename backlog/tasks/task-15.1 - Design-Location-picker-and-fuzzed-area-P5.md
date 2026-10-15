---
id: TASK-15.1
title: 'Design: Location picker and fuzzed area (P5)'
status: Done
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-15 00:00'
labels:
  - design
  - 'est:S'
  - 'req:FR-004'
dependencies:
  - TASK-11.1
  - TASK-12.1
references:
  - docs/design/system.md
  - docs/design/pages/P5-location-picker.md
  - docs/content/pages/P5-location-picker.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-15
priority: high
ordinal: 91000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every flow needs where-questions and one consistent way to show an approximate public location. Build the static HTML mockup for P5 from its page slice, the design system and the content slice (if docs/content/pages/P5-location-picker.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns)
Branch: design/P5-location-picker
Branch: agent/TASK-15.1-location-picker
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P5-location-picker.md, when docs/design/mockups/P5-location-picker.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the fuzzed area component, when shown, then lost reports use a radius of at least 500 m and found or sighted at least 150 m, always with an area-name text alternative, and the exact pin appears only in the owner variant labelled as visible only to them.
<!-- AC:END -->
