---
id: TASK-1.4
title: >-
  Wireframe: clearer contrast and section separation in light and dark; inputs
  distinct from text (GH#5)
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-20 13:41'
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
