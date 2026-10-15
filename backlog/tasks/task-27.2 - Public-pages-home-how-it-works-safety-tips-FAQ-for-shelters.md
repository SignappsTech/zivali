---
id: TASK-27.2
title: 'Public pages: home, how it works, safety tips, FAQ, for shelters'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-15 21:25'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-11.2
  - TASK-27.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P3-public-pages.md
  - docs/tech/contracts/C15-routes-deeplinks.md
  - docs/content/pages/P3-public-pages.md
parent_task_id: TASK-27
priority: medium
ordinal: 199000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The first visit decides whether a panicked owner or a finder trusts the product (FR-035).

## Packet

Unblocks on: Web shell: header, footer, layout, route groups and guards, shared states merged (TASK-11.2); Design: Public pages: home and content templates (P3) approved (TASK-27.1)
Design: P3 docs/design/pages/P3-public-pages.md (mockup docs/design/mockups/P3-public-pages.html; TASK-27.1)
Copy: docs/content/pages/P3-public-pages.md
Contracts: C15, C16 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-27.2-pages-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Home, About, How it works, Safety tips, FAQ and For shelters exist at the C15 paths in SL and EN with the final copy from the content slice, per P3.
- [ ] #2 Each page has a unique title, meta description and Open Graph image, one h1 and alt text for every image.
- [ ] #3 Lighthouse performance ≥ 90, accessibility ≥ 95 and SEO ≥ 95 on each page; links pass linkinator.
<!-- AC:END -->
