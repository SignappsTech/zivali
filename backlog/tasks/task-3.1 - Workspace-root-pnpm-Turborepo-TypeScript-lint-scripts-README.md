---
id: TASK-3.1
title: 'Workspace root: pnpm + Turborepo, TypeScript, lint, scripts, README'
status: Done
assignee:
  - '@tech-lead'
created_date: '2026-10-14 22:11'
updated_date: '2026-10-14 23:09'
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
- [x] #1 The root has package.json (packageManager pnpm 11, engines node 22), pnpm-workspace.yaml (apps/*, packages/*), turbo.json (build, dev, lint, typecheck, test with dependsOn and outputs), .npmrc (node-linker=hoisted), .nvmrc, tsconfig.base.json (strict), eslint.config.mjs (flat), Prettier config and .editorconfig.
- [x] #2 Root scripts exist with the names used in docs/tech/frontend.md and backend.md (bootstrap, dev, build, lint, typecheck, test, verify, quality, db:start, db:stop, db:reset, db:test, db:lint, db:drain, gen:types, functions:serve, functions:check, admin:create); scripts whose pieces do not exist yet run as Turbo no-ops or print which task adds them.
- [x] #3 .env.example lists every variable name from both slices with empty values; .gitignore covers env files, .secrets/, dist, .turbo, .next, .expo and quality-report; line endings stay LF.
- [x] #4 README documents the bootstrap (target under 15 minutes from a fresh clone), commands, environment variable names without values, branch and commit conventions, the `pnpm verify` rule and Windows notes (Docker Desktop, LF).
- [x] #5 `pnpm install` and `pnpm verify` succeed on the workspace as it stands.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Root config: package.json (packageManager pnpm 11, engines node 22, devDeps turbo/typescript 6.0/eslint 10/typescript-eslint/prettier/supabase CLI/deno), pnpm-workspace.yaml (apps/*, packages/*, supabase/functions), turbo.json, .npmrc hoisted, .nvmrc, tsconfig.base.json, eslint.config.mjs (shared base), .prettierrc.json/.prettierignore, .editorconfig.
2. scripts/if-exists.mjs guard so db:*, functions:*, quality, db:drain, admin:create activate when the owning task lands and print the task id until then; gen:types via Turbo no-op.
3. .env.example from both slices; .gitignore additions (env, quality-report, test output).
4. README.md (bootstrap, commands, env names, git conventions, verify rule, Windows notes); the old readme.md plan sketch moves to docs/plan-sketch.md (CHANGE request for the brief link).
5. ADR-017: dev rows for @eslint/js, typescript-eslint, globals, deno.
6. pnpm install + pnpm verify on Windows; commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Decisions: pnpm 11 ignores node-linker in .npmrc, so nodeLinker: hoisted lives in pnpm-workspace.yaml (.npmrc kept as mirror; ADR-001 updated). Ignored install scripts fail pnpm 11 installs: allowBuilds lists deno only. Root eslint.config.mjs is the shared base; apps add their own config that spreads it (ADR-001, slices). scripts/if-exists.mjs guards db:*, functions:*, quality, db:drain, admin:create and the seed-photos step, printing the owning task until the file exists; gen:types/dev/build/lint/typecheck/test are Turbo no-ops with no packages. Supabase CLI and deno are root devDependencies (ADR-017 rows added). Plan sketch moved readme.md -> docs/plan-sketch.md (brief link needs updating).
Validation: pnpm install exit 0; pnpm verify exit 0 (worktree and a fresh git-archive copy with --frozen-lockfile, via global pnpm and corepack); pnpm bootstrap exit 0 with skips; every guarded script exits 0 with its task id; active path tested with a temp supabase/functions (deno check fails on a type error, passes when fixed) and exit-code passthrough; a throwaway packages/demo was picked up by Turbo lint (root ESLint config, unused var fails) and typecheck (tsconfig.base, .ts imports) then removed.

Review round 1 (CHANGES) addressed: rebased on main (bb1c035), backend.md ownership conflict resolved keeping both bullets plus the allowBuilds rule; .env.example/README carry the new slice names (diffed against both slices: none missing); .gitignore covers next-env.d.ts, expo-env.d.ts, apps/mobile/ios|android; turbo.json globalEnv APP_ENV and build inputs .env*. pnpm install and pnpm verify exit 0.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Workspace root for the pnpm 11 + Turborepo monorepo: package.json with every root script named in the slices (self-activating guards until TASK-3.2/4.1/6.3/6.6/34.2 land), workspace/turbo/TS 6 strict/ESLint 10/Prettier/editorconfig, .env.example with all slice variables by file, .gitignore, developer README. Verified with pnpm install + pnpm verify on the worktree and on a fresh export of the commit.
<!-- SECTION:FINAL_SUMMARY:END -->
