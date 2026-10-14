---
id: TASK-3.2
title: 'Local Supabase stack, Edge Function base and mock adapters'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:11'
labels:
  - tech
  - 'est:M'
milestone: m-0
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C1-platform-conventions.md
  - docs/tech/adr/003-supabase-as-the-backend.md
parent_task_id: TASK-3
priority: high
ordinal: 113000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The backend runs entirely on the local Supabase stack with mock adapters, so no task needs cloud credentials (P-6, ADR-003). This task owns supabase/ only.

## Packet

Unblocks on: nothing (ready now; use `npx supabase` until the workspace root adds the CLI as a devDependency)
Contracts: C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-3.2-sb
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 From a fresh clone `npx supabase start` and `npx supabase db reset` work with no cloud credentials; config.toml enables anonymous sign-ins, email confirmations and TOTP MFA, creates the photos (private, image/jpeg, 1 MB), public-photos and ad-images buckets, globs seed files from supabase/seed/, and keeps Turnstile captcha off locally.
- [ ] #2 The first migration enables postgis, vector, pgmq, pg_cron, pg_net and pgcrypto; `supabase test db` runs a pgTAP suite with one passing test.
- [ ] #3 supabase/functions has deno.json (import map incl. @zivali/validation and npm:zod), _shared env, JSON logger, error helpers and service client, and a health function returning { ok, version, env }.
- [ ] #4 _shared/adapters defines interfaces and mock implementations for ai, embedder, payments, email, push and captcha, chosen by environment variable with mock as the default when credentials are missing; unit tests cover the selection.
- [ ] #5 `deno check` passes for all functions; supabase/README.md documents local endpoints, the mail catcher and Docker Desktop on Windows.
<!-- AC:END -->
