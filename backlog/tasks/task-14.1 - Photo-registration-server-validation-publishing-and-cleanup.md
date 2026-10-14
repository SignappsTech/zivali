---
id: TASK-14.1
title: 'Photo registration, server validation, publishing and cleanup'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-6.6
  - TASK-6.3
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C5-photos-storage.md
  - docs/tech/contracts/C1-platform-conventions.md
  - docs/tech/adr/014-photo-pipeline-and-storage.md
parent_task_id: TASK-14
priority: high
ordinal: 147000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Photos must be validated and privacy-safe and only become public for visible reports; this is also the hook for AI and embeddings in M3.

## Packet

Unblocks on: Reports, pets and photos schema, deterministic fuzz, public read model, seed merged (TASK-6.6); Job queue: pgmq, enqueue_job, pg_cron trigger, worker with handler registry merged (TASK-6.3)
Contracts: C5, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-14.1-photos-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 register_photo and storage RLS (first path segment = auth.uid()) follow C5; Storage rejects non-JPEG and over-1 MB uploads; a duplicate (owner, sha256) returns the existing photo.
- [ ] #2 The photo_uploaded handler checks JPEG magic bytes, absence of an EXIF/APP1 segment, dimensions and hash, and otherwise rejects with a reason and deletes the objects; tests include a file with EXIF GPS that is rejected.
- [ ] #3 publish_photos copies accepted photos of visible reports to public-photos and sets public URLs; hiding or removing a report unpublishes and deletes the public copies.
- [ ] #4 purge_retention removes unattached uploads after 24 h and objects of deleted pets; a configurable photo hook list (empty in M2) is ready for M3 jobs.
<!-- AC:END -->
