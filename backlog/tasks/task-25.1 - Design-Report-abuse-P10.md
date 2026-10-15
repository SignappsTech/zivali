---
id: TASK-25.1
title: 'Design: Report abuse (P10)'
status: In Progress
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-15 02:14'
labels:
  - design
  - 'est:XS'
  - 'req:FR-018'
dependencies:
  - TASK-11.1
  - TASK-12.1
references:
  - docs/design/system.md
  - docs/design/pages/P10-report-abuse.md
  - docs/content/pages/P10-report-abuse.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-25
priority: medium
ordinal: 97000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Scams are a real risk, so flagging a listing or message has to be two taps and feel safe. Build the static HTML mockup for P10 from its page slice, the design system and the content slice (if docs/content/pages/P10-report-abuse.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns)
Branch: design/P10-report-abuse
Branch: main (worked directly on main per Project Lead; mockup docs/design/mockups/P10-report-abuse.html)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P10-report-abuse.md, when docs/design/mockups/P10-report-abuse.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the abuse sheet, when shown, then the primary button is disabled until a reason is chosen with an explanation, and the confirmation, rate-limited and already-reported states exist.
<!-- AC:END -->
