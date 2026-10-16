---
id: TASK-17.8
title: Mobile manage screen has no Edit action
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 00:23'
updated_date: '2026-10-16 02:04'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-17
ordinal: 333000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-17 AC#2 (QA TASK-17.4), P7 'Manage page': actions as text rows Edit, Close report, Animal returned. Steps: open zivali://m#<token> or the universal link; look at the action rows. Expected: Edit is offered and works without an account. Actual: only Messages, Close and 'Zival je spet doma' (code reading of apps/mobile/app/m.tsx ManageView; jest manage.test.tsx has no Edit case). Severity: major (AC#2 'can edit' not possible on mobile). Needs a device to confirm visually.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The mobile manage screen (app/m.tsx) offers Edit (P7 action rows: Edit, Close report, Animal returned) and it opens an edit view for the finder's report
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed in TASK-26.5 (fix round): apps/mobile/app/m.tsx has a secondary Uredi for open and matched reports that opens /r/<code>/edit; edit.tsx allows manage-link holders (claimManageLink binds the token, so is_mine).
<!-- SECTION:NOTES:END -->
