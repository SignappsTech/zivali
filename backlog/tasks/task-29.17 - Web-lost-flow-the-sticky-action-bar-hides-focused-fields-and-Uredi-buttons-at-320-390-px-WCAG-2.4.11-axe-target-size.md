---
id: TASK-29.17
title: >-
  Web lost flow: the sticky action bar hides focused fields and Uredi buttons at
  320-390 px (WCAG 2.4.11, axe target-size)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 19:14'
labels:
  - bug
  - 'est:XS'
  - web
  - a11y
dependencies: []
references:
  - apps/web/components/report-lost/lost-flow.tsx
parent_task_id: TASK-29
priority: medium
ordinal: 444200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: live https://najdimo.si/prijava/izgubljena-zival (version 69d07c9716f7; main a0ae40f6 has the same bar: lost-flow.tsx:1141 `max-lg:sticky max-lg:bottom-0`, no scroll padding). Playwright Chromium 156, viewport 320x760 and 390x760, signed out, consent rejected. Add a photo, details Pes + Rjava, default place, Pravkar, reward on with 50 EUR and a note, reach the review. Keyboard: focus the step heading and Tab through each step.
Expected: no focused control entirely hidden behind the sticky action bar (WCAG 2.2 SC 2.4.11 AA); axe 0 violations (docs/tech/frontend.md DoD).
Actual: 390 px: details step chip input (top 704, bar top 608) and review "Uredi: Nagrada" (top 594, bar top 588) take focus fully under the bar and the page does not scroll. 320 px: review "Uredi: Kontakt" (592/588) and "Uredi: Nagrada" (658/588) fully hidden; axe on the review: target-size, button[aria-label="Uredi: Nagrada"] partially obscured (12x44 px clear). 1280 px (bar not sticky): 0 hidden, axe clean. Without a reward the review fits and axe is clean, so it depends on content height.
Hint: scroll-padding-bottom on html (or scroll-margin-bottom on the flow controls) equal to the bar height below lg, as TASK-13.5 did for the consent banner; WebKit ignores scroll-padding for focus already in view (TASK-13.8), so check WebKit too.
Severity: medium (a11y gate miss; keyboard users on narrow screens lose sight of the focused field). Found by QA TASK-29.7.

## Packet

Unblocks on: -
Review: local
Branch: agent/TASK-29.17-sticky-bar-scroll-padding
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 At 320 px and 390 px, Tabbing through every step of /prijava/izgubljena-zival (review with a reward included) never leaves the focused control entirely behind the sticky Naprej/Objavi bar, in Chromium and WebKit
- [ ] #2 axe (wcag2a/aa, 21a/aa, 22aa) reports 0 violations on the review step at 320 px with a reward set; a Playwright or vitest test covers it
<!-- AC:END -->
