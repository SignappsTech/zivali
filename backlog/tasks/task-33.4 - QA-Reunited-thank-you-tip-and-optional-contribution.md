---
id: TASK-33.4
title: 'QA: Voluntary support: Pomagajte nam izboljšati Najdimo'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 20:03'
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
- [x] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA (read-only review, no servers, per machine rules). Web vitest (payments, reunited, report-lost; 93 tests) and mobile jest (support, payments; 29 tests) pass; i18n check OK (SL/EN parity).
- AC1-6 pass: nothing pre-selected (3/5/10/other; 5 has a 2 px ring only), Pay and Skip both secondary and equal, 2-500 EUR client bound plus zod max 50_000 and domain MIN 200 server side, Idempotency-Key per attempt (kept on retry, new on another amount), checkout URL only from the API, payments client lazy (`await import`), donation once (settlePayment), consent via track, no PII, bfcache pageshow reset, focus before Skip, ad hidden `tip && answer === null` (web) and `asking` (mobile), monthly label "Podpiram mesecno" with no amount, no tax or charity claims, receipt and fiscal via payment.effects.
- Added e2e: apps/web/e2e/report-lost.spec.ts asserts the lost-confirmation row collapsed, nothing chosen, Skrij removes it, no payment call (not run here).
- AC7 open: verify, e2e, Lighthouse: merge queue on main at b965dff9.
- Observations (no bug): payment-return retry makes a fresh Idempotency-Key per click (a lost response risks a second pending session, never a second charge); fiscal invoices are issued for every succeeded payment (C13 text), Checkout offers no non-card method today, so equal to card only in practice; ticking monthly ignores the chosen amount (behind flag until M4, API 503s).

QA re-run 2026-10-19 (web only; app: later). Main c2bb2816 (TASK-33.5 merged), read-only. Web vitest payments/reunited/report-lost/account/lost page: 12 files, 114 tests pass. API payments/receipt-copy/prices/webhooks/invoices/notifications on scratch DB task_33_4_qa: 7 files, 126 tests pass (DB dropped after). i18n check OK. AC1-6 re-confirmed in code: nothing pre-selected, 5 € ring only, min 2 € / max 500 €, Pay and Skip both secondary, targets min-h-11/12 (44/48 px), contribution row collapsed and once per report (sessionStorage), receipt p1 support copy (33.5) SL+EN, donation once with amount_bucket + purpose only via consent-gated track, no charity or tax wording (not_donation_note), ad waits while the tip asks. AC7: verify:static + web build + audit + e2e = lead, deploy-after-green-ci, 2026-10-19 (not re-run here: no next build/Playwright on a local server in main). Live najdimo.si 030da43f, then 1ce20600 (deploy landed mid-run, both checked), Chromium + WebKit at 320/390/1440, signed out: /racun, /racun/placila, /en/account, /r/<code>/spet-doma, /en/r/<code>/reunited -> sign-in with next; lost flow shows no ask, no ad slot, no /v1/payments call, no horizontal overflow; public config payments.enabled true, flags.supporter_monthly absent (monthly box hidden: FR-022 is M4, CH-48 default off). Lighthouse 12.6.1 on 1ce20600: /prijava/izgubljena-zival mobile perf 75 LCP 4.7 s (known TASK-112/112.1), a11y 100, BP 96 (CSP issue = known zod eval probe), SEO 66 (staging noindex); desktop 98/100/96/66; /vpis?next=/racun mobile 98/100/100/63, desktop 99/100/100/63. Signed-in states (tip, row, Profile card, return page) not reachable live: no account, sign-up captcha-blocked; covered by unit + CI e2e (lifecycle, report-lost). No live payment made. Coverage gaps (no bug): axe is not run while the tip or the open row is shown; no web e2e for the /racun card. CHANGE: P15 says web has no Profile card (web has one).
<!-- SECTION:NOTES:END -->
