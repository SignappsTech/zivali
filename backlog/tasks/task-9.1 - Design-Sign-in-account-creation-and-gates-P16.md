---
id: TASK-9.1
title: 'Design: Sign in, account creation and gates (P16)'
status: Done
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-15 00:01'
labels:
  - design
  - 'est:S'
  - 'req:FR-001'
dependencies:
  - TASK-11.1
  - TASK-12.1
references:
  - docs/design/system.md
  - docs/design/pages/P16-auth.md
  - docs/content/pages/P16-auth.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-9
priority: high
ordinal: 92000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Account creation must be quick and never lose what the user entered, and other flows open its gate sheet. Build the static HTML mockup for P16 from its page slice, the design system and the content slice (if docs/content/pages/P16-auth.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns)
Branch: design/P16-auth
Branch: agent/TASK-9.1-p16-auth
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P16-auth.md, when docs/design/mockups/P16-auth.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the sign-in and create-account screens, when shown, then Google and Apple appear at equal size, there is no ad or sidebar, and the contextual gate states that nothing entered is lost.
<!-- AC:END -->
