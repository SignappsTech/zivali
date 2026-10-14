---
id: TASK-38.1
title: 'Design: Partners page "Oglašujte pri nas" (P22)'
status: To Do
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-14 21:51'
labels:
  - design
  - 'est:M'
  - 'req:FR-032'
dependencies:
  - TASK-11.1
  - TASK-36.4
references:
  - docs/design/system.md
  - docs/design/pages/P22-partners.md
  - docs/content/pages/P22-partners.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-38
priority: high
ordinal: 108000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
This page sells the first sponsors, so it shows real numbers and the placements honestly and leads to a working enquiry form. Build the static HTML mockup for P22 from its page slice, the design system and the content slice (if docs/content/pages/P22-partners.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P21 ad slot mockups merged
Branch: design/P22-partners
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P22-partners.md, when docs/design/mockups/P22-partners.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the audience section, when shown, then values under 5 read "< 5" and the honest pilot note is present, the consent checkbox is not pre-ticked, and the page has no ad slot.
<!-- AC:END -->
