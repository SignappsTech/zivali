---
id: TASK-6.12
title: >-
  API auth and platform middleware: JWKS verification, guards, rate limits,
  idempotency, ctx, audit, public config
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-14 23:35'
updated_date: '2026-10-15 05:43'
labels:
  - be
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-6.2
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C1-platform-conventions.md
  - docs/tech/contracts/C3-auth-profiles-roles.md
  - docs/tech/adr/020-api-architecture.md
parent_task_id: TASK-6
priority: high
ordinal: 280000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every endpoint needs the same token verification, guards, rate limits, idempotent replays and domain context; building them once keeps 30+ endpoints consistent and testable.
## Packet
Unblocks on: DB foundation and lockdown: schema app, extensions, deny-all RLS, security tests, platform models, fixture users merged (TASK-6.2)
Contracts: C1, C3 (in references); conventions in C1 and ADR-020
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.12-api-auth
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 authMiddleware verifies Supabase access tokens with jose against the JWKS (HS256 secret fallback locally), returns UNAUTHENTICATED for invalid or expired tokens and builds the actor { user_id, role, is_anonymous, aal, email_verified, locale }; optionalAuth never blocks; ensureProfile creates missing profiles.
- [ ] #2 Guards requireVerified, requireRole, requireAal2 and rejectAnonymous return the C1 codes; tests use locally signed tokens for every actor type.
- [ ] #3 rateLimit (Postgres fixed window, HMAC-hashed IP and device keys, Retry-After) and the idempotency middleware (24 h replay for the same user, CONFLICT for another user, secrets encrypted) work per C1 with tests.
- [ ] #4 Context helpers userCtx(req) and systemCtx() expose actor, locale, hashes, now, jobs, logger and adapters; AuditDao.write and a 60 s config store exist; GET /v1/config/public returns the public app_config flags.
- [ ] #5 pg-boss tables created at runtime (pgboss schema) have RLS enabled by a startup hook after creation, covered in test/security (same as CH-103 for TASK-6.3)
<!-- AC:END -->
