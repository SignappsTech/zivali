---
id: TASK-4.7
title: >-
  Deploy: Dockerfiles install dependencies before copying the source (layer
  cache)
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-19 14:11'
updated_date: '2026-10-19 18:16'
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
