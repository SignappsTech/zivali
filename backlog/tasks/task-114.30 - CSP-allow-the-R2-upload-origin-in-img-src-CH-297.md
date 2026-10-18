---
id: TASK-114.30
title: 'CSP: allow the R2 upload origin in img-src (CH-297)'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 21:14'
labels:
  - bug
  - fe
  - 'est:XS'
  - no-design
dependencies: []
references:
  - docs/tech/frontend.md
parent_task_id: TASK-114
priority: medium
ordinal: 370200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CH-297, now written into docs/tech/frontend.md as a requirement: the web CSP img-src must include the R2 upload origin, so photo previews loaded from it aren't blocked. The code change in apps/web/proxy.ts (CSP builder) is still missing. Add the origin from the existing env/config (no hard-coded host), keep the rest of the policy as is, and cover it in the proxy unit test. CH-303's packet updates for TASK-18.2, 24.3, 25.4, 26.5, 36.6 and 20.4 are separate (lead).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 img-src includes the configured R2 upload origin; no other CSP directive changes
- [ ] #2 proxy unit test covers it
<!-- AC:END -->
