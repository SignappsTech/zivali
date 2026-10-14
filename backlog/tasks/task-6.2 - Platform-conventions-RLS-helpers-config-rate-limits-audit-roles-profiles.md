---
id: TASK-6.2
title: 'Platform conventions: RLS helpers, config, rate limits, audit, roles, profiles'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
labels:
  - be
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-3.2
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C1-platform-conventions.md
  - docs/tech/contracts/C3-auth-profiles-roles.md
parent_task_id: TASK-6
priority: high
ordinal: 122000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every later table, RPC and job relies on the same RLS helpers, config, rate limits, audit and roles; defining them once keeps 30+ backend tasks consistent.

## Packet

Unblocks on: Local Supabase stack, Edge Function base and mock adapters merged (TASK-3.2)
Contracts: C1, C3 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.2-platform
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 RLS helpers (auth_role, is_staff with aal2, is_anonymous_user, email_verified), app_config with get_config, check_rate_limit with hashed request_ip and request_device_id, and audit()/audit_log exist exactly as in C1, each with pgTAP tests.
- [ ] #2 profiles, the user_role enum, the profile-creation trigger on auth.users, the custom access token hook (enabled in config.toml) adding user_role, and set_user_role with last-admin protection exist; the RLS matrix proves a user cannot read or update another profile or change their own role.
- [ ] #3 pgTAP guards fail when any public table lacks RLS and when a public table or storage bucket is missing from supabase/data-inventory.json.
- [ ] #4 Fixture users owner, owner2, finder, shelter, mod and admin (@zivali.test, local-only password) are seeded; local TOTP setup for mod and admin is documented.
<!-- AC:END -->
