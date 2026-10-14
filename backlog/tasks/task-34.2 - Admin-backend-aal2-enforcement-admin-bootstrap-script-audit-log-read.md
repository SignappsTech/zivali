---
id: TASK-34.2
title: >-
  Admin API: aal2 enforcement, users and roles, audit log, queues, admin
  bootstrap script
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-14 23:38'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-6.12
  - TASK-9.2
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C3-auth-profiles-roles.md
  - docs/tech/contracts/C1-platform-conventions.md
  - docs/tech/adr/018-roles-and-admin-strong-auth.md
parent_task_id: TASK-34
priority: high
ordinal: 178000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ads, abuse reports and later organisations and orders all need a protected admin area with an audit trail (FR-019).

## Packet

Unblocks on: API auth and platform middleware: JWKS verification, guards, rate limits, idempotency, ctx, audit, public config merged (TASK-6.12); Auth configuration and /v1/me: localised emails, providers, verified-email gate merged (TASK-9.2)
Contracts: C3, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-34.2-admin-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 requireAal2 protects every staff route; a moderator or admin without a verified TOTP factor gets AAL2_REQUIRED.
- [ ] #2 scripts/admin-create.mjs (`pnpm admin:create <email>`) promotes an existing account to admin through the Supabase Admin API and the profile role; there is no public path to admin.
- [ ] #3 GET /v1/admin/audit-log (admins, filters, cursor), GET /v1/admin/users and PUT /v1/admin/users/:id/role (audited, last admin protected) work per C3; every staff domain call writes an audit entry.
- [ ] #4 GET /v1/admin/queues shows pg-boss queue counts and failed jobs for admins.
<!-- AC:END -->
