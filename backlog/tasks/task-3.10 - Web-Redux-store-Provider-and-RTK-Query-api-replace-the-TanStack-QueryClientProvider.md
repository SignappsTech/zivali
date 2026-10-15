---
id: TASK-3.10
title: >-
  Web: Redux store Provider and RTK Query api replace the TanStack
  QueryClientProvider
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-15 01:35'
labels:
  - fe
  - 'est:S'
  - no-design
dependencies:
  - TASK-3.5
references:
  - docs/tech/frontend.md
  - docs/tech/adr/020-api-architecture.md
  - docs/tech/adr/017-dependency-allowlist.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-3
priority: high
ordinal: 296000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-3.3 shipped a TanStack QueryClientProvider; the client chose RTK Query + codegen for the whole repo (ADR-020 §Client), so web switches to the Redux store from @zivali/api.
## Packet

Unblocks on: packages/api foundation with rtk.ts, openapi-config.ts and gen:api merged (TASK-3.5)
Design: none (no UI of its own)
Contracts: C1 (in references); conventions in ADR-020 §Client
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-fe-web-rtk
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 apps/web/providers.tsx wraps the app in react-redux Provider with the store from createApiStore (@zivali/api/rtk), lib/store.ts replaces lib/query.ts, and next.config has transpilePackages: ['@zivali/api'].
- [ ] #2 @tanstack/react-query is removed from apps/web/package.json and the lockfile; react-redux and @reduxjs/toolkit are added as listed in ADR-017; no other new dependency.
- [ ] #3 Existing tests and the e2e smoke pass; a component test renders a generated hook inside the Provider with a mock baseQuery; pnpm verify passes.
<!-- AC:END -->
