---
id: TASK-28.11
title: >-
  Legal pages scroll sideways at 200% text: long heading words and code keys
  (390 px and 320 px)
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:33'
updated_date: '2026-10-19 20:52'
labels:
  - bug
  - 'est:XS'
  - web
  - a11y
milestone: m-1
dependencies: []
parent_task_id: TASK-28
priority: low
ordinal: 470200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: live najdimo.si (/api/health ee189f86e027), Playwright Chromium and WebKit, viewport 390x844 (then 320x844), page.addStyleTag html { font-size: 200% !important }, compare document.documentElement.scrollWidth with the viewport (method of apps/web/e2e/large-text.spec.ts).
Expected: no sideways scroll (DoD "works at 320 px width and 200 % text"; WCAG 1.4.10), as TASK-18.8 set for /r/[code].
Actual at 390 px, both engines: /pogoji-uporabe 405 (h2 "14. Razpoložljivost, spremembe in prenehanje"), /en/accessibility 399 (h1 "Accessibility"), /piskotki and /en/cookies 394 (an unbreakable <code> key such as zz_support:payment:<…> followed by "."). At 320 px all 10 legal pages scroll, 321 to 405 px (h1, h2, long list items). At 100 % text nothing overflows; the table cards (TASK-114.42) fit and the thead is sr-only.
Fix hint: overflow-wrap: anywhere (or hyphens: auto with lang) on the T4 legal h1/h2 and inline code.
Severity: minor.

## Packet

Unblocks on: -
Branch: agent/task-28.11-legal-large-text from main
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With root text at 200%, the main content of the 10 legal pages ends inside the viewport at 390 px and 320 px in Chromium and WebKit, covered by a case in apps/web/e2e/large-text.spec.ts
<!-- AC:END -->
