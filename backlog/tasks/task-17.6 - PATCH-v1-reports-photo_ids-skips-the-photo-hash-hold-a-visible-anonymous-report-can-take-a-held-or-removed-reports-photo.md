---
id: TASK-17.6
title: >-
  PATCH /v1/reports photo_ids skips the photo-hash hold: a visible anonymous
  report can take a held or removed report's photo
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-16 00:22'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-17
ordinal: 331000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-17 AC#5 (QA TASK-17.4). Steps: (1) another report is held or removed with a photo of sha256 X; (2) an anonymous finder POSTs a found report with a fresh photo -> 201 visible; (3) the finder creates a photo with sha256 X and PATCHes /v1/reports/:code {photo_ids:[that photo]}. Expected: the report is held (C7 hold rule: a photo hash matches a held/removed report) and the photo stays private. Actual: 200, moderation_state stays visible, photo.publish is queued and the photo goes public (reports.domain.ts updateReport calls setPhotos but never the submission-guard photo check; submissionGuard runs on create only). Reproduced on scratch DB task_qa_17_4. Severity: major (abuse hold bypass: the scam photo the hold exists for gets published).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PATCH /v1/reports/:code with photo_ids that match (sha256) a photo of a held or removed report holds the report (moderation_state held, anon_hold flag photo_match) or refuses the change, and the photo is not published; a regression test covers it
<!-- AC:END -->
