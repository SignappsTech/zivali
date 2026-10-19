---
id: TASK-33.5
title: >-
  Receipt email for a profile support payment says it was a contribution for
  publishing a search
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 19:06'
updated_date: '2026-10-19 19:08'
labels:
  - bug
  - 'est:XS'
  - web
dependencies: []
parent_task_id: TASK-33
priority: low
ordinal: 442200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by QA TASK-92.2 (main 1f40b113, read-only; same code in live 69d07c97). Steps: on web Profile, pay via the support card (purpose support, Stripe test mode); payment.effects sends payment_receipt. Expected: p1 thanks for supporting Najdimo. Actual: packages/i18n/messages/{sl,en}/email.json payment_receipt.p1 selects only tip vs other, so support falls to other: 'Prejeli smo vas prispevek ob objavi iskanja' / 'We received your contribution for publishing your search'. Purpose comes from apps/api/domains/payments/payments.notify.ts (payment.purpose lowercased). Severity: minor (wrong copy on a transactional email). Not live-checked: no mailbox; headless sign-up is captcha-blocked. Note for TASK-33.4 QA.
## Packet
Unblocks on: - (ready now)
Branch: agent/task-33.5-support-receipt-copy
Review: tech-lead (Sonnet, est:XS); run pnpm verify before reporting done.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A succeeded payment with purpose support gets a receipt email (sl and en) whose first paragraph names a support contribution, not a contribution for publishing a search; tip and report_contribution copy unchanged; a test covers the support case
<!-- AC:END -->
