---
id: TASK-32.4
title: 'QA: Payments core (Stripe test mode)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-16 00:23'
labels:
  - qa
  - 'est:XS'
  - 'qa:fail'
milestone: m-1
dependencies:
  - TASK-32.1
  - TASK-32.2
  - TASK-32.3
references:
  - docs/tech/frontend.md
  - docs/design/pages/P15-support-moments.md
parent_task_id: TASK-32
priority: medium
ordinal: 250000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-32 (Payments core (Stripe test mode)) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-32 merged to main (TASK-32.1, TASK-32.2, TASK-32.3); leads add any later TASK-32 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a signed-in user, when they start a one-off payment (amount, purpose), then a Stripe Checkout session in test mode is created, the user returns to the app and a webhook confirms the result into a payments ledger.
- [x] #2 Given no Stripe keys in local development or CI, when payments run, then a mock provider simulates success, failure and cancel, and live mode cannot be enabled by configuration in this phase (guard plus test).
- [x] #3 Given a successful payment, when recorded, then a confirmation email in the user language is sent and the payment appears in My payments.
- [x] #4 Given mobile, when a payment starts, then it opens web checkout in an in-app browser (no native purchase UI in this phase) and the IAP risk is documented.
- [x] #5 Given other stories, when they integrate, then createPayment(purpose, amount) and a payment-succeeded event are documented as the contract.
- [x] #6 Given user-chosen amounts (custom tips and contributions), when validated, then the minimum card amount is EUR 2.00; amounts are integer cents in EUR; fixed prices come from config (Boost EUR 4.99, Premium EUR 2.99 per month or EUR 24.99 per year, Vet Partner EUR 39 per month); and the ledger is idempotent against webhook retries.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-16. Story code verified on main e3589bd; story tests re-run on c14c4f0 (after TASK-92.1, TASK-107). verify: merge queue, main at c14c4f0 (not run here, machine rules). Fiscal invoices (TASK-92.1) not tested.

Tests: API payments, webhooks, adapters, select, notifications.delivery, commerce seeder 94/94 (e3589bd) and 101/101 (c14c4f0) on scratch DB task_qa_32_4; scripts/stripe-webhook.test.mjs 7/7; web vitest payments 30/30; mobile jest payments + shell 28/28 (both); web e2e payments.spec 4/4 in Chromium, WebKit and 320 px (e3589bd, webpack build).

- AC#1 live in Stripe test mode (Najdimo sandbox, sk_test, stripe listen forwarding to the local API): checkout 200 with a cs_test_ session and a pending row; paid with 4242 in hosted Checkout; Stripe redirected to the success URL; checkout.session.completed answered 200 and moved the row to SUCCEEDED with pi_; payment_events payload redacted to id, type, object_id, payment_intent, amount, currency, status, livemode.
- AC#2: mock is the default without keys; /dev/checkout Success, Fail, Cancel (web e2e) and the API mock end-to-end tests; the API refuses sk_live_ and rk_live_ at boot even with PAYMENTS_PROVIDER=mock (checked by booting it); livemode events 422 and payments.live_allowed false (tests).
- AC#3: after the live payment, payment.effects queued payment_receipt: email_outbox en/mocked (profile locale en) and an inbox row; GET /v1/me/payments lists it; web My payments (e2e), mobile Settings > Placila (jest).
- AC#4: mobile opens Checkout with expo-web-browser openAuthSessionAsync (lib/checkout.ts, jest), no IAP dependency; IAP risk in ADR-011, R-003, A-014. Stripe test mode accepted zivali://payments/return as success and cancel URL (CHANGE row). Needs a device: in-app browser hand-back on Android and iOS.
- AC#5: C13 documents POST /v1/payments/checkout, the client startCheckout(purpose, amountCents, ...) and the payment.effects { payment_id } job on success (names differ from the AC wording createPayment / payment-succeeded).
- AC#6 live: 199 -> 422 MIN_AMOUNT; 200 ok; 250.5, '500', 50001 -> 400; boost and subscription 503, a client amount for boost 400 (prices only from app_config payments.prices 499/299/2499/3900); same Idempotency-Key -> same payment and session; webhook retry (stripe events resend) -> 200, one event row, one receipt; expired session -> CANCELED.
- AC#7 FAIL: on c14c4f0 the web build cannot load next.config.ts (TASK-32.5, regression from TASK-107). Story-scoped quality at e3589bd: tests/quality PROTECTED no-ad-slot checks for /placila/zakljucek, /en/payments/return, /dev/checkout pass; axe 0 on return success and failed and My payments (e2e, 3 projects); at 320 px and 200 % text no horizontal overflow and targets >= 44 px on all return states and My payments (list, empty, error); keyboard only: amount, checkout, Success, focused heading, back link (Chromium; WebKit skips links on Tab by browser default). Lighthouse: the story routes are protected (signed out they show the TASK-9.3 sign-in) and not in lighthouserc.json; a webpack build here (no node_modules junction for Turbopack) is not representative: control pages / and /kako-deluje fail the same way (perf about 0.6, CLS 0.15, script 300-450 KB).
- Dev-only note: /dev/checkout purpose radios are 24 px targets (local-only page, not filed).
<!-- SECTION:NOTES:END -->
