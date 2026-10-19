---
id: TASK-51.3
title: >-
  Mobile manage screen: Delete my data (C7 DELETE /v1/reports/:code; R-034.4,
  CH-218)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:41'
labels:
  - fe
  - 'est:XS'
  - mobile
dependencies:
  - TASK-51.1
  - TASK-30.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C7-anonymous-manage-link.md§REST
  - docs/design/pages/P7-report-found.md
parent_task_id: TASK-51
priority: low
ordinal: 510200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mobile side of the anonymous finder's delete (app/m.tsx left it out).

## Packet
Unblocks on: TASK-51.1 merged; design TASK-30.1 done
Branch: agent/task-51.3-mobile-manage-delete
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 app/m.tsx offers 'Delete my data' with the confirm dialog; confirming calls DELETE /v1/reports/:code and removes the secure-store `manage_token.<id>`; jest-expo tests
<!-- AC:END -->
