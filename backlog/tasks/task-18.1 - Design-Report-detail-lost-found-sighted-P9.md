---
id: TASK-18.1
title: 'Design: Report detail (lost, found, sighted) (P9)'
status: Done
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-15 00:13'
labels:
  - design
  - 'est:M'
  - 'req:FR-007'
dependencies:
  - TASK-11.1
  - TASK-12.1
references:
  - docs/design/system.md
  - docs/design/pages/P9-report-detail.md
  - docs/content/pages/P9-report-detail.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-18
priority: high
ordinal: 96000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every other feature acts from the listing page, which is also the Google and WhatsApp preview surface. Build the static HTML mockup for P9 from its page slice, the design system and the content slice (if docs/content/pages/P9-report-detail.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns)
Branch: design/P9-report-detail
Branch: agent/TASK-18.1-p9-report-detail
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P9-report-detail.md, when docs/design/mockups/P9-report-detail.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the detail layouts, when reviewed, then the named slots (Contact, Share and poster, Report abuse, Owner actions, ad slot) are visible for each report type and the status variants (open, reunited, closed, 410 gone, owner view with matches note) exist.
<!-- AC:END -->
