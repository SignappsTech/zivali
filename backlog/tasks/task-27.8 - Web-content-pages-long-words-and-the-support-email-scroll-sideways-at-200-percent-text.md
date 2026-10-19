---
id: TASK-27.8
title: >-
  Web content pages: long words and the support email scroll sideways at 200
  percent text
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:29'
labels:
  - bug
  - 'est:XS'
  - web
  - a11y
dependencies: []
parent_task_id: TASK-27
ordinal: 465200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: https://najdimo.si (live ee189f86, 2026-10-19; components/content/article.tsx same on main c2040993), Chromium and WebKit at 390x844 and 320x844, inject html{font-size:200%} (TASK-18.8 method), measure document scrollWidth.
Expected: no sideways scroll at 200 % text (frontend.md DoD; WCAG 1.4.4, 1.4.10).
Actual: /en/for-shelters: the h1 word 'municipalities' does not break, h1 scrollWidth 397 in a 310 column, page 437 at 390 and 320 px. /en/safety at 320: the numbered steps (li flex gap-4, text p) end at 332. The email link podpora@najdimo.si does not break at 320: /za-zavetisca 347, /en/for-shelters, /o-nas, /en/about 331. Other T2 pages fit.
Severity: minor (large-text users).

## Packet

Unblocks on: -
Branch: agent/<id>-article-large-text
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given /en/for-shelters, /en/safety, /za-zavetisca, /o-nas and /en/about at 390 px and 320 px with root text at 200 percent, when the page loads, then long words in headings and steps and the email link wrap inside the column and the page has no horizontal scroll
<!-- AC:END -->
