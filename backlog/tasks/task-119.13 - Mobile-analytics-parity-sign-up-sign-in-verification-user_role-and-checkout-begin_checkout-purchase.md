---
id: TASK-119.13
title: >-
  Mobile analytics parity: sign-up, sign-in, verification, user_role and
  checkout (begin_checkout, purchase)
status: Backlog
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 23:55'
updated_date: '2026-10-19 23:57'
labels:
  - fe
  - 'est:M'
  - no-design
  - mobile
dependencies:
  - TASK-119.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C12b-analytics-tracking-plan.md§3. Flows and steps
  - docs/tech/contracts/C12b-analytics-tracking-plan.md§6. Checkout
  - docs/tech/contracts/C12-analytics-consent.md§Mobile wiring
parent_task_id: TASK-119
priority: low
ordinal: 524200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Web-first pilot: mobile follows after the store accounts (status Backlog until then). Files owned: apps/mobile/app/auth/**, the mobile session sync, apps/mobile/components/payments/** and their tests. Same events as web (TASK-119.7, TASK-119.10).

## Packet
Unblocks on: TASK-119.2 (registry, commerceParams); mobile release planning (store accounts)
Branch: agent/TASK-119.13-mobile-analytics-auth-checkout
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Mobile sign-up, sign-in and reset send the sign_up, sign_in and reset_password flow steps, sign_up { method } and login { method } and flow_error as C12b §3 and §4; setUserRole runs once the session is known (C12b §9 mapping)
- [ ] #2 Mobile checkout sends flow_step checkout amount and return, begin_checkout before the in-app browser opens and, once per payment, purchase plus donation or supporter_subscribe on a succeeded return, as C12b §6
- [ ] #3 jest-expo tests assert the mock events and nothing without consent; Firebase DebugView on a device build shows the events
<!-- AC:END -->
