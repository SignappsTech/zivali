---
id: TASK-28.3
title: 'Legal pages render <p> nested in <p> (invalid HTML, hydration risk)'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 07:12'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-28
ordinal: 349000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Violates TASK-28.2 AC#5 (HTML validity gate). Steps: curl https://staging.najdimo.si/en/privacy | grep -c '<p[^>]*><p' (also /zasebnost 40, /piskotki 6, /en/terms 24, /en/imprint 4, /en/accessibility 5). Expected: no nested paragraphs. Actual: apps/web/mdx-components.tsx maps p to a styled <p>, and the MDX sources (apps/web/content/legal/{sl,en}/*.mdx) also write raw <p> tags, so every paragraph renders <p><p>. Browsers auto-close it (empty paragraphs, spacing) and React may warn on hydration. Fix: use plain <p> in the MDX or drop the raw tags, or map the raw tag to a fragment. Severity: medium.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Legal pages (privacy, cookies, terms, imprint, accessibility; SL and EN) contain no <p> inside <p>; the HTML gate and the browser console are clean
<!-- AC:END -->

## Packet

Branch: agent/task-28.3-legal-fixes
