---
id: TASK-27.7
title: 'Web FAQ: question rows scroll sideways at 200 percent text'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:26'
labels:
  - bug
  - 'est:XS'
  - web
  - a11y
dependencies: []
parent_task_id: TASK-27
ordinal: 462200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: https://najdimo.si/pogosta-vprasanja and /en/faq (live ee189f86, 2026-10-19; components/content/article.tsx same on main c2040993), Chromium and WebKit at 390x844 and 320x844, inject html{font-size:200%} (TASK-18.8 method), measure document scrollWidth.
Expected: no sideways scroll at 200 % text (frontend.md DoD; WCAG 1.4.4, 1.4.10).
Actual: every FAQ details row and summary is 370 px wide from x 40, so it ends at 410 (SL) / 422 (EN); document scrollWidth 410 / 422 at both 390 and 320 px, same in WebKit. At 100 % text the page fits.
Severity: minor (large-text users).

## Packet

Unblocks on: -
Branch: agent/task-27.7-content-200-text
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given /pogosta-vprasanja and /en/faq at 390 px and 320 px with root text at 200 percent, when the page loads and when a row is open, then the question rows fit the viewport and the page has no horizontal scroll
<!-- AC:END -->
