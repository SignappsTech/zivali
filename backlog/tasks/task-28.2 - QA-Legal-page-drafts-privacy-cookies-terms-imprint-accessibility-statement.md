---
id: TASK-28.2
title: >-
  QA: Legal page drafts: privacy, cookies, terms, imprint, accessibility
  statement
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-16 07:14'
labels:
  - qa
  - 'qa:fail'
milestone: m-1
dependencies:
  - TASK-28.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P3-public-pages.md
parent_task_id: TASK-28
priority: medium
ordinal: 246000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-28 (Legal page drafts: privacy, cookies, terms, imprint, accessibility statement) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-28 merged to main (TASK-28.1); leads add any later TASK-28 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given the features in scope, when the privacy policy is drafted, then it covers data collected (account, pet, photos, location, chat, payments, ad counters, analytics), purposes and legal bases, retention, processors with transfers (Supabase, Vercel, Stripe, AI provider, Google Analytics and Firebase) and user rights (access, export, delete).
- [ ] #2 Given analytics, when the cookie policy is drafted, then it lists strictly necessary storage and GA4 and Firebase identifiers (such as _ga) with purpose, duration and the consent mechanism.
- [x] #3 Given the terms, when drafted, then they cover acceptable use, scams, finder rewards (display only and arranged between users outside the app, with the scam warning; no escrow, brief v1.1), boosts, subscriptions and contributions (not described as charitable donations unless a qualifying entity exists), ad labelling, shelter terms and liability.
- [x] #4 Given the imprint and accessibility statement, when drafted, then company details are marked as client-supplied and the EAA statement template is ready; all pages exist in SL and EN and are marked requires client and legal review.
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-16, main e2457eef; live read-only checks on staging (sha a244c7dc; legal content identical to main). All 10 legal pages SL+EN: 200, one h1, title/desc/canonical/hreflang OK, draft note shown, SL/EN structure parity exact, no placeholder text; no og tags or BreadcrumbList on legal pages (SEO nit). AC1 pass (Vercel not listed: hosting is Hetzner, ADR-016, AC text stale). AC2 FAIL minor: sessionStorage manage_token missing from cookie list (TASK-28.4); zz_support:* not on main yet (branch agent/task-33.2-support-web). AC3 pass. AC4 pass: imprint company data are [client: ...] placeholders, accessibility statement has feedback channel placeholder, EAA template. AC5 FAIL/not run: nested p in p on all legal pages (TASK-28.3, e.g. 40 on /zasebnost); rest: verify, e2e, Lighthouse: merge queue on main at e2457eef.
<!-- SECTION:NOTES:END -->
