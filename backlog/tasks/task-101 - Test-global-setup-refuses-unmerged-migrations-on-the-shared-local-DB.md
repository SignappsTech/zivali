---
id: TASK-101
title: Test global-setup refuses unmerged migrations on the shared local DB
status: Done
assignee:
  - '@tech-lead'
created_date: '2026-10-15 15:10'
updated_date: '2026-10-15 15:22'
labels:
  - tech
  - 'est:XS'
dependencies: []
references:
  - apps/api/test/global-setup.ts
priority: high
ordinal: 323000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
apps/api/test/global-setup.ts runs `prisma migrate deploy` against whatever DATABASE_URL points at. A worktree agent that runs the api suite against the shared local DB (127.0.0.1:55322/postgres) therefore applies its branch's unmerged migrations there, which breaks main's verify (data-inventory test) and every other worktree. Guard it so agents use a per-task scratch DB for migration work, while runs without new migrations keep working on the shared DB.

## Packet

Branch: agent/task-101-db-guard
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When the target database is the shared one (name postgres) and the checkout has migration folders not yet recorded in app._prisma_migrations, global-setup aborts before migrating with a message naming them and how to use a scratch DB (TEST_DATABASE_URL or DATABASE_URL to task_<id>, with a one-line createdb/migrate recipe)
- [x] #2 The main checkout's verify (merge.mjs) still migrates the shared DB after a merge: the base checkout is allowed (e.g. detected by not being under .claude/worktrees, or an explicit ALLOW_SHARED_DB_MIGRATE=1 that merge.mjs's verify sets)
- [x] #3 A worktree whose migrations are all already applied runs against the shared DB unchanged
- [x] #4 apps/api README "Tests" section documents the scratch DB recipe
<!-- AC:END -->
