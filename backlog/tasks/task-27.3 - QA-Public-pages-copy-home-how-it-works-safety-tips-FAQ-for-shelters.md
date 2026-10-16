---
id: TASK-27.3
title: 'QA: Public pages copy: home, how it works, safety tips, FAQ, for shelters'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-16 07:13'
labels:
  - qa
  - 'qa:fail'
milestone: m-1
dependencies:
  - TASK-27.2
  - TASK-27.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P3-public-pages.md
parent_task_id: TASK-27
priority: medium
ordinal: 245000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-27 (Public pages copy: home, how it works, safety tips, FAQ, for shelters) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-27 merged to main (TASK-27.2, TASK-27.1); leads add any later TASK-27 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given the tone guide, when copy is written, then home, how it works, safety tips (scam awareness, what to do when you lose or find a pet), FAQ and For shelters pages have final SL and EN copy with heading structure, CTAs, meta title and description and alt text for every image.
- [x] #2 Given the house ads, when copy is written, then three house-ad creatives (become a supporter, partner with us, adopt from a shelter) exist in SL and EN, each with title, text, CTA and alt text.
- [x] #3 Given keyword focus, when pages are written, then each has one primary keyword (for example izgubljen pes, najden mačka) recorded in the content slice.
- [ ] #4 Given client review, when approved, then copy is marked approved and legal claims (such as holding periods) are flagged as requiring legal review.
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-16, main e2457eef; live read-only checks on staging (sha a244c7dc; page content files identical to main). AC1 pass: home, how-it-works, safety, FAQ, for-shelters, about SL+EN: 200, one h1, no heading jumps, unique title/desc, canonical, hreflang, JSON-LD valid (FAQPage 20 Q), photo alts SL+EN, no placeholder text, pages.json 25/25 key parity, SL plurals correct. AC2 pass: three house ads SL+EN in P21 slice section 3. AC3 pass: focus keyword per page in each SEO table. AC4 FAIL: [legal review] lines flagged but slice status still Draft, approval pending: bug TASK-27.5. AC5 not run (machine rules): verify, e2e, Lighthouse: merge queue on main at e2457eef. Notes: home 'Near you' section not built yet; DOM has an h2 'Kaj zelite prijaviti?' (report sheet) before the h1 on every page.
<!-- SECTION:NOTES:END -->
