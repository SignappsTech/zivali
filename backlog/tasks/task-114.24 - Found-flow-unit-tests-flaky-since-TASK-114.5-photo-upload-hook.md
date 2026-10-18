---
id: TASK-114.24
title: Found-flow unit tests flaky since TASK-114.5 (photo upload hook)
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 03:18'
updated_date: '2026-10-18 03:41'
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
- [x] #1 found-flow.test.tsx passes 20 runs in a row locally (vitest run, the file alone) and the full web suite passes
- [x] #2 The cause is named in the task notes; the fix is in the hook if users could hit it, else in the test
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Cause (TASK-114.24).** Not the upload hook: found-flow.test.tsx mocks use-photo-uploads and PhotoPicker, so the TASK-114.5 change never runs there (8 of 8 at 241064c1 was luck: at 1 in 5, eight passes in a row come 17 % of the time). The race is in the test. A server answer (the POST result, the photo stub's onChange) is set from a promise, outside act(), so React commits it in a scheduler task and runs its effects in a later one. findBy* resolves as soon as the DOM shows the answer (plus one setTimeout 0), which under load is before those effects ran, and the tests then acted on them:
1. `online` was dispatched before useAutoRetry's listener was added, so the retry never came and the done heading timed out (probe: listener missing when the NETWORK note showed in 1 of 32 runs at 8 in parallel).
2. The manage token was read from localStorage before the result effect saved it (reproduced 2 of 39 runs under load, line 177).
3. Publish was tapped after waiting on a call count, or on a no-op (Publish is already on), instead of the previous answer, so the tap could land on the old render: a loading button, or no photo yet, which sends the finder back to the photo step.

Users cannot hit it: the gap is the milliseconds between a render and its effects, and the 60 s interval retries anyway. So the fix is in the test only: `reconnect()` repeats the online event until the POST goes out (one attempt runs at a time, so no extra POST); the token is awaited; each Publish waits for the previous answer's note; the restored-draft test waits for the photo in the summary. No timeout changed.

Verified: the file alone 20 of 20 in a row, and 24 of 24 at 8 in parallel (the old file failed 2 of 39 there); full web suite 105 files, 1000 tests; tsc, eslint, prettier clean.
<!-- SECTION:NOTES:END -->

## Packet

Branch: agent/TASK-114.24-found-flow-flaky
