---
id: TASK-14.1
title: 'Photos: R2 presigned uploads, sharp processing, publishing and cleanup'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 18:15'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-6.6
  - TASK-6.3
  - TASK-3.9
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C5-photos-storage.md
  - docs/tech/adr/014-photo-pipeline-and-storage.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-14
priority: high
ordinal: 147000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Photos must be validated and privacy-safe and only become public for visible reports; this is also the hook for AI and embeddings in M3.

## Packet

Unblocks on: Reports, pets and photos models, deterministic fuzz, public report endpoint, seed merged (TASK-6.6); Worker and jobs: pg-boss, queue registry with stubs, schedules, keep-alive, drain merged (TASK-6.3); API adapters ported from the TASK-3.2 branch, plus a storage adapter (R2, MinIO, memory) merged (TASK-3.9)
Contracts: C5, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-14.1-photos-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST /v1/photos validates the metadata, deduplicates by (owner, sha256) and returns a 5-minute presigned PUT to the private bucket; POST /v1/photos/:id/complete queues photo.process; GET and DELETE behave per C5 with permission tests.
- [ ] #2 photo.process checks magic bytes, size and SHA-256, re-encodes with sharp into display (WebP and JPEG) and thumb variants without metadata, and otherwise rejects with a reason; a test with an EXIF-GPS fixture proves no metadata survives.
- [ ] #3 photo.publish copies accepted variants of visible reports to the media bucket and sets public URLs; hiding or removing a report deletes the public copies.
- [ ] #4 retention.purge removes unattached uploads after 24 h and objects of deleted pets; PHOTO_HOOKS (empty in M2) is ready for M3 jobs; everything runs against MinIO locally.
<!-- AC:END -->
