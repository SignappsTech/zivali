---
id: TASK-9.6
title: >-
  API: rename SUPABASE_SERVICE_ROLE_KEY to SUPABASE_SECRET_KEY; raise api vitest
  default timeout
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-15 09:39'
updated_date: '2026-10-15 12:36'
labels:
  - be
  - 'est:XS'
  - trivial
dependencies:
  - TASK-9.2
references:
  - docs/tech/backend.md
parent_task_id: TASK-9
ordinal: 316000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CH-130. (1) Rename SUPABASE_SERVICE_ROLE_KEY to SUPABASE_SECRET_KEY (project uses sb_secret_ keys; Admin API takes it as apikey + Bearer); keep a fallback read of the old name for one release. (2) vi.waitFor/findBy default 1 s timeout flakes under load (idempotency.middleware.test 'passes through without a key'): set a 10 s default in the api vitest setup like TASK-100 did for web.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Config reads SUPABASE_SECRET_KEY, falling back to SUPABASE_SERVICE_ROLE_KEY; env examples and docs updated
- [ ] #2 api vitest setup sets 10 s default for waitFor/findBy; idempotency.middleware.test stable under load
<!-- AC:END -->
