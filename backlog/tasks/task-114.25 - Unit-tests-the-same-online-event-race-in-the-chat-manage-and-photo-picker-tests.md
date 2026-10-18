---
id: TASK-114.25
title: >-
  Unit tests: the same 'online' event race in the chat, manage and photo-picker
  tests
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 03:41'
updated_date: '2026-10-18 04:12'
labels:
  - bug
  - fe
  - 'est:XS'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 365200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-114.24 found that found-flow.test.tsx fired window 'online' before useAutoRetry's listener effect had run, so the event was lost and the test timed out under load (1 in ~30 runs); it now uses a reconnect() helper that fires 'online' again until the request goes out, and awaits effects that save state after the done screen. The chat, manage and photo-picker tests dispatch 'online' the same way. components/manage/manage.test.tsx flaked tonight in a post-merge verify ("keeps trying after a lost connection or a failed captcha", "closes the report, and marks the animal home…", 10 s timeouts). Apply the same pattern there (share the helper if it fits), test-only, no timeout increases.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 manage, chat and photo-picker test files each pass 20 runs in a row and 8 in parallel; the full web suite passes
- [ ] #2 No timeouts raised; the fix waits on the real condition (listener attached, request sent)
<!-- AC:END -->
