---
id: TASK-21.1
title: 'Design: Chat (P12)'
status: To Do
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-14 21:51'
labels:
  - design
  - 'est:M'
  - 'req:FR-009'
dependencies:
  - TASK-11.1
  - TASK-12.1
references:
  - docs/design/system.md
  - docs/design/pages/P12-chat.md
  - docs/content/pages/P12-chat.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-21
priority: high
ordinal: 99000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner and finder talk without exchanging phone numbers; safety has to be obvious without being scary. Build the static HTML mockup for P12 from its page slice, the design system and the content slice (if docs/content/pages/P12-chat.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns); assets/empty-inbox.png generated
Branch: design/P12-chat

Unblocked from the image task(s) TASK-22.1 (2026-10-16): the Codex CLI is not installed yet, so use a labelled placeholder of the final size and aspect ratio where the illustration goes; the image task swaps the real art in later.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P12-chat.md, when docs/design/mockups/P12-chat.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the thread, when shown, then the safety banner is persistent, links appear as plain text with a caution line, system messages are centred, and no ad appears anywhere in chat.
<!-- AC:END -->
