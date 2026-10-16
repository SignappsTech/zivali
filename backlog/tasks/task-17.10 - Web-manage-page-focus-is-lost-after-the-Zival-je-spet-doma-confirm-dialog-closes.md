---
id: TASK-17.10
title: >-
  Web manage page: focus is lost after the 'Zival je spet doma' confirm dialog
  closes
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 00:24'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-17
ordinal: 335000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-17 AC#2, keyboard check (QA TASK-17.4). Steps: /m#<token>, Tab to 'Zival je spet doma', Enter, then Escape. Expected: focus back on the trigger row. Actual: document.activeElement is BODY (Chromium and WebKit); the AlertDialog is opened from state without an AlertDialogTrigger, so Radix has no element to return focus to (manage-page.tsx confirmHome). Severity: minor (WCAG 2.4.3 focus order).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Closing the mark-returned confirm dialog with Escape or 'Ne' returns focus to the 'Zival je spet doma' row (keyboard and screen-reader users keep their place)
<!-- AC:END -->
