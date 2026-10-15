---
id: TASK-36.4
title: 'Design: Ad slots and house ads (P21)'
status: In Progress
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-15 21:58'
labels:
  - design
  - 'est:S'
  - 'req:FR-030'
dependencies:
  - TASK-11.1
  - TASK-12.1
references:
  - docs/design/system.md
  - docs/design/pages/P21-ad-slots.md
  - docs/content/pages/P21-ad-slots.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-36
priority: high
ordinal: 102000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Sponsor placements earn revenue but can erode trust, so four calm labelled slots and the no-ad routes are drawn before any code. Build the static HTML mockup for P21 from its page slice, the design system and the content slice (if docs/content/pages/P21-ad-slots.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns); assets/house-ad-support.png, house-ad-partner.png and house-ad-adopt.png generated
Branch: design/P21-ad-slots
Branch: agent/TASK-36.4-house-ad-mockup

Unblocked from the image task(s) TASK-36.1, TASK-36.2, TASK-36.3 (2026-10-16): the Codex CLI is not installed yet, so use a labelled placeholder of the final size and aspect ratio where the illustration goes; the image task swaps the real art in later.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P21-ad-slots.md, when docs/design/mockups/P21-ad-slots.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given every slot, when shown, then the label "Oglas" is visible, ads are never first or adjacent to another ad, links show a 44 px target with a focus ring, and a frame lists the routes where ads never appear.
<!-- AC:END -->
