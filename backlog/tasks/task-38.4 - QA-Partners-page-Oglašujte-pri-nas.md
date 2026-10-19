---
id: TASK-38.4
title: 'QA: Partners page: Oglašujte pri nas'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-14 22:16'
updated_date: '2026-10-19 19:32'
labels:
  - qa
  - 'est:XS'
  - 'qa:pass'
milestone: m-1
dependencies:
  - TASK-38.2
  - TASK-38.3
  - TASK-38.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P22-partners.md
parent_task_id: TASK-38
priority: high
ordinal: 256000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-38 (Partners page: Oglašujte pri nas) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-38 merged to main (TASK-38.2, TASK-38.3, TASK-38.1); leads add any later TASK-38 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a visitor, when they open the Partners page (SL: Oglašujte pri nas), then they see the pitch, ad formats and slots (media kit), audience stats (registered users, active reports, reunions by region) and a contact form.
- [x] #2 Given the stats, when computed, then they come from our DB (optionally enriched from the GA Data API behind a flag once credentials exist), are aggregated, cached for at most 1 hour and any figure below 5 is shown as under 5.
- [x] #3 Given the contact form, when submitted, then company, contact, region of interest and message are validated, captcha and rate limiting apply, the lead is stored for admins and emailed to the client and consent to be contacted is explicit.
- [x] #4 Given SL and EN, when switched, then copy is final (no placeholders) and the page has meta tags and an Open Graph image and is indexable.
- [x] #5 Given a nearly empty database, when stats are low, then the page reads honestly (shows pilot status) and never shows invented numbers.
- [x] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA (static + unit, no e2e/API/Lighthouse per machine rules): web vitest partners/advertise/sitemap 17/17 pass. AC1-5 pass by code and test read; minor bug TASK-38.5 (two 'Region' selects share a name). AC2 note: snapshot up to 1h old plus API max-age=3600 can make figures up to ~2h old end to end. AC6: verify, e2e, Lighthouse: merge queue on main at e2457eef. Added apps/web/e2e/partners-qa.spec.ts (not run).

2026-10-19 QA rerun (web only; app: later). Code main e778c604 (no partners/shell diff vs live). Live: 69d07c9716f7, then 030da43f44fe (deploy mid-run; rechecked, same results).
- Unit: web vitest partners/advertise/sitemap 17/17; i18n check OK. API partner tests are DB-backed: run by merge.mjs pnpm verify, not here (no Docker by rule).
- CI: lead, deploy-after-green-ci, 2026-10-19 (verify:static + build + audit + e2e incl. partners.spec + partners-qa.spec).
- AC1 pass: SL/EN 200, pitch, 4 slot previews + format, stats (users, active reports, reunions 90d) with region switch, form; 0 ad slots.
- AC2 pass: every region, no figure 1-4 (shown '< 5', sr 'manj kot 5'); figures dated 21:15, hourly job; DB-only, GA flag off (TASK-38.6).
- AC3 pass by code/tests: client errors + first error focused (live, keyboard), consent unticked, captcha lazy (no script before a valid submit), 3/h/IP limit, lead stored + emailed. No live lead sent (would reach the client). Admin Enquiries screen has no task: CHANGE row in backlog/changes.md.
- AC4 pass: titles, description, canonical, OG png 200, JSON-LD WebPage/Breadcrumb/FAQ, no robots meta; x-robots-tag noindex is staging (expected).
- AC5 pass: pilot note, real small numbers, no invented figures.
- AC6: Lighthouse live /oglasevanje desktop 99/100/100/SEO 66 (noindex); mobile perf 82 LCP 3.5 s = consent banner (known TASK-112/18.5/18.6), a11y 100; scripts 196 KB; 35 links 0 broken; 320/390/1440 no overflow; WebKit OK; keyboard focus rings on all stops.
- Bug TASK-38.7 (minor, shell-wide, not P22): axe 4.14 label-content-name-mismatch on the SL/EN switch. Non-blocking for this story.
<!-- SECTION:NOTES:END -->
