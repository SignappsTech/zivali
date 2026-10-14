---
id: TASK-32.1
title: >-
  Payments core: checkout endpoint, Stripe webhook ledger, mock provider,
  live-key and live-mode gates
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-14 23:38'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-6.8
  - TASK-6.3
  - TASK-3.9
  - TASK-6.12
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C13-payments.md
  - docs/tech/adr/011-payments-stripe.md
  - docs/tech/contracts/C10-notifications-alerts.md
parent_task_id: TASK-32
priority: medium
ordinal: 177000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tips, contributions and later boosts, tags and subscriptions all need one safe, mockable test-mode payment path (FR-020).

## Packet

Unblocks on: Abuse, payments, ads, leads and organisations models with seed merged (TASK-6.8); Worker and jobs: pg-boss, queue registry with stubs, schedules, keep-alive, drain merged (TASK-6.3); API adapters ported from the TASK-3.2 branch, plus a storage adapter (R2, MinIO, memory) merged (TASK-3.9); API auth and platform middleware: JWKS verification, guards, rate limits, idempotency, ctx, audit, public config merged (TASK-6.12)
Contracts: C13, C10 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-32.1-payments-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST /v1/payments/checkout (Idempotency-Key required) validates purpose, integer cents, the EUR 2.00 minimum (MIN_AMOUNT) and per-purpose bounds, inserts a pending payment and returns a checkout URL from the stripe or mock adapter.
- [ ] #2 Fixed prices are read from app_config payments.prices (Boost EUR 4.99, Premium EUR 2.99/month or EUR 24.99/year, Vet Partner EUR 39/month; used from M4) and never from the client; user-chosen amounts (tip, report_contribution, support) need only the EUR 2.00 minimum and the per-purpose maximum.
- [ ] #3 POST /v1/webhooks/stripe verifies the signature on the raw body, rejects livemode events, stores payment_events idempotently (a duplicate event leaves one ledger entry) and updates payment status for completed, failed, expired and refunded events.
- [ ] #4 The payments adapter refuses live keys (sk_live_, rk_live_, pk_live_) with a unit test, and app_config payments.live_allowed stays false until the fiscal-invoice story is done or not required; without Stripe keys the mock provider simulates success, failure and cancel end to end.
- [ ] #5 payment.effects sends the payment_receipt email in the user's language and an in-app notification; on staging the webhook endpoint is created through the Stripe API (test mode) and its signing secret stored as a server secret, never printed.
- [ ] #6 Mobile return URLs (zivali://payments/return) are supported; the IAP risk (R-003) is noted in the API README.
<!-- AC:END -->
