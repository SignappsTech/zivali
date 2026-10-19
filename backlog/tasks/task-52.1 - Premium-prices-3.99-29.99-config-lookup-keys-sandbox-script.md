---
id: TASK-52.1
title: 'Premium prices 3.99/29.99: config, lookup keys, sandbox script'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-19 15:07'
updated_date: '2026-10-19 19:33'
labels:
  - be
  - 'est:S'
dependencies: []
references:
  - docs/tech/contracts/C13-payments.md§Prices and entitlements
  - docs/tech/backend.md
parent_task_id: TASK-52
priority: medium
ordinal: 425200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-10-19 (PRD v0.11 R-026.1/.2/.10, CH-635): Premium test prices EUR 3.99/month and EUR 29.99/year (were 2.99/24.99).

## Packet

Unblocks on: - (payments ledger and mock provider exist, TASK-32)
Contract: docs/tech/contracts/C13-payments.md§Prices and entitlements (lookup keys premium_monthly / premium_yearly, mismatch guard, mock prices).
Stripe rule (CLAUDE.md): only the 'Najdimo sandbox' account acct_1UQa5wAbrzQytqtO, only with STRIPE_SECRET_KEY from .env.local; never the claude.ai Stripe connector. Tests and CI never call Stripe. The --apply run needs the lead's approval; record its output in the notes.
Review: tech-lead code review
Branch: agent/TASK-52.1-premium-prices
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A migration sets payments.prices premium_monthly_cents 399 and premium_yearly_cents 2999 in place (jsonb_set), other fields untouched; a test reads the new values
- [x] #2 apps/api/scripts/stripe-prices.ts is a dry run by default; --apply creates the Premium product if missing and recurring EUR prices with lookup keys premium_monthly and premium_yearly (transfer_lookup_key), and archives the replaced prices (never deletes)
- [x] #3 The script refuses unless the key is sk_test and the account id is acct_1UQa5wAbrzQytqtO
- [x] #4 PaymentsDomain.premiumPrice(plan) resolves the price by lookup key (10 min cache; mock provider from payments.prices) and answers SERVICE_UNAVAILABLE with log payments.price_mismatch when amount, currency or interval differ; unit tests on the mock
<!-- AC:END -->
