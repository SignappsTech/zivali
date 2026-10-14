---
id: TASK-32.2
title: 'Web mock checkout, payment return page and My payments'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-14 22:42'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-11.2
  - TASK-9.3
  - TASK-6.10
  - TASK-33.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C13-payments.md
  - docs/design/pages/P15-support-moments.md
parent_task_id: TASK-32
priority: medium
ordinal: 209000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The payment hand-off must work end to end with the mock provider before any Stripe key exists (FR-020, P-6).

## Packet

Unblocks on: Web shell: header, footer, layout, route groups and guards, shared states merged (TASK-11.2); Web sign-in, sign-up, verification, reset, account page and guards merged (TASK-9.3); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); Design: Support moments: tip and contribution (P15) approved (TASK-33.1)
Design: P15 docs/design/pages/P15-support-moments.md (mockup docs/design/mockups/P15-support-moments.html; TASK-33.1)
Copy: docs/content/pages/P15-support-moments.md
Contracts: C13 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-32.2-payments-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /dev/checkout (non-production only) shows the mock session with Success, Fail and Cancel and posts the signed mock event.
- [ ] #2 The payments return page shows success, failure or cancel per P15 and has no ads.
- [ ] #3 /account/payments lists the user's payments with localised amounts and dates.
- [ ] #4 A payment of EUR 1.50 shows the minimum-amount message (Playwright with the mock provider).
<!-- AC:END -->
