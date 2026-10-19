---
id: TASK-40.9
title: Real-photo extraction eval run and model decision (owner-gated)
status: Backlog
assignee:
  - '@backend-dev'
created_date: '2026-10-19 00:26'
updated_date: '2026-10-19 00:56'
labels:
  - be
  - 'est:S'
  - no-design
dependencies: []
references:
  - apps/api/test/eval/extract/README.md
parent_task_id: TASK-40
priority: medium
ordinal: 407200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up of TASK-40.5 (harness merged 2077c741). Owner approvals needed first: (1) the photo source: at least 40 photos with the README composition, each CC0/CC BY with author and URL, or owner-provided with the reporter's consent; (2) sending those photos (people included) to Anthropic on Haiku and Sonnet; (3) about USD 0.40-0.50 on the owner's key, run once in the main checkout (EVAL_EXTRACT=anthropic); (4) committing labels.json and replies. Then run eval:extract for both models, check the ADR-012 bars, and record the model decision in ADR-012 (Haiku default unless it misses a bar).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Owner approvals recorded in the notes (who, date)
- [ ] #2 Eval run for Haiku and Sonnet reported against the ADR-012 bars; decision recorded in ADR-012
<!-- AC:END -->
