---
id: TASK-114.45
title: >-
  API: Idempotency-Key keyed body hash and OpenAPI header parameter (C1; CH-403,
  CH-658)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:34'
labels:
  - be
  - 'est:S'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C1-platform-conventions.md§HTTP
parent_task_id: TASK-114
priority: medium
ordinal: 490200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Planned in C1 §HTTP (Idempotency): the middleware stores an unkeyed SHA-256 of bodies that can hold a point or an email, and the generated client sends no key, so packages/api keeps a hand-written createReport.

## Packet
Unblocks on: -
Branch: agent/task-114.45-idempotency-hash-openapi
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The idempotency middleware stores `hashKey` (HMAC with RATE_SALT, lib/crypto.ts) of the body; during the first 24 h after the deploy a stored unkeyed digest still matches (both compared), then the fallback goes
- [ ] #2 Every route whose description requires or allows Idempotency-Key declares it as an OpenAPI header parameter (required uuid on POST /v1/reports and POST /v1/payments/checkout; optional on POST /v1/pets and message sends)
- [ ] #3 `gen:api` regenerated; packages/api drops the hand-written createReport for the generated one with the key argument; web and mobile callers compile and their tests pass
<!-- AC:END -->
