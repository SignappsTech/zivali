---
id: TASK-88.5
title: '@zivali/api/directory: likely/nearest fallback per C18'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-15 03:21'
updated_date: '2026-10-15 03:51'
labels:
  - fe
  - 'est:S'
dependencies:
  - TASK-88.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C18-shelter-directory.md
parent_task_id: TASK-88
ordinal: 307000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 getResponsibleShelter and useResponsibleShelter types and zod schema cover status 'likely' (likely_shelter {slug,name,phone,distance_km}) and 'unconfirmed' with nearest (up to 2 {slug,name,distance_km}); municipality always present
- [ ] #2 Shelter is no longer dropped unless confirmed; phone is exposed only for confirmed and likely; tests cover all four statuses
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Branch: agent/TASK-88.5-directory-likely-nearest
<!-- SECTION:NOTES:END -->
