---
id: TASK-34.10
title: 'Web admin: Enquiries screen over GET /v1/admin/leads (P19)'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:44'
labels:
  - fe
  - 'est:S'
  - web
dependencies: []
references:
  - docs/design/pages/P19-admin-shell.md
  - docs/design/system.md
parent_task_id: TASK-34
ordinal: 472200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
No task built /admin/enquiries (P19 Commerce > Enquiries, M2); it is still a coming-soon section, so a lead whose notification email failed (or with LEADS_NOTIFY_EMAIL unset) is visible to no one. Build the list with the P19 shared table pattern over GET /v1/admin/leads (C14). Spec: docs/design/pages/P19-admin-shell.md§Sections (Enquiries) and §Shared table pattern. CH-662.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an admin opens Commerce > Enquiries, when leads exist, then they list in the P19 dense table with consent time, newest first, from GET /v1/admin/leads
- [ ] #2 Given no leads, then an empty state shows; given an API error, then a retry note; axe 0 violations, keyboard operable
<!-- AC:END -->

## Packet

Unblocks on: Web admin shell merged (TASK-34.3, done); P19§Sections (Enquiries)
Review: local
Branch: agent/TASK-34.10-admin-enquiries

