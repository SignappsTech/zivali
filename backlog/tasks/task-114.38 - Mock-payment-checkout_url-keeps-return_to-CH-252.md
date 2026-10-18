---
id: TASK-114.38
title: Mock payment checkout_url keeps return_to (CH-252)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-18 22:08'
labels:
  - be
  - bug
  - 'est:XS'
  - no-design
dependencies: []
references:
  - docs/tech/contracts/C13-payments.md
parent_task_id: TASK-114
priority: low
ordinal: 400200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
apps/api/adapters/payments/mock.ts: the mock checkout_url drops return_to. Add it: APP_URL/dev/checkout?payment_id=...&return_to=... (C13 section Mock provider), so /dev/checkout returns to the page the payment started from. The web dev page already forwards return_to when present.

## Packet

Unblocks on: nothing open (TASK-32.2 merged).
Review: tech-lead code review; run pnpm verify before reporting done.
Branch: agent/task-114.38-mock-return-to
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Mock createCheckout returns a checkout_url that carries a URL-encoded return_to when the caller gave one (validated as before by the C13 rule) and omits it otherwise; adapter test covers both.
- [ ] #2 'Back' on the return page after a mock checkout lands on the page the payment started from.
<!-- AC:END -->
