---
id: TASK-41.2
title: 'Web: AI pre-fill in PetFields (pet profile, lost flow) and the found flow'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 21:23'
updated_date: '2026-10-19 10:02'
labels:
  - fe
  - 'est:M'
milestone: m-2
dependencies:
  - TASK-41.1
  - TASK-40.2
  - TASK-40.6
  - TASK-40.10
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C19-ai-extraction.md§Client rules
  - docs/design/pages/P7-report-found.md§AI suggestions
  - docs/content/pages/P7-report-found.md§AI pre-fill
parent_task_id: TASK-41
priority: high
ordinal: 378200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Panicked users must see, trust and override what the AI suggests: the web forms get faster, not riskier (FR-013).

## Packet

Unblocks on: Wireframe approved by a person and recorded in the wireframe task's notes (TASK-41.1); AI wire types and fixtures merged (TASK-40.2); AI copy delivered (TASK-40.6). Code against createMockApi and the fixtures until TASK-40.4 is in the spec.
Design: docs/design/wireframes/M-ai-prefill.html and P7 §AI suggestions (P6, P8 point there)
Copy: docs/content/pages/P7-report-found.md §AI pre-fill
Contracts: C19 §Client rules and §REST; conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-41.2-ai-prefill-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 After the first photo uploads, the form polls the attributes and fills species, breed, colours, pattern and size only in empty, untouched fields, each labelled Suggested and editable; nothing is saved without the user's own save or publish
- [ ] #2 A field with value null stays empty with the low-confidence hint; an unknown breed uses the Mixed or Unknown choice; breed names are localised (SL, EN); a different species is shown as a hint, never switched
- [ ] #3 After 3 s, on unavailable or on an error the user continues manually and a late suggestion never overwrites an edit (test); with ai.enabled false there is no polling
- [ ] #4 Arriving suggestions are announced once in a polite live region; axe clean; matches the approved wireframe or mockup (design-lead visual review); unit and e2e tests with the mock
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Lead 2026-10-19: dispatched by hand on the owner's 'enable AI too, we will test today'. Scope: the wireframe v1 parts the owner approved (TASK-41.1 notes: Q1, Q3, Q5, Q7) plus the found sentence with the breed (Q4). The confidence display and the crop tool wait for v2. TASK-40.6 copy is delivered; its pending legal approval gates switching AI on (TASK-40.7), not this build.
<!-- SECTION:NOTES:END -->
