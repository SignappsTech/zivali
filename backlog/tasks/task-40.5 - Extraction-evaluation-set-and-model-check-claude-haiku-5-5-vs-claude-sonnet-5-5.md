---
id: TASK-40.5
title: >-
  Extraction evaluation set and model check (claude-haiku-5-5 vs
  claude-sonnet-5-5)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:23'
updated_date: '2026-10-18 21:29'
labels:
  - be
  - 'est:S'
milestone: m-2
dependencies:
  - TASK-40.3
references:
  - docs/tech/adr/012-ai-attribute-extraction.md§Model decision
  - docs/tech/contracts/C19-ai-extraction.md§Provider call
  - docs/tech/backend.md§Commands
parent_task_id: TASK-40
priority: high
ordinal: 375200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Confirms with data that the cheap model is good enough (ADR-012 gate) before real users see its suggestions, and gives a repeatable check for any later model change.

## Packet

Unblocks on: ai.extract job merged (TASK-40.3); the owner approves the paid run (about USD 0.50) and the photo set source (open question in the M3 breakdown)
The paid run happens once in the main checkout with the owner's ANTHROPIC_API_KEY (never copy .env files into a worktree); CI uses the mock.
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-40.5-extract-eval
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 apps/api/test/eval/extract/ has at least 40 labelled photos (dogs and cats, mixed breeds, poor light, at least 3 with a prominent person, at least 2 without an animal), each with its licence (CC0, CC BY or owner-provided) in labels.json
- [ ] #2 pnpm --filter api eval:extract [--model id] prints per-field results against the ADR-012 bars, refusal rate, p95 latency and mean cost per photo; it runs on the mock in pnpm verify (mechanics only)
- [ ] #3 One real run each on claude-haiku-5-5 and claude-sonnet-5-5; the results table and the recommendation are in the task notes, and a CHANGE to ADR-012§Model decision records the outcome
<!-- AC:END -->
