---
id: TASK-42
title: Photo embeddings and vector index
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:04'
labels:
  - story
  - 'req:FR-014'
  - 'req:NFR-AI'
milestone: m-2
dependencies:
  - TASK-6
  - TASK-14
priority: high
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Visual similarity finds pets whose owners and finders describe them differently; this pipeline gives every photo a comparable vector and a fast index.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a new photo, when stored, then an embedding is generated asynchronously (p95 within 60 s), saved in pgvector with an ANN index and retried on failure with a dead-letter log.
- [ ] #2 Given existing photos, when the backfill runs, then all eligible photos are embedded without duplicate model calls (image hash cache).
- [ ] #3 Given a query photo, when searching, then nearest neighbours restricted by species and radius return in under 300 ms for 50k photos locally.
- [ ] #4 Given a model change, when the embedding model is replaced, then a versioned column and re-embed job support it without downtime.
- [ ] #5 Given local development and tests, when no model credentials exist, then a deterministic mock or small local model is used.
<!-- AC:END -->

## Packet

Unblocks on: embedding column and vector index contract (TASK-6); photo-uploaded hook (TASK-14)
