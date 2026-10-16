---
id: TASK-36.7
title: 'QA: Ad placements in feed, detail, reunited screen and sidebar'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-16 09:17'
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

Unblocks on: Web AdSlot and placements: feed, detail, reunited, sidebar merged (TASK-36.5); Mobile AdSlot and placements: feed, detail, reunited merged (TASK-36.6); Image: house ad, support the service approved (TASK-36.1); Image: house ad, partner with us approved (TASK-36.2); Image: house ad, adopt from a shelter approved (TASK-36.3); Design: Ad slots and house ads (P21) approved (TASK-36.4)
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given the list or feed, when more than N cards are shown (default every 8), then a card labelled Oglas (EN: Ad) appears, visibly distinct, never first and never next to another ad.
- [x] #2 Given the report-lost, report-found, sign-in, chat and payment screens, when rendered, then no ad is present (automated route test).
- [x] #3 Given an ad, when rendered, then it has alt text, keyboard focus, rel sponsored noopener, 44 px targets and reserved space so layout does not shift (CLS budget on web).
- [x] #4 Given display and click, when they happen, then they are always counted in our DB (aggregate) and ad_impression and ad_click fire to GA4 only with consent (slot, region, species, no personal data).
- [x] #5 Given a failed ad request, when the slot cannot load, then it collapses silently without blocking the page.
- [x] #6 Given a lost-pet detail page, when shown, then one labelled ad slot appears below the primary actions (for example a vet in your region or a pet shop near you via region targeting, never worded nearest unless true), the reunited screen has one slot and the web sidebar (lg and up) has one slot.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA (static + unit, no e2e/Lighthouse per machine rules). AC1-6 pass: web vitest 37/37 (ads, browse, reunited), mobile jest ad-slot 15/15, route import-graph guard green web+mobile, e2e/ads.spec.ts + lifecycle.spec.ts read (cover 390/1440, CLS<0.1, protected routes, reunited). AC7: verify, e2e, Lighthouse: merge queue on main at b8cf17df. Notes: house-ad images TASK-36.1-3 not made (spot illustration placeholder); ad-free path deferred to TASK-55; A-016 rendered vs viewable CHANGE row still open (web and mobile both viewable 50%/1s now, docs not aligned). Bug: TASK-36.9 (window is not defined in streamed SSR, medium). Added apps/web/components/ads/ad-slot.ssr.test.tsx (it.fails until fixed).
<!-- SECTION:NOTES:END -->
