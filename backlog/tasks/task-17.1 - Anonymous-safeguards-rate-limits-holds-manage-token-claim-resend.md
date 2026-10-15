---
id: TASK-17.1
title: >-
  Anonymous safeguards: submission guard, holds, manage token, claim and resend
  endpoints
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 19:19'
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
- [x] #1 The submission guard in domains/reports enforces anonymous limits per IP and device hash (default 5/hour and 20/day from app_config) and returns RATE_LIMITED with Retry-After; a test proves the sixth report within an hour from one device is refused.
- [x] #2 Anonymous reports are held (moderation_state held, manage link still issued) when the device exceeded 10 reports in 7 days or a photo hash matches a held or removed report.
- [x] #3 POST /v1/reports returns a 256-bit manage token for anonymous callers (only its SHA-256 stored), stores the optional finder email in report_contacts and queues the manage_link email; an Idempotency-Key replay returns the same token (encrypted in the idempotency store for 24 h).
- [x] #4 POST /v1/manage/claim binds the caller's anonymous or signed-in user to report_managers, is rate limited and returns GONE after close; POST /v1/reports/:code/manage-link/resend works for managers with an email on file.
- [x] #5 Converting the anonymous user to a permanent account keeps the same id and all report access (tested with the Auth Admin API on the local stack).
- [x] #6 Turnstile for sign-up and anonymous sign-in is documented for cloud environments; locally it stays off.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TASK-17.1 (backend-dev): guard in domains/reports/submission-guard.ts (consumeRateLimit on app.rate_limits, keys anon_report.hour/.day per IP and device hash; holds with anon_hold moderation flag); new reports.device_hash (cleared after 7 days by retention.purge) and unique manage_token_hash (migration 20261015210000_task_17_1_anon_safeguards, app_config rate.anon_report_per_hour=5, _per_day=20); domains/reports/manage.domain.ts (token, claim, resend; resend rotates the token); routes/manage.routes.ts. Manage-link email is sent directly after commit (C10 sendManageLink, token never in pgboss.job) instead of queued: CHANGE filed. Tests: test/routes/manage.routes.test.ts 16/16 incl. Auth Admin API conversion on the local stack. Scratch DB task_17_1 (auth+realtime schema copied, geo seeded): full api suite green (seeder tests need auth.users rows copied into the scratch DB). Turnstile: supabase/README.md Captcha section.
<!-- SECTION:NOTES:END -->
