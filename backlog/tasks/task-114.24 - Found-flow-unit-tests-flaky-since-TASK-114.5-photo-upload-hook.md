---
id: TASK-114.24
title: Found-flow unit tests flaky since TASK-114.5 (photo upload hook)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 03:18'
labels:
  - bug
  - fe
  - 'est:XS'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: high
ordinal: 364200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CI on main (f3d62cfb, 2026-10-18) failed web#test in components/report-found/found-flow.test.tsx, which blocked the deploy. Locally on main the file fails about 1 run in 5, each time in a different test ("repeats the same key after no answer, retrying by itself on reconnect", "runs photo, animal, prefilled place, situation and publish…"; the error is the confirmation heading "Hvala, prijava je objavljena" or the NETWORK message not found in time). At 241064c1, the commit before the TASK-114.5 merge, it passed 8 of 8 runs. TASK-114.5 changed apps/web/components/photos/use-photo-uploads.ts (~159: the saved-photo id dedupe; ~259: restored draft items whose photoId is a saved photo are skipped), which the found flow also uses. Find the race (likely a changed effect or state order in the upload hook, or a test now waiting on an upload that settles later) and fix the cause, in the hook if it is a real bug, else in the test. Do not just raise timeouts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 found-flow.test.tsx passes 20 runs in a row locally (vitest run, the file alone) and the full web suite passes
- [ ] #2 The cause is named in the task notes; the fix is in the hook if users could hit it, else in the test
<!-- AC:END -->
