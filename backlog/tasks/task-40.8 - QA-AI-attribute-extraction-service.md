---
id: TASK-40.8
title: 'QA: AI attribute extraction service'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-18 21:25'
labels:
  - qa
  - 'est:XS'
milestone: m-2
dependencies:
  - TASK-40.1
  - TASK-40.2
  - TASK-40.3
  - TASK-40.4
  - TASK-40.5
  - TASK-40.6
  - TASK-40.7
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C19-ai-extraction.md
parent_task_id: TASK-40
priority: high
ordinal: 389200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify TASK-40 on main against its acceptance criteria once all its tasks are merged.

## Packet

Unblocks on: TASK-40.1 merged; TASK-40.2 merged; TASK-40.3 merged; TASK-40.4 merged; TASK-40.5 merged; TASK-40.6 merged; TASK-40.7 merged
Review: QA report in the task notes; bugs as tasks.
Branch: agent/task-40.8-qa
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a newly uploaded photo, when extraction is requested, then a vision model returns structured JSON (species, breed candidates with confidence, coat colours and pattern, size band, collar, distinguishing marks) validated against the contract schema, p95 under 6 s.
- [ ] #2 Given the same image hash, when requested again, then the cached result is used and no second model call is made.
- [ ] #3 Given cost controls (default 1 call per photo, 10 photos per anonymous device per day, monthly budget cap), when a limit is reached, then extraction returns not available and forms continue manually (fail open).
- [ ] #4 Given the model output, when returned, then it also carries a moderation signal (prominent human face, nudity, gore, no animal) stored for image screening without blocking the upload.
- [ ] #5 Given local development and tests, when no API key exists, then a deterministic mock returns fixture attributes.
- [ ] #6 Given privacy, when an image is sent to the provider, then EXIF is stripped, no user identifiers are included and the provider is listed in the privacy policy.
<!-- AC:END -->
