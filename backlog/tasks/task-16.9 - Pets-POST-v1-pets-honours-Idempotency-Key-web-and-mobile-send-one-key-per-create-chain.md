---
id: TASK-16.9
title: >-
  Pets: POST /v1/pets honours Idempotency-Key; web and mobile send one key per
  create chain
status: Done
assignee:
  - '@tech-lead'
created_date: '2026-10-16 01:40'
updated_date: '2026-10-19 12:53'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-16.6
  - TASK-16.7
parent_task_id: TASK-16
priority: medium
ordinal: 337000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-16.6 and TASK-16.7 reviews. If the server creates a pet but the response is lost, a retry POSTs again and a second pet appears; with the free limit of 2 the user can be blocked by a pet they never saw. Payments already use Idempotency-Key (C13/C1); pets didn't.

## Packet

Contracts: C4 (pets), C1 (Idempotency-Key)
Review: tech-lead code review (full mode)
Branch: agent/task-16.9-pets-idempotency
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 POST /v1/pets accepts an optional Idempotency-Key (the C1 idempotency middleware): a replay with the same key and body returns the first response; the same key with another body gives 409.
- [x] #2 apps/web pet-form and apps/mobile pet-flow send one key per create chain with a pinned body; an edit makes a new key; after PET_LIMIT the key is dropped.
- [x] #3 Tests cover replay, conflict, invalid key, retry after a lost response, edit, and PET_LIMIT; C4/C1 updated via CHANGE to tech-lead.
<!-- AC:END -->
