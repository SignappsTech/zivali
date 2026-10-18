---
id: TASK-43.7
title: Real-photo matching eval run and threshold picks (owner-gated)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-18 23:53'
labels:
  - be
  - 'est:S'
  - no-design
dependencies: []
references:
  - apps/api/test/eval/matching/README.md
parent_task_id: TASK-43
priority: medium
ordinal: 405200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up of TASK-43.3 (harness merged dec76d39): AC#2 and #3 of 43.3 need a real, licensed photo set and one Voyage run. Owner approvals needed first: (1) the photo set: pilot photos only with the reporters' consent, or CC-licensed photos with a licence per file; (2) one Voyage run, about 0.4M tokens for 200 photos (EVAL_EMBED=voyage, off by default); (3) committing apps/api/test/eval/matching/real/ (photos + cached vectors). Then run the eval, pick floor/ceiling/visual weight and band cut-offs, record them in C8 (CHANGE) and app_config defaults, and try the looser geo-time fit for V >= 0.8 (43.1 review note).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Owner approvals for the photo set, the Voyage run and committing real/ are recorded in the notes (who, date)
- [ ] #2 Eval run on the real set reported; chosen thresholds recorded in C8 and app_config defaults
<!-- AC:END -->
