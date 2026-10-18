---
id: TASK-114.6
title: 'Short pages: the footer floats mid-screen (page at least the viewport height)'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 14:05'
updated_date: '2026-10-18 04:07'
labels:
  - bug
  - fe
  - 'est:XS'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 360600
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16 (screenshot of /racun/placila with one payment): on a short page the footer sits in the middle of the screen with empty background below it. The page should always be at least the full viewport height, so the footer is at the bottom whatever the content.

Code: apps/web/app/[locale]/layout.tsx `<body>` and apps/web/components/shell/page.tsx (`<main>` has no flex-grow; nothing sets a minimum height). Usual fix: body (or the shell wrapper) `min-h-dvh flex flex-col`, main `flex-1` (dvh, so mobile browser bars do not add a scroll). Covers every layout using the shell (public, app, the flow variant); check the admin console and the auth pages too. Coordinate with the footer rework (TASK-116); this fix is independent of it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On short pages (e.g. /racun/placila with one item, an empty inbox, sign-in) the footer sits at the bottom of the viewport at 390 and 1440 px; long pages unchanged
- [ ] #2 No extra scroll on mobile (dvh), no layout shift added (CLS unchanged in the e2e and Lighthouse runs)
<!-- AC:END -->

Branch: agent/TASK-114.6-footer-min-height
