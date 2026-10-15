---
id: TASK-33.1
title: 'Design: Support moments: tip and contribution (P15)'
status: Done
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-15 02:52'
labels:
  - design
  - 'est:S'
  - 'req:FR-021'
dependencies:
  - TASK-11.1
  - TASK-12.1
references:
  - docs/design/system.md
  - docs/design/pages/P15-support-moments.md
  - docs/content/pages/P15-support-moments.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-33
priority: medium
ordinal: 101000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Voluntary support must be honest and never block reporting, so its look and wording are settled before the payments work. Build the static HTML mockup for P15 from its page slice, the design system and the content slice (if docs/content/pages/P15-support-moments.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns)
Branch: design/P15-support-moments
Branch: main (direct commit, per lead instruction; no agent branch)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P15-support-moments.md, when docs/design/mockups/P15-support-moments.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the tip block and the contribution row, when shown, then no amount is pre-selected, Pay and Skip are the same size, the minimum 2.00 EUR is validated inline, and nothing is offered to anonymous finders.
<!-- AC:END -->
