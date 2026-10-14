---
id: TASK-5.1
title: >-
  Staging deploy pipeline: Vercel project, Supabase cloud migrations and
  functions (production gated)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
labels:
  - tech
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-3.3
  - TASK-3.2
references:
  - docs/tech/backend.md
  - docs/tech/frontend.md
  - docs/tech/adr/016-environments-hosting-cicd.md
parent_task_id: TASK-5
priority: medium
ordinal: 119000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Staging credentials arrived on 2026-10-15 (Supabase project najdimo, Vercel, Expo, Stripe test); every merge to main should reach staging, while production (no project yet) and machines without .env.local fall back to a dry run (ADR-016).

## Packet

Unblocks on: Web app scaffold: Next.js 16, Tailwind 4 + shadcn, tokens, locale routing, Supabase helpers merged (TASK-3.3); Local Supabase stack, Edge Function base and mock adapters merged (TASK-3.2)
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-5.1-deploy
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A Vercel project for apps/web exists in team primozbozics-projects (monorepo root directory apps/web, pnpm + Turborepo build) with staging environment variables set from .env.local through the Vercel API or CLI, never printing values.
- [ ] #2 scripts/deploy.mjs staging links the Supabase project najdimo (ref omtpppzrugibquukhnyl), pushes migrations, deploys Edge Functions, sets function and Vault secrets, deploys the web app to Vercel (prebuilt) and smoke-checks /api/health and functions/v1/health; the run is repeatable and idempotent.
- [ ] #3 When required variables are missing (production today, or a machine without .env.local) the script prints `NEEDS-INPUT:` with the variable names (never values), runs the dry-run path (build all, supabase db reset from zero, db lint, deno check, expo export) and exits 0.
- [ ] #4 .github/workflows/deploy-staging.yml runs on push to main; a production workflow runs on version tags with manual approval.
- [ ] #5 A check fails when a migration lacks the `-- task:` and `-- rollback:` header lines; migrations run against a clean local database in CI.
- [ ] #6 The README section 'Environments and credentials' lists every required credential, who provides it and which features stay blocked without it.
<!-- AC:END -->
