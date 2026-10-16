---
id: TASK-30.5
title: >-
  Mobile found flow: sightings link only to lost listings, keep startedAt on
  draft restore, held linked sighting copy
status: Done
assignee: []
created_date: '2026-10-16 05:45'
updated_date: '2026-10-16 07:08'
labels:
  - bug
  - mobile
dependencies: []
parent_task_id: TASK-30
priority: medium
ordinal: 347000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-30.2 web review. (1) apps/mobile/components/report/slots/slot-a.tsx:48-56 links sightings to found listings, but the API refuses that (apps/api reports.domain.ts:221, VALIDATION): link only from lost listings, else a plain sighting (as web). (2) found-flow.tsx:~616 resets startedAt to now when a draft is restored, which breaks the capture-time fallback ('when the flow started'): keep the draft's value. (3) found-done: a held linked sighting still says the owner was told; say it is being checked instead (content slice wording).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 slot-a offers a linked sighting only on lost listings and a plain sighting otherwise; restoring a draft keeps startedAt; a held linked sighting shows the held wording (jest tests, full mobile suite green)
<!-- AC:END -->
