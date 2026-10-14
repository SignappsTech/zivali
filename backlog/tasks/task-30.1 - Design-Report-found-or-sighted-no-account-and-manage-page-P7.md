---
id: TASK-30.1
title: 'Design: Report found or sighted (no account) and manage page (P7)'
status: To Do
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-14 21:51'
labels:
  - design
  - 'est:M'
  - 'req:FR-006'
dependencies:
  - TASK-11.1
  - TASK-12.1
  - TASK-15.1
references:
  - docs/design/system.md
  - docs/design/pages/P7-report-found.md
  - docs/content/pages/P7-report-found.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-30
priority: high
ordinal: 94000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finders will not sign up, so the whole report fits a minute and ends with a private link they can use on any device. Build the static HTML mockup for P7 from its page slice, the design system and the content slice (if docs/content/pages/P7-report-found.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns); P5 location picker mockup merged
Branch: design/P7-report-found
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P7-report-found.md, when docs/design/mockups/P7-report-found.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the found flow, when counted, then a finder completes it in at most five screens, each with one primary action and no account prompt before publishing.
- [ ] #5 Given the success screen and the manage page, when shown, then the private link block with copy action, the messages entry and the delete-my-data dialog are present.
<!-- AC:END -->
