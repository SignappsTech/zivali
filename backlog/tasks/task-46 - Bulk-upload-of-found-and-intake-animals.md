---
id: TASK-46
title: Bulk upload of found and intake animals
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:04'
updated_date: '2026-10-14 23:08'
labels:
  - story
  - 'req:FR-015'
milestone: m-2
dependencies:
  - TASK-45
  - TASK-14
  - TASK-15
  - TASK-6
priority: high
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shelters will not adopt a tool slower than their own paperwork; uploading ten animals with photos and chips in a few minutes is the adoption lever for goal G-4.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given rows, when the user submits, then valid rows are published as FOUND reports owned by the organisation and invalid rows stay with inline errors.
- [ ] #2 Given AI is available, when photos upload, then attributes pre-fill per row.
- [ ] #3 Given the same photo uploaded twice, when detected, then the user is warned about duplicates.
- [ ] #4 Given a running batch, when a row fails, then per-row status is shown and that row can be retried without re-uploading the others, and 10 animals can be published in under 5 minutes of user time.
- [ ] #5 Given a portal user, when they drop up to 30 photos, then one draft row per photo appears with a thumbnail and fields for chip, species, intake date and required found location and found date and time (shelters do not publish these today), saved as drafts.
<!-- AC:END -->

## Packet

Unblocks on: portal layout (TASK-45); uploadPhoto and LocationPicker APIs (TASK-14, TASK-15); intake batch contract (TASK-6)
