---
id: TASK-80.2
title: Web Vet Partner ad context line from Ad.kind (C14; CH-381)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:38'
labels:
  - fe
  - 'est:XS'
  - web
dependencies:
  - TASK-80.1
  - TASK-36.4
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C14-ads-partners.md§Vet Partner placement
  - docs/design/pages/P21-ad-slots.md
parent_task_id: TASK-80
priority: low
ordinal: 503200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
P21 Vet Partner placement: the unit adds the 'Oglas · Veterinar v vaši regiji' context (`ads.vet_context`). Build with the Vet Partner placement of TASK-80.

## Packet
Unblocks on: TASK-80.1 (Ad.kind) merged; design TASK-36.4 done
Branch: agent/task-80.2-web-vet-ad-context
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An ad with `kind: 'vet_partner'` shows the `ads.vet_context` line with the Oglas label; other ads are unchanged; nothing claims 'nearest'; component tests
<!-- AC:END -->
