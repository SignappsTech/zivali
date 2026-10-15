---
id: TASK-3.2
title: 'Local Supabase stack for Postgres, Auth and Realtime (no Edge Functions)'
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:11'
updated_date: '2026-10-15 00:20'
labels:
  - tech
  - 'est:S'
milestone: m-0
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/adr/021-database-not-exposed.md
  - docs/tech/adr/020-api-architecture.md
parent_task_id: TASK-3
priority: high
ordinal: 113000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Brief v1.0 keeps Supabase only for Postgres (PostGIS, pgvector), Auth and Realtime; the API moves to Express + Prisma (ADR-020). The unmerged branch agent/task-3.2-sb is reworked in a fix round: keep `supabase/config.toml` (updated), `supabase/.gitignore` and `supabase/README.md`; remove `supabase/functions/`, `supabase/migrations/` and `supabase/tests/` (Prisma owns the schema; the adapter code moves to apps/api in the adapters task).

## Packet

Unblocks on: nothing (ready now)
Contracts: C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-3.2-sb
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `supabase start` runs Postgres 17 (PostGIS and pgvector available), Auth (email confirmations, anonymous sign-ins, TOTP MFA, Turnstile off locally), Realtime with private channels and the mail catcher, with no cloud credentials; storage buckets are removed from config.toml (photos live in R2/MinIO).
- [x] #2 PostgREST exposes only the `public` schema (`[api] schemas = ["public"]`), and config.toml comments that app tables live in the non-exposed `app` schema (ADR-021).
- [x] #3 supabase/functions/, supabase/migrations/ and supabase/tests/ from the branch are removed; nothing else in the repo depends on them.
- [x] #4 supabase/README.md documents local endpoints, the mail catcher, port overrides for Hyper-V reserved ranges on Windows, and that Supabase holds only the database, Auth and Realtime.
<!-- AC:END -->
