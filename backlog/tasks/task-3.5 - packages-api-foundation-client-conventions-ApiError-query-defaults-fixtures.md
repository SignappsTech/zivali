---
id: TASK-3.5
title: >-
  packages/api foundation: REST client, ApiError, idempotency and query helpers,
  fixtures
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-14 23:39'
labels:
  - fe
  - 'est:S'
  - no-design
milestone: m-0
dependencies:
  - TASK-3.1
  - TASK-3.8
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C1-platform-conventions.md
  - docs/tech/contracts/C7-anonymous-manage-link.md
parent_task_id: TASK-3
priority: high
ordinal: 116000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Both apps call Supabase through one typed client library; error mapping, the device id header and query defaults must be shared so features behave the same on web and mobile.

## Packet

Unblocks on: Workspace root: pnpm + Turborepo, TypeScript, lint, scripts, README merged (TASK-3.1); Workspace: klikni Prettier and ESLint style, husky, scripts and workspace for apps/api merged (TASK-3.8)
Design: none (no UI of its own)
Contracts: C1, C7 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-3.5-api
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 @zivali/api exports createApiClient({ baseUrl, getAccessToken, deviceId, locale }) that sends Authorization, x-device-id and Accept-Language, and an Idempotency-Key for calls marked idempotent; domain files are exported by subpath (`./*` → src/*.ts).
- [ ] #2 ApiError parses `{ error: { code, message, details, issues } }` bodies (C1) with the code list as a typed union; network failures become a NETWORK client error; unit tests cover both.
- [ ] #3 TanStack Query defaults (retry twice except 4xx, staleTime), a queryKeys helper and keyset pagination helpers are exported.
- [ ] #4 A fixtures convention (src/__fixtures__/<domain>.ts) and createMockApi() let UI tasks work before an endpoint is merged.
<!-- AC:END -->
