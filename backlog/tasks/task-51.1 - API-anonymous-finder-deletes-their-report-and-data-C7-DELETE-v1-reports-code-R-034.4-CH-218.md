---
id: TASK-51.1
title: >-
  API: anonymous finder deletes their report and data (C7 DELETE
  /v1/reports/:code; R-034.4, CH-218)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:30'
labels:
  - be
  - 'est:S'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C7-anonymous-manage-link.md§REST
parent_task_id: TASK-51
priority: medium
ordinal: 480200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision CH-218: the manage link's 'Delete my data' (R-034.4) gets an endpoint. Signed-in users close their reports or delete the account instead.

## Packet
Unblocks on: -
Branch: agent/task-51.1-finder-delete-report
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `DELETE /v1/reports/:code` by a manager of a report with `source = 'anonymous'`: one transaction sets moderation `removed`, status closed (`close_reason` removed), cancels alerts and open match suggestions, makes conversations read-only (ChatDomain.closeForReport), deletes the `report_contacts` row and the report_managers rows, clears `manage_token_hash`, `device_hash` and `ip_hash`, replaces `exact_point` by the public point, and queues the photos for deletion (C5); 204
- [ ] #2 Errors: FORBIDDEN (not a manager, or not an anonymous report), GONE (already removed), NOT_FOUND; afterwards GET /v1/reports/:code answers GONE reason removed; route tests
- [ ] #3 The row itself goes with the existing retention.purge rule once no conversation refers to it; openapi.json regenerated
<!-- AC:END -->
