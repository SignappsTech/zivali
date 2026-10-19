---
id: TASK-40.4
title: 'GET /v1/photos/:id/attributes: pending, unavailable or ready suggestions'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:22'
updated_date: '2026-10-19 00:30'
labels:
  - be
  - 'est:S'
milestone: m-2
dependencies:
  - TASK-40.1
  - TASK-40.2
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C19-ai-extraction.md§REST (TASK-40.4)
  - docs/tech/contracts/C1-platform-conventions.md§HTTP
parent_task_id: TASK-40
priority: high
ordinal: 374200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The read side the forms poll: the owner of a photo sees whether suggestions are coming, ready or not available, filtered by confidence, and nothing else.

## Packet

Unblocks on: AI foundation merged (TASK-40.1); AI wire types and schemas merged (TASK-40.2)
Contracts: C19 §REST (in references); conventions in C1. Tests insert ai_calls and ai_results rows directly, so this does not wait for the job.
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-40.4-photo-attributes-api
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The owner (user or anonymous) gets pending, unavailable or ready per C19 from the photo status, its ai_calls outcome and the ai_results row; fields below ai.min_confidence come back with value null; moderation, marks and the model id are never returned
- [x] #2 Unknown, rejected or another user's photo returns NOT_FOUND; rate limit photos.attributes 600/h per user; permission-matrix rows for anonymous visitor, anonymous user, owner, other user and staff
- [x] #3 routes/photo-attributes.routes.ts is mounted at /photos (one line in routes/index.ts); ai.enabled and ai.min_confidence appear in GET /v1/config/public; apps/api/openapi.json and the generated @zivali/api endpoints are updated
- [ ] #4 Endpoint and domain tests; pnpm verify green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verify in worktree (rule 4: no next build / expo export): verify:static, api tsc+eslint+openapi --check, @zivali/api tsc+eslint+tests, web and mobile typecheck all green; API suite on scratch DB task_40_4: 1109 passed, 5 env-only failures (3 seeders need Auth bound to the postgres DB; geo timing and reports.write ran before the geo seed, both pass on rerun). Full pnpm verify (web build, expo export) left to the merge verify. @zivali/api: no src/generated/endpoints.ts has ever been committed (every area uses injectEndpoints stubs), so getPhotoAttributes is a stub in src/photos.ts per that convention.
<!-- SECTION:NOTES:END -->
