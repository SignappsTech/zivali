---
id: TASK-102
title: Test global-setup flags unmerged migrations already applied to the shared DB
status: Done
assignee:
  - '@tech-lead'
created_date: '2026-10-15 19:45'
updated_date: '2026-10-15 23:06'
labels:
  - tech
  - 'est:XS'
dependencies: []
references:
  - apps/api/test/global-setup.ts
  - apps/api/test/helpers/db-guard.ts
priority: high
ordinal: 324000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On 2026-10-15 an agent ran `prisma migrate deploy` directly against the shared local DB (bypassing the TASK-101 test guard), applying an unmerged migration (TASK-6.16). Main's verify then failed with confusing Prisma errors in unrelated tests. Make the cause obvious: when the target is the shared DB, global-setup also checks the reverse direction and aborts with a clear message.

## Packet

Branch: agent/task-102-db-drift
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When the target DB is the shared one (name postgres on localhost/127.0.0.1) and app._prisma_migrations holds migration names that are not folders in prisma/schemas/migrations, global-setup aborts before any test with a message naming them and the fix (revert on the shared DB, or merge the branch that owns them); applies in the main checkout and in worktrees
- [ ] #2 Unit test for the decision in test/helpers/db-guard.test.ts
- [ ] #3 apps/api README Tests section: one line on the drift check
<!-- AC:END -->
