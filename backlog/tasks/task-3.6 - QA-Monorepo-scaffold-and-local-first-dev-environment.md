---
id: TASK-3.6
title: 'QA: Monorepo scaffold and local-first dev environment'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-14 23:38'
labels:
  - qa
  - 'est:XS'
milestone: m-0
dependencies:
  - TASK-3.1
  - TASK-3.2
  - TASK-3.3
  - TASK-3.4
  - TASK-3.5
  - TASK-3.7
  - TASK-3.8
  - TASK-3.9
references:
  - docs/tech/frontend.md
parent_task_id: TASK-3
priority: high
ordinal: 220000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-3 (Monorepo scaffold and local-first dev environment) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: Workspace root: pnpm + Turborepo, TypeScript, lint, scripts, README merged (TASK-3.1); Local Supabase stack for Postgres, Auth and Realtime (no Edge Functions) merged (TASK-3.2); Web app scaffold: Next.js 16, Tailwind 4 + shadcn, tokens, locale routing, Supabase helpers merged (TASK-3.3); Mobile app scaffold: Expo SDK 57, Expo Router, NativeWind + RN Reusables, tokens, dev build merged (TASK-3.4); packages/api foundation: REST client, ApiError, idempotency and query helpers, fixtures merged (TASK-3.5); apps/api scaffold: Express 5 + Prisma 7 in klikni style with the domain layer merged (TASK-3.7); Workspace: klikni Prettier and ESLint style, husky, scripts and workspace for apps/api merged (TASK-3.8); API adapters ported from the TASK-3.2 branch, plus a storage adapter (R2, MinIO, memory) merged (TASK-3.9)
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a fresh clone, when a developer runs the documented bootstrap, then pnpm install, local Supabase start, DB migrate and seed, and both apps start with no cloud credentials.
- [ ] #2 Given the workspace, when listing packages, then apps/web, apps/mobile and packages for tokens, types, api, validation and analytics exist and build with Turborepo caching.
- [ ] #3 Given AI, Stripe, email, push and analytics integrations, when running locally or in tests, then each sits behind an adapter interface with a mock implementation chosen by environment.
- [ ] #4 Given the README, when read, then it documents commands, environment variable names (no values) and branch and CI conventions.
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
