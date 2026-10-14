---
id: TASK-3.1
title: 'Workspace root: pnpm + Turborepo, TypeScript, lint, scripts, README'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 22:11'
labels:
  - tech
  - 'est:S'
milestone: m-0
dependencies: []
references:
  - docs/tech/frontend.md
  - docs/tech/backend.md
  - docs/tech/adr/001-monorepo-and-tooling.md
parent_task_id: TASK-3
priority: high
ordinal: 112000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every other task needs one workspace layout, root scripts and conventions before packages and apps can be added in parallel (ADR-001). This task touches root files only.

## Packet

Unblocks on: nothing (ready now)
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-3.1-ws
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The root has package.json (packageManager pnpm 11, engines node 22), pnpm-workspace.yaml (apps/*, packages/*), turbo.json (build, dev, lint, typecheck, test with dependsOn and outputs), .npmrc (node-linker=hoisted), .nvmrc, tsconfig.base.json (strict), eslint.config.mjs (flat), Prettier config and .editorconfig.
- [ ] #2 Root scripts exist with the names used in docs/tech/frontend.md and backend.md (bootstrap, dev, build, lint, typecheck, test, verify, quality, db:start, db:stop, db:reset, db:test, db:lint, db:drain, gen:types, functions:serve, functions:check, admin:create); scripts whose pieces do not exist yet run as Turbo no-ops or print which task adds them.
- [ ] #3 .env.example lists every variable name from both slices with empty values; .gitignore covers env files, .secrets/, dist, .turbo, .next, .expo and quality-report; line endings stay LF.
- [ ] #4 README documents the bootstrap (target under 15 minutes from a fresh clone), commands, environment variable names without values, branch and commit conventions, the `pnpm verify` rule and Windows notes (Docker Desktop, LF).
- [ ] #5 `pnpm install` and `pnpm verify` succeed on the workspace as it stands.
<!-- AC:END -->
