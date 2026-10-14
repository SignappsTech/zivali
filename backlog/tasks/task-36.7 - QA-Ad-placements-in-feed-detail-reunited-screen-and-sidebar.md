---
id: TASK-36.7
title: 'QA: Ad placements in feed, detail, reunited screen and sidebar'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-36.5
  - TASK-36.6
  - TASK-36.1
  - TASK-36.2
  - TASK-36.3
  - TASK-36.4
references:
  - docs/tech/frontend.md
  - docs/design/pages/P21-ad-slots.md
parent_task_id: TASK-36
priority: high
ordinal: 254000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-36 (Ad placements in feed, detail, reunited screen and sidebar) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-36 merged to main (TASK-36.5, TASK-36.6, TASK-36.1, TASK-36.2, TASK-36.3, TASK-36.4); leads add any later TASK-36 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the list or feed, when more than N cards are shown (default every 8), then a card labelled Oglas (EN: Ad) appears, visibly distinct, never first and never next to another ad.
- [ ] #2 Given a lost-pet detail page, when shown, then one labelled ad slot appears below the primary actions (for example nearest 24h vet or pet shop near you via region targeting), the reunited screen has one slot and the web sidebar (lg and up) has one slot.
- [ ] #3 Given the report-lost, report-found, sign-in, chat and payment screens, when rendered, then no ad is present (automated route test).
- [ ] #4 Given an ad, when rendered, then it has alt text, keyboard focus, rel sponsored noopener, 44 px targets and reserved space so layout does not shift (CLS budget on web).
- [ ] #5 Given display and click, when they happen, then they are always counted in our DB (aggregate) and ad_impression and ad_click fire to GA4 only with consent (slot, region, species, no personal data).
- [ ] #6 Given a failed ad request, when the slot cannot load, then it collapses silently without blocking the page.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
