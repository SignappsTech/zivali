---
id: TASK-92.2
title: 'QA: Fiscal invoices for card payments (davčno potrjevanje računov)'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-14 23:36'
updated_date: '2026-10-19 19:09'
labels:
  - qa
  - 'est:XS'
  - 'qa:pass'
milestone: m-1
dependencies:
  - TASK-92.1
  - TASK-92.3
  - TASK-92.4
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C13-payments.md
parent_task_id: TASK-92
priority: high
ordinal: 291000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-92 (Fiscal invoices for card payments (davčno potrjevanje računov)) on main once all its tasks are merged: acceptance criteria below and the quality gates. File bug tasks for failures and set qa:pass or qa:fail.
## Packet
Unblocks on: Fiscal invoices: FURS provider adapter with mock, invoice model, VAT breakdown, ZOI/EOR on receipts, live gate merged (TASK-92.1)
Contracts: C13 (in references); conventions in C1 and ADR-020
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given Boost, Premium, tips/contributions and Vet Partner card payments, when the client's accountant reviews them, then the decision whether fiscally verified invoices are required under ZDavPR (payment cards count as cash) is recorded (Q-012)
- [x] #2 Given the decision is required, when a payment succeeds, then the invoice is fiscally verified through a FURS-certified provider API behind an adapter with a mock, the ZOI and EOR codes appear on the receipt email and PDF, failures are retried, and a premises/device registration note is in the runbook
- [x] #3 Given any invoice, when issued, then it shows a VAT 22 % breakdown
- [x] #4 Given live payments, when config is set to live, then they are blocked until this story is done or the decision is not required
- [x] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-19 (web only; app: later). Code: main 1f40b113 read-only. Live: najdimo.si 69d07c97 (staging; contains all TASK-92.x merges; no story-file diff vs main).
AC1 open on the client: Q-012 still Open (brief, docs/client-todo.md B Accountant); needs-input, not a defect. Live payments stay gated (AC4) until fiscal.required is recorded.
AC2 pass: mock + FURS-test adapter, invoice per succeeded payment, ZOI/EOR on receipt email (webhooks test) and PDF (invoice-pdf test), retries 5x with backoff + hourly fiscal.resubmit + 24 h admin alert, deploy/README 10 premises/device steps.
AC3 pass: PDF prints net, DDV 22 %, total (vatBreakdown, credit notes cumulative).
AC4 pass: liveGateOpen = live_allowed AND (fiscal live OR required=false with provider off); route test 422 LIVE_MODE_FORBIDDEN.
AC5 gates: verify:static PASS (prettier, eslint, 49 script tests, secretlint); api lint + openapi check PASS; api tsc PASS; fiscal adapter + PDF vitest 14/14; web payments-list 4/4. DB-backed API tests and builds not rerun here (no local Supabase/next build allowed): evidence = merge gate full pnpm verify per 92.x merge + lead, deploy-after-green-ci, 2026-10-19. pnpm quality not run (it builds next); touched page /racun/placila is auth-gated: live anon redirect to /vpis?next=, 0 overflow at 390 px, focus visible, Chromium + WebKit, no console errors on the page itself.
Side bug: TASK-33.5 (support receipt copy, minor).
<!-- SECTION:NOTES:END -->
