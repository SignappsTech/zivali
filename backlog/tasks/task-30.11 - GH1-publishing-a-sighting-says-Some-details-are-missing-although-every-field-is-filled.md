---
id: TASK-30.11
title: >-
  GH#1: publishing a sighting says 'Some details are missing' although every
  field is filled
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-20 13:38'
updated_date: '2026-10-20 14:09'
labels:
  - bug
  - fe
  - 'est:S'
  - no-design
dependencies: []
references:
  - apps/web/components/report-found/found-flow.tsx
  - docs/tech/contracts/C4-reports-and-pets.md
parent_task_id: TASK-30
priority: high
ordinal: 531200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub issue #1 (tester, 2026-10-19): publishing a 'Sighted animal' report shows 'Some details are missing or not quite right. Please check the highlighted fields.' even when all fields are filled, and nothing is highlighted. Reproduce with the web found flow in sighting mode (linked and unlinked) against the mock API, then find which refusal it is: a client-side check on a field the sighting steps don't show, or an API VALIDATION path the flow cannot map to a visible field (e.g. photo_ids, contact, event_at). Fix at the root; if the API refuses a valid sighting, fix the schema there and say so. A refusal whose field is not on screen must name what is wrong instead of the generic message.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A sighting with every shown field filled publishes (component test, both with and without a linked report)
- [x] #2 Any refusal names its field or a specific reason; the generic 'highlighted fields' message only appears when a shown field is highlighted
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Packet
Branch: agent/TASK-30.11-sighting-missing-details
Root cause: the API VALIDATION on photo_ids (a re-used photo, API fixed by TASK-30.10) and any other refusal reached the flow's note as errors.VALIDATION, since no issue path was mapped to a step; now photo_ids, finder_email, circumstances and event_at go back to their step and are marked there; linked_report_id says NOT_FOUND; anything else INTERNAL. No API change.
<!-- SECTION:NOTES:END -->
