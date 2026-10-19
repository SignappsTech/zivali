---
id: TASK-90.2
title: 'QA: Public shelter pages /zavetisca/{slug}'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 23:36'
updated_date: '2026-10-19 20:27'
labels:
  - qa
  - 'est:XS'
  - 'qa:fail'
milestone: m-2
dependencies:
  - TASK-90.1
  - TASK-90.9
  - TASK-90.10
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C18-shelter-directory.md
  - docs/design/pages/P3-public-pages.md
parent_task_id: TASK-90
priority: medium
ordinal: 289000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-90 (Public shelter pages /zavetisca/{slug}) on main once all its tasks are merged: acceptance criteria below and the quality gates. File bug tasks for failures and set qa:pass or qa:fail.
## Packet
Unblocks on: Public shelter pages /zavetisca and /zavetisca/[slug] with AnimalShelter JSON-LD and sitemap merged (TASK-90.1)
Contracts: C18 (in references); conventions in C1 and ADR-020
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a shelter, when /zavetisca/{slug} is opened, then it shows name, address, phone with a call button, opening hours, municipalities served, a link to report found or lost, and the latest verified date, in SL and EN.
- [ ] #2 Given a crawler, when the page is fetched, then it is server-rendered with valid AnimalShelter structured data and appears in the sitemap.
- [ ] #3 Given the shelter directory index /zavetisca, when opened, then it lists shelters and a municipality search.
- [ ] #4 Given content flags, when legal timings are not yet confirmed, then no legal duty text is shown on these pages.
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA re-run 2026-10-19 (web only), main c2040993 code read-only; live https://najdimo.si version 1ce20600 (no shelter-page diff to main), signed out.
AC#1 pass: 17 shelters SL+EN: name, address, phone + tel: call (aria-label with name), hours (or 'not published'), municipalities served, lost/found links (open the flows), verified line. Spec gap: 6 shelters with no CONFIRMED municipality show 'Pristojno za 0 občin' + empty list (CHANGE row, P3 §T6).
AC#2 pass: no-JS render complete; AnimalShelter + BreadcrumbList JSON-LD on every page (times HH:MM, dayOfWeek URIs); sitemap 60 URLs incl. 34 shelter pages + both indexes, hreflang alternates; canonical + Link hreflang.
AC#3 pass: 17 rows + combobox search (diacritics, max 8, Escape, clear, no match, confirmed/unconfirmed answers), keyboard only, Chromium + WebKit.
AC#4 pass: no legal-timing text (only shelter duty-line notes '24 ur').
AC#5: pnpm verify = CI green (lead, deploy-after-green-ci, 2026-10-19); local Vitest shelters/sitemap/lib 19 files 170 tests pass. Quality on live: axe 0 (4 pages), Lighthouse mobile/desktop perf 87-89/99-100 (known TASK-112.2/90.7), a11y 100, BP 100, SEO 66 (noindex, expected), CLS 0, JS 156-192 KB, 0 console errors.
FAIL: TASK-90.9 (medium, hours list overflows 320 px EN and 200 % text, both engines); TASK-90.10 (low, 404 lacks link to /zavetisca).
<!-- SECTION:NOTES:END -->
