---
id: TASK-24.1
title: 'Design: Poster and sharing (P18)'
status: To Do
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-14 21:51'
labels:
  - design
  - 'est:M'
  - 'req:FR-011'
dependencies:
  - TASK-11.1
  - TASK-12.1
references:
  - docs/design/system.md
  - docs/design/pages/P18-poster-share.md
  - docs/content/pages/P18-poster-share.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-24
priority: medium
ordinal: 105000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners reach neighbours and Facebook groups with a printable poster and one-tap share, so the poster layout and link card are designed deliberately. Build the static HTML mockup for P18 from its page slice, the design system and the content slice (if docs/content/pages/P18-poster-share.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns)
Branch: design/P18-poster-share
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P18-poster-share.md, when docs/design/mockups/P18-poster-share.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the A4 poster, when shown and printed in greyscale, then it has no phone number, email, chip number or exact address, a QR code of at least 55 mm with the short link printed beneath it, and the status is carried by words.
- [ ] #5 Given the share card, when shown, then the 1200 by 630 Open Graph layout shows only an approximate area.
<!-- AC:END -->
