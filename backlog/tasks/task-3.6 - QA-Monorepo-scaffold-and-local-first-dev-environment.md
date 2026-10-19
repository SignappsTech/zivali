---
id: TASK-3.6
title: 'QA: Monorepo scaffold and local-first dev environment'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-19 15:02'
labels:
  - qa
  - 'est:XS'
  - 'qa:fail'
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
  - TASK-3.13
  - TASK-3.14
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
- [x] #2 Given the workspace, when listing packages, then apps/web, apps/mobile and packages for tokens, types, api, validation and analytics exist and build with Turborepo caching.
- [x] #3 Given AI, Stripe, email, push and analytics integrations, when running locally or in tests, then each sits behind an adapter interface with a mock implementation chosen by environment.
- [x] #4 Given the README, when read, then it documents commands, environment variable names (no values) and branch and CI conventions.
- [x] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-19 on main ef6c492f (web-only pilot sweep; no suites run in main checkout). Result: qa:fail (1 bug).
- AC#1 FAIL (web part): pnpm bootstrap covers install, supabase start, MinIO, prisma migrate reset + seed, package builds; apps/api/.env.local comes from .env.example via postinstall env-sync with local values only. But nothing creates apps/web/.env.local (no apps/web/.env.example, no env-sync) and lib/env.ts has no local default for NEXT_PUBLIC_SUPABASE_URL/PUBLISHABLE_KEY, so pnpm dev web throws Invalid environment on a fresh clone -> TASK-3.15 (minor). Mobile start: deferred: web-only pilot (owner 2026-10-19).
- AC#2 PASS: apps/web, apps/mobile, apps/api and packages tokens, types, api, validation, analytics (+ i18n) in the workspace; turbo build --dry=json: build outputs dist/.next cached, web/mobile/api/tokens/i18n build = cache HIT at HEAD; types/validation/api/analytics export TS source (no build step by design, README/ADR-001).
- AC#3 PASS: apps/api/adapters ai, payments (stripe), email (brevo), push (expo), captcha, embedder, storage share pickProvider() (mock when unset or no credentials outside production, fail fast in production, off); test/adapters/select.test.ts covers it. packages/analytics: mock default via NEXT_PUBLIC_/EXPO_PUBLIC_ANALYTICS_PROVIDER, test/adapters.test.ts. Mobile push EXPO_PUBLIC_PUSH_PROVIDER default mock (device check deferred).
- AC#4 PASS: README has Bootstrap, Commands, verify rule and CI jobs (ci/quality/images/deploy), env var names per file with no values (secretlint runs on root files in verify:static), Branches and commits.
- AC#5 PASS: pnpm verify -> verify:static green in main's latest CI run (298 web e2e, 2026-10-19); turbo run lint typecheck test build --dry=json at HEAD: all 30 tasks cache HIT (turbo caches successful runs only). pnpm quality not run locally (sweep rule); live substitute on / and /en: axe wcag2a/aa/21/22 0 violations at 390 and 1440, 0 console errors, no GA request or _ga cookie before consent, no overflow at 320/390/1440 in Chromium and WebKit, lang sl/en, one h1, main landmark, hreflang in Link header, focus visible on first Tab. Lighthouse LCP gap known and tracked in TASK-90.7 (perf 0.91-0.94).
- Live API: GET api.najdimo.si/v1/health/ready 200 (db ok), /v1/config/public 200; najdimo.si/api/health 200 version 69d07c9716f7.
<!-- SECTION:NOTES:END -->
