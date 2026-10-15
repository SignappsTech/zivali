---
id: TASK-22.2
title: 'Design: Notifications, nearby alerts and settings (P13)'
status: To Do
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-14 21:51'
labels:
  - design
  - 'est:M'
  - 'req:FR-010'
dependencies:
  - TASK-11.1
  - TASK-12.1
  - TASK-15.1
references:
  - docs/design/system.md
  - docs/design/pages/P13-alerts-inbox-settings.md
  - docs/content/pages/P13-alerts-inbox-settings.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-22
priority: high
ordinal: 100000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users must see what happened and control how they are told, without missing a chip match or a message. Build the static HTML mockup for P13 from its page slice, the design system and the content slice (if docs/content/pages/P13-alerts-inbox-settings.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns); P5 location picker mockup merged; assets/empty-inbox.png generated
Branch: design/P13-alerts-inbox-settings

Unblocked from the image task(s) TASK-22.1 (2026-10-16): the Codex CLI is not installed yet, so use a labelled placeholder of the final size and aspect ratio where the illustration goes; the image task swaps the real art in later.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P13-alerts-inbox-settings.md, when docs/design/mockups/P13-alerts-inbox-settings.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the alert settings, when shown, then channels per type and quiet hours exist, and chip matches and messages cannot be turned off for the in-app channel (lock note).
<!-- AC:END -->
