---
id: TASK-41.1
title: 'Wireframe: AI pre-fill in the pet, lost and found forms (person approval gate)'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-18 21:23'
updated_date: '2026-10-18 21:29'
labels:
  - design
  - wireframe
  - 'est:S'
milestone: m-2
dependencies: []
references:
  - docs/design/pages/P7-report-found.md§Flow
  - docs/design/pages/P6-report-lost.md§Flow
  - docs/design/pages/P8-pet-profiles.md§Add and edit
  - docs/tech/contracts/C19-ai-extraction.md§Client rules
parent_task_id: TASK-41
priority: high
ordinal: 377200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The pre-fill changes the photo and details steps of three forms, so per the owner rule (2026-10-16) a person-approved wireframe comes first. Low-fi, or a mock from our real components if that is no more work, in docs/design/wireframes/.

**Gate (owner rule 2026-10-16):** record the approval in this task's notes (who, date, version). No mockup or implementation task starts before it. A component mock that was approved also serves as the mockup.

## Packet

Unblocks on: - (no dependencies)
Review: the owner (or a person they name) approves; design-lead self-check against C19 §Client rules.
Branch: agent/task-41.1-ai-prefill-wireframe
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 docs/design/wireframes/M-ai-prefill.html covers the photo and details steps of P6 (new pet path), P7 and the P8 form, mobile and desktop, with the states: checking the photo, suggestions arrived (Suggested labels), low-confidence hint, notice (no animal, other animal, several animals), unavailable (nothing extra), and the user editing before a late suggestion
- [ ] #2 A person approved it; their name, the date and the approved version are in this task's notes
- [ ] #3 After approval, docs/design/pages/P7-report-found.md gets a section "AI suggestions" with the approved states (P6 and P8 point to it), so the FE packets are self-contained
<!-- AC:END -->
