---
id: TASK-17.1
title: >-
  Anonymous safeguards: submission guard, holds, manage token, claim and resend
  endpoints
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 18:19'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-29.2
  - TASK-6.12
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

Unblocks on: Report write API: POST and PATCH /v1/reports with idempotency, guard hook and jobs merged (TASK-29.2); API auth and platform middleware: JWKS verification, guards, rate limits, idempotency, ctx, audit, public config merged (TASK-6.12)
Contracts: C7, C4, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-17.1-anon-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The submission guard in domains/reports enforces anonymous limits per IP and device hash (default 5/hour and 20/day from app_config) and returns RATE_LIMITED with Retry-After; a test proves the sixth report within an hour from one device is refused.
- [ ] #2 Anonymous reports are held (moderation_state held, manage link still issued) when the device exceeded 10 reports in 7 days or a photo hash matches a held or removed report.
- [ ] #3 POST /v1/reports returns a 256-bit manage token for anonymous callers (only its SHA-256 stored), stores the optional finder email in report_contacts and queues the manage_link email; an Idempotency-Key replay returns the same token (encrypted in the idempotency store for 24 h).
- [ ] #4 POST /v1/manage/claim binds the caller's anonymous or signed-in user to report_managers, is rate limited and returns GONE after close; POST /v1/reports/:code/manage-link/resend works for managers with an email on file.
- [ ] #5 Converting the anonymous user to a permanent account keeps the same id and all report access (tested with the Auth Admin API on the local stack).
- [ ] #6 Turnstile for sign-up and anonymous sign-in is documented for cloud environments; locally it stays off.
<!-- AC:END -->
