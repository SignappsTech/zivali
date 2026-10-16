---
id: TASK-32.5
title: >-
  Web build fails to load next.config.ts: SWC rejects two-entry non-wildcard
  tsconfig paths (TASK-107)
status: Done
assignee:
  - '@tech-lead'
created_date: '2026-10-16 00:22'
updated_date: '2026-10-16 02:07'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-32
priority: high
ordinal: 332000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by QA TASK-32.4 (AC#7: story gates pass on main). Regression from TASK-107 commit bb63a6d (node_modules fallback for built-output paths).

Steps: on main c14c4f0 (still on fc1ce72: apps/web/tsconfig.json unchanged), cd apps/web; APP_ENV=local NEXT_PUBLIC_API_URL=http://localhost:4000 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=x npx next build (same with --webpack).
Expected: next.config.ts loads and the build runs.
Actual: 'assertion left == right failed: value of paths.@zivali/tokens/map-style should be an array with one element because the src path does not contains * (wildcard)' then 'Failed to load next.config.ts' and 'Build error occurred'. SWC allows only one target for a non-wildcard key; apps/web/tsconfig.json now lists two for @zivali/tokens/map-style and @zivali/tokens/values (packages/... plus node_modules/... fallback). At e3589bd (before TASK-107) the same build passed.
Impact: web build, pnpm verify (turbo build), e2e, pnpm quality and the web Docker image all fail; the story pages of TASK-32 cannot be built on main.
Severity: blocker (red main). Check why the merge-queue verify did not catch it (turbo cache?).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 On main, `pnpm --filter web build` (Turbopack) and `next build --webpack` load next.config.ts and complete; non-wildcard @zivali/* paths in apps/web/tsconfig.json have exactly one target (or the fallback moves elsewhere); scripts/workspace-paths.test.mjs guards it
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed on main in 336949b (TASK-107 follow-up): apps/web keeps one paths target for non-glob keys, so next build loads next.config.ts again; batch 16+ verify and e2e passed.
<!-- SECTION:NOTES:END -->
