---
id: TASK-1.4
title: >-
  Wireframe: clearer contrast and section separation in light and dark; inputs
  distinct from text (GH#5)
status: In Progress
assignee:
  - '@design-lead'
created_date: '2026-10-20 13:41'
updated_date: '2026-10-20 14:04'
labels:
  - design
  - 'est:S'
dependencies: []
references:
  - docs/design/system.md
parent_task_id: TASK-1
priority: high
ordinal: 540200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub #5 (tester, 2026-10-19), design rework (wireframe gate). Dark: containers and elements barely visible against the background, text colours too close to the background, sections not separated, unclear which elements are inputs. Light: better, but sections still lack separation. Both: inputs and forms not distinct from surrounding content. Propose token-level changes (surface/elevation steps, borders, input fill/border, text contrast ≥ WCAG AA, section separation) and show them as a component mock built from our real components on 3 screens (home, report-lost form step, report detail) in light and dark, 390 and 1200 px (≤10 frames), in docs/design/wireframes/. No implementation until the owner approves (who, date, version in the notes).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Wireframe/mock in docs/design/wireframes/ shows current vs proposed for the 3 screens, light and dark, with the token diff listed
- [ ] #2 Every proposed text/background and input-border pair meets WCAG AA (contrast numbers listed)
- [ ] #3 Owner approval (who, date, version) recorded in the notes before any implementation task starts
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Wireframe v1 (2026-10-20, design-lead): docs/design/wireframes/M-contrast-separation.html. Component mock in the M-ai-prefill style; F1 home (P3 layout A), F2 lost report step 3 (P6, states filling in / error), F3 report detail (P9 visitor), F4 component sheet; each Now / Proposed / Compare, Light / Dark, 390 / 1200 (10 frame states). Token diff (dark: card night.750 #162A2F new, popover/muted/accent night.600, secondary lagoon.700 + lagoon.50 label, pressed lagoon.900, border night.550 #2A474E new, input mist.400; light: border mist.300; new token field = paper / night.750) and contrast table computed in the page from the same values: 80 of 80 proposed text and outline checks meet their minimum. Rules 1-9 for system.md v0.20 listed in the wireframe; no token or code change yet.
Seven owner questions at the top (fields as boxes, choice-row outline, card edges in both themes, dividers vs bands, dark surfaces and secondary, P9 web info card, light secondary left as is).
GH#3 (TASK-1.3) textarea decision: option (b), 96 px textarea as a box with the field outline (may grow with field-sizing from 96 px); the 56 px grow-with-content branch waits for this approval.
APPROVAL: WAITING FOR OWNER APPROVAL. No person has approved this wireframe yet. Record who, the date and the version approved here when they do. No mockup or implementation task starts before that.
<!-- SECTION:NOTES:END -->
