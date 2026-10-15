---
id: TASK-3.8
title: >-
  Workspace: klikni Prettier and ESLint style, husky, scripts and workspace for
  apps/api
status: Done
assignee:
  - '@tech-lead'
created_date: '2026-10-14 23:35'
updated_date: '2026-10-15 00:07'
labels:
  - tech
  - 'est:S'
  - trivial
milestone: m-0
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/frontend.md
  - docs/tech/adr/020-api-architecture.md
parent_task_id: TASK-3
priority: high
ordinal: 278000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The client confirmed klikni formatting (tabs, width 120) for this repo and the backend moved to apps/api; reformatting now, while little code exists, is cheap. This task owns the root files.
## Packet
Unblocks on: nothing (ready now)
Contracts: - (in references); conventions in C1 and ADR-020
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-3.8-format-ws
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Prettier uses klikni settings (useTabs, tabWidth 4, printWidth 120, singleQuote, semi, trailingComma es5, endOfLine lf), ESLint adds import order (eslint-plugin-import-x, klikni groups) and eslint-config-prettier with Prettier run on its own (ADR-017, Project Lead decision 2026-10-15), .editorconfig matches, and the whole repo is reformatted once with `pnpm verify` passing.
- [x] #2 husky and lint-staged run eslint --fix and prettier on staged files; the commit message format stays `<task-id>: <what>`.
- [x] #3 Root scripts serve the new backend: db:start and db:stop (supabase), db:migrate, db:reset and db:seed (Prisma through the api package), jobs:drain, and `pnpm dev` starts api, worker and web; functions:* scripts, the deno devDependency and `supabase/functions` in pnpm-workspace.yaml are removed.
- [x] #4 .env.example lists every variable name from backend.md and frontend.md with empty values.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Two commits: config first, then the mechanical reformat (pnpm format + eslint --fix for import order; git diff -w is about 60 lines, all wrapping and blank lines between import groups).

Decisions (Project Lead 2026-10-15, recorded in ADR-017 and ADR-020):
- Import order with eslint-plugin-import-x (eslint-plugin-import has no ESLint 10 support): klikni groups builtin / external / internal, newlines-between always. This rule needs no resolver config.
- No eslint-plugin-prettier. Prettier runs on its own (prettier --check in verify, prettier --write in lint-staged after eslint --fix, the same order klikni-be's lint-staged uses), and eslint-config-prettier is the last entry of the root config. klikni-be's setup does not need the plugin.
- allowBuilds has unrs-resolver: false. It is import-x's resolver, and its postinstall only re-checks the native binding that pnpm already installs. The deno entry and supabase/functions are removed.
- pnpm dev = turbo run dev dev:worker. Turbo starts whichever entries exist (web from TASK-3.3; api dev and dev:worker from TASK-3.7) and exits 0 when none do, so there is no if-exists guard: a guard on apps/api would stop web from starting.
- db:migrate, db:reset and db:seed run Prisma in apps/api (pnpm --dir apps/api exec prisma ...), guarded on apps/api/prisma.config.ts (TASK-3.7). db:reset = migrate reset --force && db seed, because Prisma 7 no longer seeds on reset.
- jobs:drain runs apps/api/scripts/jobs-drain.ts (TASK-6.3), guarded; the path is recorded in backend.md.
- Also removed: db:test and db:lint (pgTAP replaced), db:drain (renamed jobs:drain), gen:types (no Supabase-generated types). bootstrap now starts MinIO from docker-compose.dev.yml (guarded, TASK-3.7).
- The apps/api package is named `api` (unscoped, because `@zivali/api` is the client package), so `pnpm --filter api` works. web and mobile are unscoped too (backend.md, frontend.md, ADR-001).
- .env.example: the Edge Functions block is replaced by an apps/api block. Added NEXT_PUBLIC_API_URL, EXPO_PUBLIC_API_URL and the deploy variables (HETZNER_*, GHCR_TOKEN). Dropped VERCEL_*, the legacy SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY, the web SUPABASE_SECRET_KEY and the Vault note. A script check confirmed that every name in the backend.md and frontend.md env sections is listed and that no values are set.
- husky sets core.hooksPath=.husky/_ in the shared git config. Worktrees without .husky/_ run no hooks until they install. Docker installs need HUSKY=0 or --ignore-scripts (backend.md).

Verify: pnpm install && pnpm verify pass (prettier check, eslint, scripts tests, tokens lint/test/build).
<!-- SECTION:NOTES:END -->
