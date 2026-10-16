---
id: TASK-33.4
title: 'QA: Voluntary support: Pomagajte nam izboljšati Najdimo'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-14 22:17'
labels:
  - qa
  - 'est:XS'
  - 'qa:pass'
milestone: m-1
dependencies:
  - TASK-33.2
  - TASK-33.3
  - TASK-33.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P15-support-moments.md
parent_task_id: TASK-33
priority: medium
ordinal: 251000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-33 (Reunited thank-you tip and optional contribution) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-33 merged to main (TASK-33.2, TASK-33.3, TASK-33.1); leads add any later TASK-33 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given an owner who just marked a pet reunited, when the thank-you screen shows, then one-tap amounts EUR 3, EUR 5 (highlighted, not pre-selected), EUR 10 and a custom amount (minimum EUR 2) are offered and Skip is as visible as Pay.
- [x] #2 Given the lost-report confirmation screen, when shown, then the same optional support ask is collapsed by default, nothing is pre-selected and it is not shown again for that report once skipped.
- [x] #3 Given the profile screen on web and mobile, when opened, then a Pomagajte nam izboljšati Najdimo card offers the same amounts and the monthly Podpornik option (FR-022), with no nagging or repeated prompts.
- [x] #4 Given a completed contribution, when recorded, then the user sees a warm thank-you, a receipt email arrives and donation fires with an amount bucket and no personal data (consent only).
- [x] #5 Given the wording, when displayed, then it says support or contribution (podpora, prispevek) and not charitable donation unless the legal entity allows it (FR-024).
- [x] #6 Given the user ignores any ask, when continuing, then nothing blocks or delays their report, matching or alerts.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA (read-only review, no servers, per machine rules). Web vitest (payments, reunited, report-lost; 93 tests) and mobile jest (support, payments; 29 tests) pass; i18n check OK (SL/EN parity).
- AC1-6 pass: nothing pre-selected (3/5/10/other; 5 has a 2 px ring only), Pay and Skip both secondary and equal, 2-500 EUR client bound plus zod max 50_000 and domain MIN 200 server side, Idempotency-Key per attempt (kept on retry, new on another amount), checkout URL only from the API, payments client lazy (`await import`), donation once (settlePayment), consent via track, no PII, bfcache pageshow reset, focus before Skip, ad hidden `tip && answer === null` (web) and `asking` (mobile), monthly label "Podpiram mesecno" with no amount, no tax or charity claims, receipt and fiscal via payment.effects.
- Added e2e: apps/web/e2e/report-lost.spec.ts asserts the lost-confirmation row collapsed, nothing chosen, Skrij removes it, no payment call (not run here).
- AC7 open: verify, e2e, Lighthouse: merge queue on main at b965dff9.
- Observations (no bug): payment-return retry makes a fresh Idempotency-Key per click (a lost response risks a second pending session, never a second charge); fiscal invoices are issued for every succeeded payment (C13 text), Checkout offers no non-card method today, so equal to card only in practice; ticking monthly ignores the chosen amount (behind flag until M4, API 503s).
<!-- SECTION:NOTES:END -->
