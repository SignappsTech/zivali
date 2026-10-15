---
id: TASK-3.9
title: >-
  API adapters ported from the TASK-3.2 branch, plus a storage adapter (R2,
  MinIO, memory)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 23:35'
updated_date: '2026-10-15 00:13'
labels:
  - tech
  - 'est:S'
  - trivial
milestone: m-0
dependencies:
  - TASK-3.7
references:
  - docs/tech/backend.md
  - docs/tech/adr/014-photo-pipeline-and-storage.md
  - docs/tech/contracts/C5-photos-storage.md
parent_task_id: TASK-3
priority: high
ordinal: 279000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The adapter interfaces and mocks written for the Edge Functions (branch agent/task-3.2-sb, supabase/functions/_shared/adapters) move to the Node API unchanged in spirit, so every integration stays mockable offline (P-6).
## Packet
Unblocks on: apps/api scaffold: Express 5 + Prisma 7 in klikni style with the domain layer merged (TASK-3.7)
Contracts: C5 (in references); conventions in C1 and ADR-020
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-3.9-adapters
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 apps/api/adapters/{ai,embedder,payments,email,push,captcha} are ported from the branch to Node ESM with the same interfaces, mock implementations and provider selection (mock when credentials are missing outside production).
- [ ] #2 A storage adapter (minio, r2, memory) offers presigned PUT and GET, copy, delete and head for the private, media and backups buckets.
- [ ] #3 Unit tests cover provider selection and the storage adapter against MinIO and the memory implementation; adapters are reachable as ctx.adapters in domains and jobs.
- [ ] #4 The r2 provider uses the EU jurisdiction endpoint https://<R2_ACCOUNT_ID>.eu.r2.cloudflarestorage.com for every call and presigned URL (ADR-014); a unit test asserts it.
<!-- AC:END -->
