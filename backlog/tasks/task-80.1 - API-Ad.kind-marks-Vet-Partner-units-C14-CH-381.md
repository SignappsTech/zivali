---
id: TASK-80.1
title: 'API: Ad.kind marks Vet Partner units (C14; CH-381)'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:33'
labels:
  - be
  - 'est:XS'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C14-ads-partners.md§Vet Partner placement
parent_task_id: TASK-80
priority: low
ordinal: 488200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Planned in C14 §Serving for the Vet Partner placement (M4): a client can add the 'Oglas · Veterinar v vaši regiji' context only when the unit says it is a Vet Partner one. Build with the Vet Partner placement of TASK-80.

## Packet
Unblocks on: -
Branch: agent/task-80.1-ad-kind-vet-partner
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `Ad` gains `kind: 'ad' | 'vet_partner'` ('ad' for sponsor and house ads; 'vet_partner' only for the Vet Partner placement); tests; openapi.json and `gen:api`
<!-- AC:END -->
