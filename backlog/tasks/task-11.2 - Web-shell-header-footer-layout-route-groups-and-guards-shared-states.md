---
id: TASK-11.2
title: 'Web shell: header, footer, layout, route groups and guards, shared states'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 15:27'
labels:
  - fe
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-8.2
  - TASK-10.2
  - TASK-11.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P1-web-shell.md
  - docs/tech/contracts/C15-routes-deeplinks.md
  - docs/design/system.md
parent_task_id: TASK-11
priority: medium
ordinal: 138000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every web story needs the same header, navigation, footer, responsive layout and sidebar region so pages can be built in parallel. This task owns app/[locale]/layout.tsx.

## Packet

Unblocks on: Web UI kit: shadcn primitives styled to the design system, /dev/kit gallery merged (TASK-8.2); Web i18n: next-intl with shared catalogues, localised pathnames, hreflang, switcher merged (TASK-10.2); Design: Web shell (P1) approved (TASK-11.1)
Design: P1 docs/design/pages/P1-web-shell.md (mockup docs/design/mockups/P1-web-shell.html; TASK-11.1)
Copy: docs/content/pages/P1-web-shell.md
Contracts: C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-11.2-shell-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every web page has the header (logo, Map, Report, My pets and reports, Account, language switcher), the footer (About, Safety tips, Partners, Privacy, Cookies, Terms, Imprint, Accessibility, Cookie settings) and a skip link, per the P1 mockup.
- [ ] #2 From 320 px to 1440 px the layout is mobile-first with no horizontal scroll, and a right sidebar region (reserved for the ad slot) appears from lg.
- [ ] #3 Shared loading, empty and error patterns, a not-found page and the 410 'no longer available' page exist with calm copy.
- [ ] #4 Route groups (public), (app), (portal) and (admin) exist with server-side guards; empty placeholder pages are fine.
- [ ] #5 axe reports 0 violations and Lighthouse SEO ≥ 95 on the home placeholder.
- [ ] #6 Every page has a localised meta description (SL and EN); Lighthouse SEO ≥ 0.95
- [ ] #7 favicon.ico and app icons are served (no 404 in the console)
- [ ] #8 Mobile LCP ≤ 2.5 s in pnpm quality (font preload/fallback checked) (moved to TASK-90.4: the mobile LCP/script budget work lives there)
- [ ] #9 Pages set alternates.canonical built from APP_URL, never from request headers (hreflang already comes from proxy.ts via APP_URL, TASK-10.2)
<!-- AC:END -->
