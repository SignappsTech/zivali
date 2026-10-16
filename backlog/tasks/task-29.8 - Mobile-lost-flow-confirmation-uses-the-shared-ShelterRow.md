---
id: TASK-29.8
title: 'Mobile: lost-flow confirmation uses the shared ShelterRow'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 02:23'
updated_date: '2026-10-16 02:44'
labels:
  - fe
  - trivial
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-29.6
  - TASK-30.3
parent_task_id: TASK-29
priority: low
ordinal: 339000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-29.6 review: lost-done.tsx has its own ShelterRow and ShelterLines because TASK-30.3's shared components/shelter/shelter-row.tsx (kind 'lost' | 'found' | 'sighted') wasn't on main yet. Both are on main now.

## Packet

Review: lead check (XS)
Branch: agent/task-29.8-shelter-row
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 apps/mobile/components/report-lost/lost-done.tsx uses components/shelter/shelter-row.tsx with kind 'lost' (lookup by municipality slug, else point, passed as props); the local ShelterRow and ShelterLines are removed.
- [ ] #2 Duplicate i18n keys between support.json/shelter_row.json are merged; the unused support.unverified key is removed; report-lost-done and shelter-row tests pass.
<!-- AC:END -->
