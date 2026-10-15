---
id: TASK-34.3
title: 'Web admin shell: role navigation, TOTP enrolment and challenge, audit log'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 21:07'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-11.2
  - TASK-9.3
  - TASK-6.9
  - TASK-34.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P19-admin-shell.md
  - docs/tech/contracts/C3-auth-profiles-roles.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-34
priority: high
ordinal: 183000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ads, abuse reports, organisation verification and orders plug into one admin area with strong authentication (FR-019).

## Packet

Unblocks on: Web shell: header, footer, layout, route groups and guards, shared states merged (TASK-11.2); Web sign-in, sign-up, verification, reset, account page and guards merged (TASK-9.3); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Admin console shell (P19) approved (TASK-34.1)
Design: P19 docs/design/pages/P19-admin-shell.md (mockup docs/design/mockups/P19-admin-shell.html; TASK-34.1)
Copy: docs/content/pages/P19-admin-shell.md
Contracts: C3, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-34.3-admin-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 /admin shows a navigation shell (Ads, Reports, Organisations, Users, Orders, KPIs) filtered by role, per P19; everyone else gets 403 or a redirect.
- [x] #2 Staff without TOTP are taken to enrolment (QR code) and staff with a factor to the challenge before any admin page loads.
- [x] #3 The audit log page lists who, what, when and target with filters, using the shared dense table pattern.
- [x] #4 Admin pages are web-only, in SL and EN, and meet WCAG 2.2 AA (axe 0 violations).
- [x] #5 Admin pages send no GA page_views: /admin* routes are excluded from analytics (no gtag config/page_view on them)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved to the inbox (backlog/changes.md), see the TASK-34.3 rows there.
