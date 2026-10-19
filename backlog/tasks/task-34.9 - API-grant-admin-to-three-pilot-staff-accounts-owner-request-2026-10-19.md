---
id: TASK-34.9
title: 'API: grant admin to three pilot staff accounts (owner request 2026-10-19)'
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-19 12:53'
updated_date: '2026-10-19 12:55'
labels:
  - be
  - 'est:XS'
dependencies: []
references:
  - docs/tech/adr/018-roles-and-admin-strong-auth.md
  - docs/tech/admin-runbook.md
  - docs/tech/backend.md
parent_task_id: TASK-34
priority: high
ordinal: 417200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-19 in chat: the accounts 01a2cff5-ae4e-454d-8029-e8a7cb56dcb8, 16b8f7d3-a521-4d07-b9ed-ec4ee839c722 and 6db9755a-5d20-4060-a374-59c98058efbf should be admins on najdimo.si. The hosted DB is changed only through migrations in the deploy pipeline, and the admin:create CLI needs emails and an interactive prompt, so this is a one-off data migration.

## Packet

Unblocks on: -
Contracts: ADR-018 (roles, bootstrap), C1 audit conventions; reuse the audit shape setUserRole writes (PUT /v1/admin/users/:id/role)
Review: tech-lead code review on the default model (auth/roles)
Branch: agent/task-34.9-pilot-admins
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A new migration sets profiles.role = admin for exactly these three ids when the profile exists and is not admin yet; missing ids are a no-op; re-running changes nothing and writes no second audit row
- [ ] #2 Each grant writes an audit entry in the same shape as setUserRole (actor = system, target = the profile, note 'Owner request 2026-10-19: pilot admin')
- [ ] #3 A migration test on a scratch DB covers promote, missing id, already admin, re-run; docs/tech/admin-runbook.md notes the grant
<!-- AC:END -->
