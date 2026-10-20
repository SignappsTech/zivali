---
id: TASK-24.8
title: >-
  GH#8 (part): poster PDF downloads as an id-based file name; use najdimo-<pet
  name>-<date>.pdf
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-20 13:39'
updated_date: '2026-10-20 13:58'
labels:
  - fe
  - 'est:XS'
  - no-design
dependencies: []
references:
  - docs/tech/frontend.md
parent_task_id: TASK-24
ordinal: 537200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub issue #8, file-name part (tester, 2026-10-20): the downloaded missing-pet PDF has an id-based name. Name it najdimo-<pet-name-slug>-<YYYY-MM-DD>.pdf (pet name slugified to ASCII, falls back to the short code when there is no name), keeping the language suffix rule of TASK-114.7 if it still applies. The PDF styling part of #8 is a design rework and waits for a wireframe (separate task).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The poster PDF downloads as najdimo-<slug>-<date>.pdf (with the language rule of TASK-114.7 if it applies); no name falls back to the short code (test)
<!-- AC:END -->

Branch: agent/TASK-24.8-poster-filename
