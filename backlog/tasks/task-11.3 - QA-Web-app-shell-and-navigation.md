---
id: TASK-11.3
title: 'QA: Web app shell and navigation'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 19:43'
labels:
  - qa
  - 'est:XS'
  - 'qa:pass'
milestone: m-0
dependencies:
  - TASK-11.2
  - TASK-11.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P1-web-shell.md
parent_task_id: TASK-11
priority: medium
ordinal: 229000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-11 (Web app shell and navigation) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-11 merged to main (TASK-11.2, TASK-11.1); leads add any later TASK-11 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given any web page, when rendered, then a header (logo, Map, Report, My pets and reports, Account, language switcher), a footer (About, Safety tips, Partners, Privacy, Cookies, Terms, Imprint, Accessibility, Cookie settings) and a skip link are present.
- [x] #2 Given viewports from 360 px to 1440 px, when resized, then the layout is mobile-first with no horizontal scroll and a right sidebar region appears from the lg breakpoint.
- [x] #3 Given a loading, empty or error state, when a page needs one, then shared patterns with calm, helpful copy are available.
- [x] #4 Given later areas, when added, then route groups for public, app, organisation portal and admin exist with guards (empty pages are fine).
- [x] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-19 (web only; app: later). Live checks ran against najdimo.si version 030da43f44fe (staging) the whole time; code read on main a069997e (shell diff vs live: header.tsx/parts.tsx small fixes only).
- AC1 pass: header (logo, Zemljevid/Izgubljene/Najdene/Kako deluje, SL/EN switch, Vpis, Prijavi), 13 footer links + Cookie settings button, skip link first in tab order -> #main, on 22 pages. Signed-in header (My pets, inbox, account menu): unit test shell.test.tsx + e2e signed-in, not live (no account).
- AC2 pass: no horizontal scroll at 320/360/390/768/1024/1280/1440 on 22 pages (Chromium) and 320/390/1440 on 6 (WebKit); report detail aside 320 px from lg, hidden below.
- AC3 pass: PageSkeleton, EmptyState, InlineError, ErrorPage 404/410/500, offline copy on main with unit tests; live 404 calm copy + Na zemljevid / Na zacetno stran.
- AC4 pass: (public) (app) (portal) (admin) groups with requireViewer server guards; live signed-out /moje-zivali, /nabiralnik, /en/account, /en/portal, /admin, /admin/zavetisca -> sign-in with next.
- AC5 pass: pnpm verify via merge gate + CI (lead, deploy-after-green-ci, 2026-10-19); pnpm quality not run locally (QA rules), live instead: axe 0 violations (6 pages x light/dark x 390/1440, menu sheet and Prijavi popover open); Lighthouse a11y 100, BP 100, CLS 0, desktop perf 98-100, mobile perf 87-94 (home 87 = TASK-112), SEO 66-69 = staging noindex.
- Keyboard: menu/popover open on Enter and Space, arrows move, Escape closes and returns focus; 3 px focus ring and 44 px targets on all header controls; menu sheet full height at 390. WebKit: same pass; Tab skips links there (engine default), skip link works by focus + Enter.
<!-- SECTION:NOTES:END -->
