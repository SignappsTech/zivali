---
id: TASK-34.2
title: 'Admin backend: aal2 enforcement, admin bootstrap script, audit log read'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-6.2
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

Unblocks on: Platform conventions: RLS helpers, config, rate limits, audit, roles, profiles merged (TASK-6.2); Auth configuration: localised emails, providers, verified-email gate merged (TASK-9.2)
Contracts: C3, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-34.2-admin-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Staff RLS and RPCs require aal2; a moderator or admin without a verified TOTP factor is refused.
- [ ] #2 scripts/admin-create.mjs (`pnpm admin:create <email>`) promotes an existing account to admin using the service role; there is no public path to admin.
- [ ] #3 list_audit_log(filters, cursor) is readable by admins only; every staff RPC writes an audit entry (pgTAP).
- [ ] #4 Role changes through set_user_role are audited and the last admin cannot be demoted.
<!-- AC:END -->
