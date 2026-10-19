---
id: TASK-89.6
title: >-
  Web admin directory: client follows C18 with generated endpoints, stubs go
  (CH-251)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:37'
labels:
  - fe
  - 'est:S'
  - web
dependencies:
  - TASK-89.5
  - TASK-89.4
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C18-shelter-directory.md§Admin
  - docs/design/pages/P19-admin-shell.md
parent_task_id: TASK-89
priority: medium
ordinal: 499200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CH-251: packages/api/src/directory-admin.ts stubs differ from C18 and the TASK-89.1 API in seven places, so saves and imports fail or show wrong data.

## Packet
Unblocks on: TASK-89.5 (municipality history route) merged; design TASK-89.4 done
Branch: agent/task-89.6-web-directory-client-c18
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The directory-admin stubs are replaced by the `gen:api` endpoints; requests follow C18: `audit_note` required on POST, PUT and an applied import; `version` and `municipalities` required on PUT, `municipalities` on POST
- [ ] #2 Create and update answer `Shelter` and the list is refetched; history items `{ version, data, source, actor_id, audit_note, created_at }` show the actor as the audit log does; import results `{ entity, id, action, diff }`; municipality rows read the nested `municipality: { slug, name }`
- [ ] #3 The municipality drawer's history uses the new C18 route; component tests on fixtures that match C18
<!-- AC:END -->
