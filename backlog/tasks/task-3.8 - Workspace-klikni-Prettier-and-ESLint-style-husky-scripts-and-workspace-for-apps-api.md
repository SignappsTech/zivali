---
id: TASK-3.8
title: >-
  Workspace: klikni Prettier and ESLint style, husky, scripts and workspace for
  apps/api
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 23:35'
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
- [ ] #1 Prettier uses klikni settings (useTabs, tabWidth 4, printWidth 120, singleQuote, semi, trailingComma es5, endOfLine lf), ESLint adds import/order and the prettier plugin, .editorconfig matches, and the whole repo is reformatted once with `pnpm verify` passing.
- [ ] #2 husky and lint-staged run eslint --fix and prettier on staged files; the commit message format stays `<task-id>: <what>`.
- [ ] #3 Root scripts serve the new backend: db:start and db:stop (supabase), db:migrate, db:reset and db:seed (Prisma through the api package), jobs:drain, and `pnpm dev` starts api, worker and web; functions:* scripts, the deno devDependency and `supabase/functions` in pnpm-workspace.yaml are removed.
- [ ] #4 .env.example lists every variable name from backend.md and frontend.md with empty values.
<!-- AC:END -->
