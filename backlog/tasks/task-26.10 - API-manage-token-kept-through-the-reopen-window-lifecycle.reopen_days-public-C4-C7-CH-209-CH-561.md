---
id: TASK-26.10
title: >-
  API: manage token kept through the reopen window; lifecycle.reopen_days public
  (C4, C7; CH-209, CH-561)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:28'
labels:
  - be
  - 'est:S'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C4-reports-and-pets.md§Status machine
  - docs/tech/contracts/C7-anonymous-manage-link.md§REST
parent_task_id: TASK-26
priority: medium
ordinal: 476200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision CH-209: close, reunite and expiry keep the manage token until the reopen window ends, so a finder on a new device can claim and reopen; claim then answers GONE after the window as C7 says. Decision CH-561: clients read the window length from public config instead of a hard-coded 7.

## Packet
Unblocks on: -
Branch: agent/task-26.10-manage-token-reopen-window
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `mark_reunited`, `close` and `expire` (lifecycle.domain.ts, reports.dao.ts expireIdle) no longer clear `manage_token_hash`; `lifecycle_tick` clears it once `coalesce(reunited_at, closed_at) + lifecycle.reopen_days` has passed, and a reopened report keeps it; tests at the boundary
- [ ] #2 POST /v1/manage/claim within the window makes the caller a finder manager who can reopen; after the window it answers GONE; route tests
- [ ] #3 A migration sets `is_public = true` on `app_config` `lifecycle.reopen_days`; GET /v1/config/public returns it; test
- [ ] #4 Data inventory: the `manage_token_hash` retention note says it is cleared when the reopen window ends; `report_contacts` purge unchanged
<!-- AC:END -->
