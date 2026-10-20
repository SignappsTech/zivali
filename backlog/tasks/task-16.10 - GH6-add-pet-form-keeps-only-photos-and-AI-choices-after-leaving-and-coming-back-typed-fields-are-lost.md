---
id: TASK-16.10
title: >-
  GH#6: add-pet form keeps only photos and AI choices after leaving and coming
  back; typed fields are lost
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-20 13:38'
labels:
  - bug
  - fe
  - 'est:S'
  - no-design
dependencies: []
references:
  - apps/web/components/pets/pet-form.tsx
  - docs/tech/frontend.md
parent_task_id: TASK-16
priority: high
ordinal: 532200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub issue #6 (tester, 2026-10-20): when adding a pet, leaving the form and returning restores only the uploaded images and the AI-generated selections; every other entered field (name, chip, colours, notes, …) is lost. The draft must keep all fields the person entered, the same way the report-lost wizard restores its draft, and still never store data the privacy rules keep off the device (check the pet form's draft code and the frontend slice). Cover leaving by in-app navigation and by reload.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every field the person typed or chose on the add-pet form comes back after leaving and returning (navigation and reload); component test
- [ ] #2 Saving the pet or discarding clears the draft; no draft survives sign-out
<!-- AC:END -->
