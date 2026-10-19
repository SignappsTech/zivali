---
id: TASK-114.34
title: >-
  Align packages/types with the built schema and C9: enums, chat, Organisation
  (CH-136, CH-139)
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-18 22:07'
updated_date: '2026-10-19 02:06'
labels:
  - be
  - 'est:XS'
  - no-design
dependencies: []
references:
  - docs/tech/contracts/C9-chat.md
  - docs/tech/backend.md
parent_task_id: TASK-114
priority: medium
ordinal: 396200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
packages/types enums.ts:159 still has 'you' and chat.ts:22 lacks my_alias_key (C9 1.2): align with C9 as built in TASK-6.7. The Organisation type has slug and region_id but the built table has municipality_id: align the type to the table. The organisations to directory-shelters link stays open until M3.

## Packet

Unblocks on: nothing open (TASK-6.7, TASK-6.8 merged).
Review: tech-lead code review; run pnpm verify before reporting done.
Branch: agent/task-114.34-types-align
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 enums.ts and chat.ts match C9 (no 'you', my_alias_key present) and Organisation matches the table (municipality_id); web, mobile and api typecheck.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Already aligned on main (no 'you' in ALIAS_KEYS, my_alias_key in chat.ts, Organisation has municipality_id). No code change needed.
<!-- SECTION:NOTES:END -->
