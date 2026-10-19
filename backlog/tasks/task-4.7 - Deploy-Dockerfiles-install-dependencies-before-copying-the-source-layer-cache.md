---
id: TASK-4.7
title: >-
  Deploy: Dockerfiles install dependencies before copying the source (layer
  cache)
status: In Progress
assignee:
  - '@tech-lead'
created_date: '2026-10-19 14:11'
updated_date: '2026-10-19 19:02'
labels:
  - tech
  - 'est:S'
dependencies:
  - TASK-4.6
references:
  - scripts/deploy.mjs
  - docs/04-technical-design.md
parent_task_id: TASK-4
priority: medium
ordinal: 419200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-4.6 added a BuildKit gha cache to the deploy image builds, but both Dockerfiles run COPY . . before pnpm install, so the dependency layer changes on every commit and the cache barely helps (deploy about 6 min). Restructure: copy the lockfile, pnpm-workspace.yaml and the package.json files first, pnpm fetch / install --frozen-lockfile in that layer, then copy the source and build. Then switch the cache to mode=max.

## Packet

Unblocks on: TASK-4.6 merged
Review: tech-lead review (Docker, deploy path)
Branch: agent/task-4.7-docker-layers
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A source-only change rebuilds without reinstalling dependencies (cache hit on the install layer in the deploy log)
- [ ] #2 Images are identical in behaviour (deploy smoke passes); workstation deploy still works
- [ ] #3 CI gets a cheap clean-DB step again: a postgres service and prisma migrate deploy from zero (TASK-4.6 took the full run out; QA TASK-5.3 follow-up)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented: apps/api + apps/web Dockerfiles get a manifests stage (RUN --mount=type=bind copies pnpm-lock.yaml, pnpm-workspace.yaml, .npmrc, root/apps/*/packages/* package.json); the build stage installs from those, then COPY . . (api restores the target-arch pnpm-workspace.yaml for pnpm deploy). deploy.mjs cacheArgs mode=max. New .github/workflows/db.yml: supabase/postgres 17.11.0.004 service + prisma migrate deploy from zero, only on apps/api/prisma/**, prisma.config.ts or the workflow. Checked locally: docker build --check clean for both Dockerfiles; the manifests copy logic dry-run in Git Bash. Still to verify after the push: AC1 (CACHED install layer in the next staging deploy log), AC2 (deploy smoke green), AC3 (first db.yml run green).
<!-- SECTION:NOTES:END -->
