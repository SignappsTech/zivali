---
id: TASK-104
title: 'Bug: match_* notification sources missing; admin FailedJob.id rejects pg-boss job ids'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-15 20:00'
labels:
  - bug
  - be
  - 'est:XS'
dependencies: []
references:
  - docs/tech/contracts/C10-notifications-alerts.md
  - docs/tech/contracts/C8-matching.md
priority: high
ordinal: 326000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by TASK-29.2. (1) Matching (TASK-19.1) queues notify.send jobs {template: match_suggested | match_chip, match_id, report_id}, but notification delivery (TASK-22.3) has no variables source for match_* in domains/notifications/sources.ts, so every such job fails ("no variables source for match_suggested") and retries. (2) packages/validation admin.schema.ts FailedJob.id uses z.uuid(), which rejects pg-boss's deterministic notify.send job ids (uuid version nibble not 1-8), so GET /v1/admin/queues returns 500 once such a job fails.

## Packet

Branch: agent/task-104-match-sources
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 sources.ts registers match_suggested and match_chip: from {match_id, report_id} derive the C10 fields for the lost report's managers only (report code, species, the match's reason bands, the other report's public area; never exact points, never the chip number); null when the match is rejected/closed or the report is gone → the job is dropped with a log line, not retried. Every returned key is in the type's `fields` allowlist
- [ ] #2 FailedJob.id accepts any 8-4-4-4-12 hex id (z.guid() or equivalent); test with a deterministic notify.send id
- [ ] #3 Tests: match.report → notify.send end to end delivers one inbox row and one push per lost-report manager in their locale; nothing goes to the found/sighted side
<!-- AC:END -->
