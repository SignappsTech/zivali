---
id: TASK-51.2
title: 'Web /m: Delete my data (C7 DELETE /v1/reports/:code; R-034.4, CH-218)'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:36'
labels:
  - fe
  - 'est:S'
  - web
dependencies:
  - TASK-51.1
  - TASK-30.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C7-anonymous-manage-link.md§REST
  - docs/design/pages/P7-report-found.md
  - docs/content/pages/P7-report-found.md
parent_task_id: TASK-51
priority: medium
ordinal: 497200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The P7 manage page action 'Delete my data' with its confirm dialog, for anonymous finders.

## Packet
Unblocks on: TASK-51.1 (DELETE /v1/reports/:code) merged; design TASK-30.1 done
Branch: agent/task-51.2-web-m-delete-my-data
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The /m action row 'Delete my data' opens the destructive confirm dialog (P7); confirming calls DELETE /v1/reports/:code, then removes `manage:<report_id>` and the sessionStorage `manage_token` and shows the done state
- [ ] #2 FORBIDDEN, GONE and network errors map to the error copy; component tests and an e2e on a seeded anonymous report
<!-- AC:END -->
