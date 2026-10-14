---
id: TASK-13.1
title: 'Design: Consent banner and preferences (P17)'
status: To Do
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-14 21:51'
labels:
  - design
  - 'est:S'
  - 'req:FR-039'
dependencies:
  - TASK-11.1
  - TASK-12.1
references:
  - docs/design/system.md
  - docs/design/pages/P17-consent.md
  - docs/content/pages/P17-consent.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-13
priority: high
ordinal: 104000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
EU rules require equal weight and an easy change of choice, and the banner must not get in the way of an urgent report. Build the static HTML mockup for P17 from its page slice, the design system and the content slice (if docs/content/pages/P17-consent.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns)
Branch: design/P17-consent
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P17-consent.md, when docs/design/mockups/P17-consent.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the banner and sheet, when shown, then Accept all, Reject all and Customise are identical in size, style and weight, nothing is pre-selected, and Cookie settings reopens the Customise view with the stored choice.
<!-- AC:END -->
