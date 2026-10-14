---
id: TASK-17.1
title: 'Anonymous safeguards: rate limits, holds, manage token, claim, resend'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-29.2
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C7-anonymous-manage-link.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-17
priority: high
ordinal: 160000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Anonymous found reports invite spam and scams, yet finders must manage and chat without an account (FR-006, R-007, ADR-005).

## Packet

Unblocks on: Report write API: create_report, update_report, publish trigger (all report types) merged (TASK-29.2)
Contracts: C7, C4, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-17.1-anon-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 submission_guard enforces anonymous limits per IP hash and device id (default 5/hour and 20/day from app_config) and returns RATE_LIMITED with retry_after; pgTAP proves the sixth report within an hour from one device is refused.
- [ ] #2 Anonymous reports are held (moderation_state 'held', manage link still issued) when the device exceeded 10 reports in 7 days or a photo hash matches a held or removed report.
- [ ] #3 create_report returns a 256-bit manage token for anonymous callers, stores only its SHA-256, stores the optional finder email in report_contacts and enqueues the manage_link email.
- [ ] #4 claim_manage_token binds the caller's anonymous or signed-in uid to report_managers, is rate limited and returns GONE after close; resend_manage_link works for managers with an email on file.
- [ ] #5 Converting the anonymous user to a permanent account keeps the same uid and all report access (tested through the Auth admin API on the local stack).
- [ ] #6 Turnstile captcha for sign-up and anonymous sign-in is documented for cloud environments (credential-gated); locally it stays off.
<!-- AC:END -->
