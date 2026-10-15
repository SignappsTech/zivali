---
id: TASK-3.12
title: Swagger UI at /docs from apps/api/openapi.json
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-15 01:35'
updated_date: '2026-10-15 11:22'
labels:
  - be
  - 'est:S'
dependencies:
  - TASK-3.7
references:
  - docs/tech/backend.md
  - docs/tech/adr/020-api-architecture.md
  - docs/tech/adr/017-dependency-allowlist.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-3
priority: low
ordinal: 298000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Client deferred the interactive docs; the spec and annotations already ship for the RTK codegen. Serve it for humans later.
## Packet

Unblocks on: apps/api scaffold with the OpenAPI spec written to apps/api/openapi.json merged (TASK-3.7)
Design: none (no UI of its own)
Contracts: C1 (in references); conventions in ADR-020 §Client
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-be-swagger-ui
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Swagger UI (swagger-ui-express or equivalent) is served at /docs from apps/api/openapi.json when APP_ENV is local or staging; in production it is admin-only (aal2) or off, covered by a Supertest test.
- [ ] #2 ADR-017 gets a row for the swagger package in the same commit; no other new dependency.
<!-- AC:END -->
