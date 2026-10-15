---
id: TASK-16.2
title: 'Design: Pet profiles (P8)'
status: Done
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-15 22:10'
labels:
  - design
  - 'est:S'
  - 'req:FR-002'
dependencies:
  - TASK-11.1
  - TASK-12.1
references:
  - docs/design/system.md
  - docs/design/pages/P8-pet-profiles.md
  - docs/content/pages/P8-pet-profiles.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-16
priority: high
ordinal: 95000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners register pets in advance so a loss report takes seconds; the form must not feel like paperwork. Build the static HTML mockup for P8 from its page slice, the design system and the content slice (if docs/content/pages/P8-pet-profiles.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns); assets/empty-no-pets.png generated
Branch: agent/TASK-16.2-pets-ui

Unblocked from the image task(s) TASK-16.1 (2026-10-16): the Codex CLI is not installed yet, so use a labelled placeholder of the final size and aspect ratio where the illustration goes; the image task swaps the real art in later.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P8-pet-profiles.md, when docs/design/mockups/P8-pet-profiles.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the pet form, when shown, then it uses line fields in sections with no cards or bordered boxes, the chip number is never displayed publicly, and an invalid chip shows a warning note instead of blocking.
<!-- AC:END -->
