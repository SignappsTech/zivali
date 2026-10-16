---
id: TASK-34.7
title: 'Admin API: ad list/stats/image-upload and directory reads write no audit entry'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-16 09:28'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-34
ordinal: 357000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AC#2. Steps: read apps/api/domains/ads/ads-admin.domain.ts (listAds, getAdStats, requestAdImageUpload) and domains/directory/directory-admin.domain.ts (listShelters, listAssignments, listShelterChanges): no AuditDao.write. Expected (C1: AuditDao.write in every staff service call; route docs say 'Audited' for sibling reads). Actual: users, audit-log, queues, leads, abuse-reports, flags, all writes are audited; these reads and the image presign are not. Severity: low (no PII in these reads).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every staff service call writes an audit entry (C1): GET /v1/admin/ads, /ads/:id/stats, POST /ads/:id/image, GET /shelters, /municipality-shelters, /shelters/:slug/changes
<!-- AC:END -->

## Packet

Branch: agent/task-34.6-admin-fixes
