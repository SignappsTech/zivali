---
id: TASK-28.1
title: Legal pages from MDX with review notice
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-15 20:01'
labels:
  - fe
  - 'est:S'
  - trivial
milestone: m-1
dependencies:
  - TASK-11.2
  - TASK-27.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P3-public-pages.md
  - docs/tech/contracts/C15-routes-deeplinks.md
  - docs/content/legal/
parent_task_id: TASK-28
priority: medium
ordinal: 200000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A pilot handling personal data, location, chat, payments, ads and analytics needs the legal pages online and linked, marked as drafts until reviewed (FR-035).

## Packet

Unblocks on: Web shell: header, footer, layout, route groups and guards, shared states merged (TASK-11.2); Design: Public pages: home and content templates (P3) approved (TASK-27.1)
Design: P3 docs/design/pages/P3-public-pages.md (mockup docs/design/mockups/P3-public-pages.html; TASK-27.1)
Copy: docs/content/pages/P3-public-pages.md
Contracts: C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-28.1-legal-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Privacy, Cookies, Terms, Imprint and Accessibility render from MDX in apps/web/content/legal/{sl,en} at the C15 paths, from the content strategist's drafts.
- [ ] #2 Each page shows a visible 'requires client and legal review' notice until approved, and the footer links to every legal page resolve.
- [ ] #3 axe 0 violations and Lighthouse SEO ≥ 95.
<!-- AC:END -->
