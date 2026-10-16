---
id: TASK-92.3
title: >-
  Fiscal invoices: resubmit FAILED invoices within the FURS deadline, with a
  longer retry delay
status: Done
assignee:
  - '@tech-lead'
created_date: '2026-10-15 23:40'
updated_date: '2026-10-16 03:18'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-92.1
parent_task_id: TASK-92
priority: high
ordinal: 330000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-92.1 review. Today payment.effects retries the FURS call five times in about 30 s (lib/jobs.ts:42, backoff without retryDelay), then marks the invoice FAILED, and nothing ever resubmits it. FURS expects a late submission within 2 working days.

## Packet

Contracts: C13 §Fiscal invoices; conventions in C1
Review: tech-lead code review (full mode)
Branch: agent/task-92.3-fiscal-resubmit
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 FURS verify retries use a retryDelay with backoff measured in minutes, not seconds, set in app_config.
- [x] #2 A scheduled job (cron, Europe/Ljubljana) resubmits FAILED and stale PENDING invoices as SubsequentSubmit with the stored ZOI, well inside 2 working days, and alerts the admin (Sentry or ops email) on any invoice still unverified after 24 h.
- [x] #3 Tests cover the resubmit selection, one claim per invoice, and that no new number or ZOI is created.
- [x] #4 From the TASK-92.1 fix round: a verify attempt can't run while another is in flight for the same invoice (a lease column with expiry, or a pg-boss queue with a singleton policy; singletonKey alone may not dedupe on a standard queue), with a test.
<!-- AC:END -->
