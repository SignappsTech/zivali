---
id: TASK-3.5
title: >-
  packages/api foundation: client conventions, ApiError, query defaults,
  fixtures
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
labels:
  - fe
  - 'est:S'
  - no-design
milestone: m-0
dependencies:
  - TASK-3.1
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

Unblocks on: Workspace root: pnpm + Turborepo, TypeScript, lint, scripts, README merged (TASK-3.1)
Design: none (no UI of its own)
Contracts: C1, C7 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-3.5-api
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 @zivali/api exports by subpath (`./*` → src/*.ts); domain functions take a typed SupabaseClient as their first argument (apps create the clients).
- [ ] #2 ApiError parses RPC P0001 JSON messages and Edge Function error bodies into { code, message, details } with the C1 code list as a typed union; unit tests cover both shapes and unknown errors.
- [ ] #3 TanStack Query defaults (retry twice except 4xx, sensible staleTime), a queryKeys helper and deviceIdHeaders(id) for the x-device-id header (C7) are exported.
- [ ] #4 A fixtures convention (src/__fixtures__/<domain>.ts) and a createMockClient() test helper exist so UI tasks can work before a backend RPC is merged.
<!-- AC:END -->
