---
id: TASK-4.2
title: CI pipeline and `pnpm verify`
status: Done
assignee:
  - '@tech-lead'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 07:27'
labels:
  - tech
  - 'est:S'
milestone: m-0
dependencies:
  - TASK-4.1
  - TASK-3.4
  - TASK-3.2
  - TASK-3.7
references:
  - docs/tech/frontend.md
  - docs/tech/backend.md
parent_task_id: TASK-4
priority: high
ordinal: 118000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every merge must pass the same gates; until a GitHub remote exists the same sequence runs locally as `pnpm verify` (ADR-016).

## Packet

Unblocks on: Quality kit: axe, visual, Lighthouse CI, links, PR template merged (TASK-4.1); Mobile app scaffold: Expo SDK 57, Expo Router, NativeWind + RN Reusables, tokens, dev build merged (TASK-3.4); Local Supabase stack for Postgres, Auth and Realtime (no Edge Functions) merged (TASK-3.2); apps/api scaffold: Express 5 + Prisma 7 in klikni style with the domain layer merged (TASK-3.7)
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-4.2-ci
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 .github/workflows/ci.yml runs on pull requests and main: pnpm install with cache, format check, lint, typecheck, tokens build, unit tests (Vitest, jest-expo), i18n check, supabase start + prisma migrate reset, API tests and the ADR-021 security tests, web build + Playwright smoke + quality kit + Lighthouse CI against the local API, mobile expo export + tsc, and Docker builds of the api and web images. (Deferred: "quality against the API" waits for the first story whose page reads the API; the commented step in ci.yml starts it. Web image waits for TASK-5.1.)
- [ ] #2 secretlint and `pnpm audit --audit-level high` fail the build on findings (shown with a planted fake secret on a throwaway branch that is then deleted). (Unchecked: proven on first CI run (needs the GitHub push).)
- [ ] #3 `pnpm verify` runs the same sequence locally on Windows and Linux and is documented as mandatory before an implementer reports done. (Unchecked: proven on first CI run (needs the GitHub push). `pnpm verify` now excludes audit and e2e, which are separate CI steps.)
- [ ] #4 Branch protection for main (required checks) is documented for the GitHub repository pbozic/zivali.
- [ ] #5 CI runs `pnpm exec playwright install chromium` before `pnpm quality`; QUALITY_PORT may override the 8080 default
<!-- AC:END -->
