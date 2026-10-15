---
id: TASK-31.2
title: 'Design: Map and list (browse) (P4)'
status: Done
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-15 22:10'
labels:
  - design
  - 'est:M'
  - 'req:FR-007'
dependencies:
  - TASK-11.1
  - TASK-12.1
references:
  - docs/design/system.md
  - docs/design/pages/P4-map-list.md
  - docs/content/pages/P4-map-list.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-31
priority: high
ordinal: 90000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Browsing nearby reports is the home screen on mobile and must stay calm while carrying filters, clusters, ads and a full list alternative. Build the static HTML mockup for P4 from its page slice, the design system and the content slice (if docs/content/pages/P4-map-list.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns); assets/empty-no-reports.png generated
Branch: agent/TASK-31.2-map-list

Unblocked from the image task(s) TASK-31.1 (2026-10-16): the Codex CLI is not installed yet, so use a labelled placeholder of the final size and aspect ratio where the illustration goes; the image task swaps the real art in later.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P4-map-list.md, when docs/design/mockups/P4-map-list.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the mobile map screen, when shown, then there is one floating control (the area pill), at most three marker styles, and the list as a bottom sheet with the same filters.
- [ ] #5 Given the filter sheet, when shown, then it has Type, Species, When, Distance and More groups and a primary button with a live Slovenian plural count.
<!-- AC:END -->
