---
id: TASK-114.21
title: 'Legal pages: the "Na tej strani" menu marks the section you are reading'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 16:15'
updated_date: '2026-10-18 04:49'
labels:
  - fe
  - 'est:S'
  - no-design
dependencies:
  - TASK-114.18
parent_task_id: TASK-114
priority: medium
ordinal: 362100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: on the legal pages the left-side menu ("Na tej strani", the table of contents) should track where you are.

Code: apps/web/components/legal/legal-page.tsx builds the TOC (sticky on lg, a `<details>` on mobile) from `meta`'s heading list, with `#s1…` links; it is a server component with no active state.

Wanted: a small client island that watches the section headings (IntersectionObserver, no scroll listeners) and marks the current entry in the TOC (the design system's current-item style, as the header nav's underline or a left bar, plus `aria-current="location"`); clicking an entry marks it at once; the sticky TOC keeps the active entry in view on long lists. On mobile (the collapsed `<details>`), show the current section's title in the summary line, or leave it as is if that is noisier. Respects reduced motion (no smooth-scroll animation then). Works for all five legal pages in SL and EN; the page stays server-rendered and works without JS.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Scrolling a legal page marks exactly one TOC entry as current (visual style and aria-current="location"); the first section is current at the top, the last at the bottom
- [ ] #2 Clicking a TOC entry jumps there and marks it; the browser back button and #hash links keep working; no JS = plain links as today
- [ ] #3 Unit test with a mocked IntersectionObserver; e2e checks the active entry after a scroll; axe clean
<!-- AC:END -->

## Packet

Branch: agent/TASK-114.21-legal-toc-active
Branch: agent/TASK-114.21-toc-back (follow-up: Back right after a click)
