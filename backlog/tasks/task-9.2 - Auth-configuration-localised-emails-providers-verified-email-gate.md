---
id: TASK-9.2
title: >-
  Auth configuration and /v1/me: localised emails, providers, verified-email
  gate
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-14 23:38'
labels:
  - be
  - 'est:S'
milestone: m-0
dependencies:
  - TASK-6.12
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C3-auth-profiles-roles.md
  - docs/tech/contracts/C1-platform-conventions.md
  - docs/content/notifications-and-emails.md
parent_task_id: TASK-9
priority: high
ordinal: 142000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Sign-up must be quick yet safe: localised emails, optional Google/Apple, and email verification before chat and alerts but not before drafts (FR-001).

## Packet

Unblocks on: API auth and platform middleware: JWKS verification, guards, rate limits, idempotency, ctx, audit, public config merged (TASK-6.12)
Contracts: C3, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-9.2-auth-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Auth email templates (confirm, recovery, magic link, email change, reauthentication and the identity-linked notice) use the copy in docs/content/notifications-and-emails.md, are localised SL/EN through user_metadata.locale and arrive in the local mail catcher.
- [ ] #2 Google and Apple providers are configured through env() in config.toml and enabled only when credentials exist; redirect URLs cover APP_URL and zivali://.
- [ ] #3 GET /v1/me and PATCH /v1/me (C3) return and update the own profile with validation (locale sl/en, radius 1–25 km, private phone) and never let a user change their role; requireVerified blocks unverified email accounts and passes verified and anonymous users; Supertest covers all three.
- [ ] #4 Password-reset and sign-in rate limits are configured in Supabase Auth and documented; account linking for the same verified email across providers is configured and documented.
<!-- AC:END -->
