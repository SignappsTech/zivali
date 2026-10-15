---
id: TASK-90.1
title: >-
  Public shelter pages /zavetisca and /zavetisca/[slug] with AnimalShelter
  JSON-LD and sitemap
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 23:36'
updated_date: '2026-10-15 05:18'
labels:
  - fe
  - 'est:M'
milestone: m-2
dependencies:
  - TASK-90.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C18-shelter-directory.md
  - docs/design/pages/P3-public-pages.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-90
priority: medium
ordinal: 288000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Searches for the shelter of a municipality are frequent and poorly answered; public shelter pages help owners and finders and are the strongest SEO asset (FR-044 R-044.4).
## Packet
Unblocks on: Web shell: header, footer, layout, route groups and guards, shared states merged (TASK-11.2); Directory client in @zivali/api and useResponsibleShelter hook merged (TASK-88.3); Design: Public pages: home and content templates (P3) approved (TASK-27.1)
Design: P3 public page templates (TASK-27.1); a shelter page design is requested from the design lead (CHANGE)
Contracts: C18, C15 (in references); conventions in C1 and ADR-020
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-90.1-shelter-pages
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /zavetisca and /zavetisca/[slug] (EN /en/shelters…) are server-rendered from the directory API with name, address, call button, opening hours, municipalities served, links to report lost or found and the last verified date, in SL and EN.
- [ ] #2 Each shelter page has valid AnimalShelter JSON-LD and a unique title and description, and is listed in the sitemap (app/sitemap.ts is created here and extended later by the SEO story).
- [ ] #3 The index lists shelters and offers a municipality search; legal duty text appears only when content.legal_timings is on.
- [ ] #4 Lighthouse SEO ≥ 95 and accessibility ≥ 95 on both page types.
<!-- AC:END -->
