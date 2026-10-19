---
id: TASK-28.12
title: 'Quality kit skips the legal pages: add them to PAGES and lighthouserc.json'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:34'
labels:
  - bug
  - 'est:XS'
  - web
milestone: m-1
dependencies: []
parent_task_id: TASK-28
priority: low
ordinal: 471200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: search tests/quality/quality.spec.mjs (PAGES) and lighthouserc.json for /zasebnost, /piskotki, /pogoji-uporabe, /podatki-o-podjetju, /dostopnost and /en/privacy, /en/cookies, /en/terms, /en/company-information, /en/accessibility.
Expected: TASK-28 AC#5 runs `pnpm quality` for the pages this story touches; docs/tech/frontend.md §Commands: a story with a new public route adds it to PAGES and lighthouserc.json.
Actual: none of the 10 legal routes is in either list, so the kit's axe, console, consent-guard, visual and Lighthouse checks never run on them; only apps/web/e2e/legal.spec.ts (h1, draft note, axe) covers them.
Severity: minor.

## Packet

Unblocks on: -
Branch: agent/task-28.12-quality-kit-legal from main
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 tests/quality/quality.spec.mjs PAGES and lighthouserc.json include the legal routes (at least /zasebnost, /piskotki, /pogoji-uporabe and /en/privacy) and pnpm quality passes on them, with visual baselines approved by the design lead
<!-- AC:END -->
