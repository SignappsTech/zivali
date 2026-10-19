---
id: TASK-40.11
title: 'API: never send photos uploaded before AI was switched on'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-19 10:12'
updated_date: '2026-10-19 14:26'
labels:
  - be
  - 'est:S'
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C19-ai-extraction.md
parent_task_id: TASK-40
priority: high
ordinal: 411200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On 2026-10-19 the owner decided that only photos uploaded after AI is switched on for najdimo.si go to Anthropic or Voyage (TASK-40.7 notes). Older photos were uploaded under the privacy policy without AI. Guarantee that no older photo is ever sent, by any path: upload, photo.publish, report edits that queue photo or match jobs again (TASK-114.32), the embedding backfill and seeder 41, job retries, admin actions.

## Packet

Unblocks on: - (TASK-40.3, 42.1 and 42.3 are merged)
Contracts: C19 and C20 (privacy and backfill sections); conventions in C1
Review: tech-lead code review on the default model (privacy path); run the API tests on a scratch DB before reporting done.
Branch: agent/task-40.11-ai-cutoff
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A cutoff setting (app_config, set by TASK-40.7 at switch-on) stops ai.extract and photo.embed from ever running for a photo created before it, on every path; a missing or invalid cutoff fails closed (nothing is sent)
- [ ] #2 Tests per path with the mock adapters on a scratch DB: new upload, publish again after an edit, backfill, retry of an older job
- [ ] #3 deploy/README.md and docs/tech/pilot-runbook.md name the setting and how TASK-40.7 sets it; CHANGE rows for C19/C20
<!-- AC:END -->
