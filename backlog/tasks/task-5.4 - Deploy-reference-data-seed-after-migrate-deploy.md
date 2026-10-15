---
id: TASK-5.4
title: 'Deploy: reference-data seed after migrate deploy'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-15 20:50'
labels:
  - be
  - 'est:S'
dependencies:
  - TASK-5.1
references:
  - deploy/remote.sh
  - apps/api/Dockerfile
  - apps/api/prisma/seed.ts
  - apps/api/prisma/seeders/README.md
  - scripts/deploy.mjs
priority: high
ordinal: 329000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The first staging deploy (07b527f) came up with an empty shelter directory and no municipalities, because deploy/remote.sh only runs `prisma migrate deploy`. The all-environment seeders (01-geo regions and municipalities, 05-directory responsible shelters, 30-commerce house ads, plus any other seeder that runs outside APP_ENV=local) are idempotent and must run on every staging and production release, so reference data never needs a manual write to the hosted database. The local-only fixture seeders already skip themselves by APP_ENV.

## Packet

Branch: agent/task-5.4-deploy-seed
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The api image can run the seed in production mode: the seeders and their data (CSV, generated geo SQL) are in the image, without the fixture photos or dev-only tooling the runtime does not need; the PR summary states the image size change.
- [ ] #2 deploy/remote.sh runs the seed as a one-off api container right after `migrate deploy` and before api and worker come up. A seed failure fails the release the same way a failed migration does (no promote; rollback behaviour unchanged).
- [ ] #3 With APP_ENV=staging or production only the all-environment seeders do anything (no fixture users, reports, collab rows or sponsor ads); a test covers this.
- [ ] #4 A rerun against a database that already has the data changes nothing and keeps admin edits (directory versions, house-ad edits), covered by tests on a scratch DB.
- [ ] #5 scripts/deploy.mjs checks and tests and the deployment docs mention the seed step.
<!-- AC:END -->
