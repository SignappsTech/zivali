---
id: TASK-40.12
title: 'API: re-upload of a photo whose AI check failed never retries it'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 15:52'
labels:
  - be
  - bug
  - 'est:S'
dependencies: []
references:
  - docs/tech/contracts/C19-ai-extraction.md
  - docs/tech/backend.md
parent_task_id: TASK-40
priority: high
ordinal: 431200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found 2026-10-19 on najdimo.si: the first uploads after the AI switch-on failed at Anthropic (API key not scoped to a workspace; fixed). Uploading the same image again returns the existing photo row (POST /v1/photos 200, upsertByHash) and no new ai.extract job is queued, so the attributes stay failed/unavailable and the person never gets suggestions for that image.

## Packet

Unblocks on: -
Contracts: C19 §Pipeline and §REST (attributes), C5 (upsertByHash), TASK-40.11 cutoff
Review: tech-lead code review (AI path)
Branch: agent/task-40.12-retry-failed-extract
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When an upload resolves to an existing photo whose extraction failed for a transient reason (provider error, timeout, unavailable) and that has no clean ai_results, ai.extract is queued again (and photo.embed after it); refused/invalid/moderation outcomes are not retried
- [ ] #2 The retry respects the cutoff (TASK-40.11), the daily caps and the monthly budget; at most one retry per photo per hour
- [ ] #3 Tests on a scratch DB: transient failure then re-upload retries; refused does not; cap reached does not
<!-- AC:END -->
