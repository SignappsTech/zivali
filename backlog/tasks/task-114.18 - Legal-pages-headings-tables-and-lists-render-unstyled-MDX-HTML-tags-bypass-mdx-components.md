---
id: TASK-114.18
title: >-
  Legal pages: headings, tables and lists render unstyled (MDX HTML tags bypass
  mdx-components)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 16:00'
labels:
  - bug
  - fe
  - 'est:XS'
dependencies: []
parent_task_id: TASK-114
priority: high
ordinal: 361800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: all the legal pages need better headings; today they look the same as the text.

Cause (checked on najdimo.si/zasebnost): the section headings render as `<h2 id="s1">1. Na kratko` with no class, and tables as a bare `<table>`. The MDX files (apps/web/content/legal/{sl,en}/*.mdx) are written with literal HTML/JSX tags (`<h2 id="s1">`, `<table>`, `<p>`, `<ul>`, `<li>`), and MDX applies the element map in apps/web/mdx-components.tsx only to markdown syntax (`## …`, lists, tables), never to lowercase JSX tags. So the designed h2/h3/p/ul/table styles (T4 Article: font-display text-2xl bold, spacing, table borders) never reach these pages; Tailwind's preflight leaves h2 at body size.

Fix (pick the smaller, keep the ids for the table of contents and deep links):
- Style the MDX body container in components/legal/legal-page.tsx with descendant rules matching mdx-components.tsx and the article h2Class (`[&_h2]:…`, `[&_h3]:…`, `[&_p]:…`, `[&_ul]:…`, `[&_table]:…`, `[&_th]/[&_td]`), or
- Convert the MDX to markdown syntax with heading ids (needs a rehype-slug/custom-id plugin), so mdx-components.tsx applies.
Check all five pages in SL and EN (privacy, terms, cookies, imprint, accessibility), print styles, and the wide tables on mobile (horizontal scroll container).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every legal page's h2/h3 use the design system's article heading styles; paragraphs, lists and tables get their spacing and borders; the TOC anchors still work
- [ ] #2 All five pages checked in SL and EN at 390 and 1440 px, light and dark; wide tables scroll inside their box on mobile
- [ ] #3 A test asserts the headings carry the heading styles (legal-mdx.test.tsx), so plain HTML tags cannot regress unstyled
<!-- AC:END -->
