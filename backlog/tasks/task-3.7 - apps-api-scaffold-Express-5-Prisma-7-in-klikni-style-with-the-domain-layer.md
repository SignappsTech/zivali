---
id: TASK-3.7
title: 'apps/api scaffold: Express 5 + Prisma 7 in klikni style with the domain layer'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 23:35'
updated_date: '2026-10-14 23:38'
labels:
  - tech
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-3.2
  - TASK-3.8
references:
  - docs/tech/backend.md
  - docs/tech/adr/020-api-architecture.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-3
priority: high
ordinal: 277000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
All business logic and permission checks move into one Express + Prisma API that the client can own (brief v1.0, ADR-020). Every backend task builds on this layout, error model and test harness.
## Packet
Unblocks on: Local Supabase stack for Postgres, Auth and Realtime (no Edge Functions) merged (TASK-3.2); Workspace: klikni Prettier and ESLint style, husky, scripts and workspace for apps/api merged (TASK-3.8)
Contracts: C1 (in references); conventions in C1 and ADR-020
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-3.7-api-scaffold
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 apps/api follows ADR-020 (klikni layout, no src/): app.ts with the ADR-020 middleware order, server.ts with graceful shutdown, worker.ts entry, routes/index.routes.ts mounting /v1, thin controllers/, domains/<area>/ with a sample health domain (domain, dao, mapper, index), middleware/ (requestId, validate for body, query and params, error), lib/ (config.ts validated once with zod, logger.ts with pino, errors.ts with AppError).
- [ ] #2 The error middleware maps AppError, ZodError and Prisma P2002/P2025 to `{ error: { code, message, details?, issues? } }` per C1; controllers contain no try/catch; tests prove each mapping.
- [ ] #3 Prisma 7 is set up with prisma.config.ts, a multi-file schema folder (prisma/schemas/base.prisma with schemas = ["app"]), the prisma-client generator with TypedSQL enabled, @prisma/adapter-pg and a client singleton; db:migrate and db:reset work against the local Supabase database.
- [ ] #4 GET /ping and GET /v1/health/ready (database check, APP_VERSION) respond; OpenAPI built from the zod registry is served at /v1/docs outside production.
- [ ] #5 A Vitest + Supertest harness runs against the local database with a locally signed test JWT helper; tsx watch for dev, tsup build, a multi-stage Dockerfile producing one image for api and worker; docker-compose.dev.yml starts MinIO with the three buckets.
- [ ] #6 apps/api/README.md documents the layout, the where-does-logic-go rules from backend.md and the commands.
<!-- AC:END -->
