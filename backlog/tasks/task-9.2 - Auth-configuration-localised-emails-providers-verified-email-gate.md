---
id: TASK-9.2
title: 'Auth configuration: localised emails, providers, verified-email gate'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-14 22:41'
labels:
  - be
  - 'est:S'
milestone: m-0
dependencies:
  - TASK-6.2
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

Unblocks on: Platform conventions: RLS helpers, config, rate limits, audit, roles, profiles merged (TASK-6.2)
Contracts: C3, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-9.2-auth-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Auth email templates (confirm, recovery, magic link, email change, reauthentication and the identity-linked security notice) use the copy in docs/content/notifications-and-emails.md, are localised SL/EN through user_metadata.locale and arrive in the local mail catcher.
- [ ] #2 Google and Apple providers are configured through env() in config.toml and enabled only when credentials exist; redirect URLs cover APP_URL and zivali://.
- [ ] #3 email_verified() blocks unverified email accounts and allows verified and anonymous users; pgTAP covers all three.
- [ ] #4 Profile updates enforce locale sl/en, alert radius 1–25 km and an immutable role; password-reset and sign-in rate limits are configured and documented.
- [ ] #5 Account linking for the same verified email across providers is configured and documented (FR-001 edge case).
<!-- AC:END -->
