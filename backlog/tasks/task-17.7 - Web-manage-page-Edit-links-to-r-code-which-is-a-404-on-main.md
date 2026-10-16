---
id: TASK-17.7
title: 'Web manage page Edit links to /r/<code>, which is a 404 on main'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 00:23'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-17
ordinal: 332000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-17 AC#2 (QA TASK-17.4). Steps: open /m#<token>, activate 'Uredi prijavo'. The link goes to /r/<short_code> (manage-page.tsx ActionRow href /r/[code]), but no /r/[code] page exists on main (web report detail is TASK-18.2, To Do). Expected: the finder can edit the report from the manage link. Actual: GET /r/Hk3vT9qP -> 404 (Turbopack build, Chromium and WebKit). Severity: major (AC#2 'can edit' not possible on web). Note: needs TASK-18.2 or a manage-scoped edit form; lead decides.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Edit on the web /m manage page opens a working edit view of the report for the anonymous finder (200, editable fields), or the action is hidden until that view exists
<!-- AC:END -->
