---
id: TASK-96
title: >-
  Serialize web typecheck and build in turbo (both write .next/types; flaky
  verify)
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-15 03:29'
labels:
  - tech
  - trivial
  - 'est:XS'
dependencies: []
ordinal: 308000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CH-89: web#typecheck and web#build both write .next/types in parallel, so pnpm verify fails at random.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 web#typecheck dependsOn web#build, or typecheck uses next typegen into its own dir (turbo.json: `web#typecheck` dependsOn `["^build", "web#build"]`; dry-run graph confirms)
- [x] #2 pnpm verify passes 3 times in a row (3 runs in this worktree, all exit 0: 30/30 successful; runs 1 and 2 had web#typecheck re-executed after web#build, run 3 a full cache replay)
<!-- AC:END -->
