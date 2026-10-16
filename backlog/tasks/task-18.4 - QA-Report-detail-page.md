---
id: TASK-18.4
title: 'QA: Report detail page'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-16 07:25'
labels:
  - qa
milestone: m-1
dependencies:
  - TASK-18.2
  - TASK-18.3
  - TASK-18.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P9-report-detail.md
parent_task_id: TASK-18
priority: high
ordinal: 236000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-18 (Report detail page) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-18 merged to main (TASK-18.2, TASK-18.3, TASK-18.1); leads add any later TASK-18 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a public report, when opened on web or mobile, then it shows photos, species, breed, colours, size, sex, a chip-on-file indicator (never the number), date and time, the fuzzed area on a map, status and circumstances.
- [x] #2 Given the page layout, when rendered, then named action slots exist for Contact, Share, Poster, Report abuse, Owner actions and a labelled ad slot, so later stories plug in without re-layout.
- [x] #3 Given a crawler or link preview, when the web page is fetched, then it is server-rendered with title, description, Open Graph image and structured data, and closed or hidden reports are not indexable.
- [x] #4 Given a hidden or removed report, when its URL is opened, then a clear message explains it is no longer available.
- [x] #5 Given SL and EN, when the language is switched, then page content and meta are localised.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
- [x] #7 Given a lost report with a reward, when its detail page opens on web and mobile, then the 'Nagrada' line and the scam warning are shown, and reports without a reward show neither.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA (agent, merge-queue mode, main e2457eef): web vitest report/abuse/ads/r routes 21 files 230 tests pass (+5 new integrated-slot tests in app/[locale]/(public)/r/[code]/page.test.tsx); mobile jest report-detail 25/25 pass. Integrated page verified by unit/DOM tests: slot order per P9 (A, safety note, B, C, Where, ad, near-here), one h1/one main, owner never sees sighting/abuse, visitor ships no owner code (owner-lazy dynamic + PageMessages owner copy only for is_mine), reward line/scam warning only with reward, 410/404 in proxy.ts (tests), OG/JSON-LD without exact point, noindex for closed/reunited/held. AC#6 not run here: verify, quality, e2e, Lighthouse: merge queue on main at e2457eef. Staging https://staging.najdimo.si/r/* answered 500 for unknown/gone codes (lags main, inconclusive; recheck after deploy). Note: sticky sidebar can sit beside the detail ad while scrolling at lg (design-specified, not filed). AC#1 says date and time; P9 shows the date only (CHANGE row added). Labels left at qa (no qa:pass until AC#6 runs).
<!-- SECTION:NOTES:END -->
