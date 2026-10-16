---
id: TASK-26.8
title: 'Mobile /m: marking the pet returned fires no reunited analytics event'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 07:50'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-26
ordinal: 353000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AC: TASK-26.5#3 / TASK-26.6#1. Steps: read apps/mobile/app/m.tsx markReturned: it calls act('mark_reunited') then setThanked, with no track(). trackReunited exists only unexported in components/report/lifecycle.tsx. Web manage-view.tsx calls trackReunited(data). Expected: reunited fired (consent only) on mobile /m too; extract trackReunited to a shared export and add a test in __tests__/manage.test.tsx. Actual: no event. Severity: medium (KPI undercount of finder reunites on mobile).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given consent, when the finder marks returned on /m (apps/mobile/app/m.tsx act('mark_reunited')), then reunited fires with species, region and municipality only, as on web /m and the mobile owner flow
<!-- AC:END -->
