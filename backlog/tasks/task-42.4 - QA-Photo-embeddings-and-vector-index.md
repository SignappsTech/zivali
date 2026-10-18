---
id: TASK-42.4
title: 'QA: Photo embeddings and vector index'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-18 21:26'
labels:
  - qa
  - 'est:XS'
milestone: m-2
dependencies:
  - TASK-42.1
  - TASK-42.2
  - TASK-42.3
  - TASK-40.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C20-image-embeddings.md
parent_task_id: TASK-42
priority: high
ordinal: 391200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify TASK-42 on main against its acceptance criteria once all its tasks are merged.

## Packet

Unblocks on: TASK-42.1 merged; TASK-42.2 merged; TASK-42.3 merged; TASK-40.3 merged
Review: QA report in the task notes; bugs as tasks.
Branch: agent/task-42.4-qa
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a new photo, when stored, then an embedding is generated asynchronously (p95 within 60 s), saved in pgvector with an ANN index and retried on failure with a dead-letter log.
- [ ] #2 Given existing photos, when the backfill runs, then all eligible photos are embedded without duplicate model calls (image hash cache).
- [ ] #3 Given a query photo, when searching, then nearest neighbours restricted by species and radius return in under 300 ms for 50k photos locally.
- [ ] #4 Given a model change, when the embedding model is replaced, then a versioned column and re-embed job support it without downtime.
- [ ] #5 Given local development and tests, when no model credentials exist, then a deterministic mock or small local model is used.
<!-- AC:END -->
