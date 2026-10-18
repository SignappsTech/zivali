---
id: TASK-114.30
title: 'CSP: allow the R2 upload origin in img-src (CH-297)'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 21:14'
updated_date: '2026-10-18 21:19'
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
- [x] #1 img-src includes the configured R2 upload origin; no other CSP directive changes
- [x] #2 proxy unit test covers it
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Already on main since ccb635a6 (TASK-16.6 fix round, 2026-10-16): proxy.ts:28 uploads = origin of env.R2_UPLOAD_ORIGIN, used in img-src (:43) and connect-src (:45); proxy.test.ts:113 covers it. No code change needed; vitest proxy.test.ts 20/20 pass. Env: R2_UPLOAD_ORIGIN (lib/env.ts:23, required; outside local must be https://<account>.eu.r2.cloudflarestorage.com, else the app fails fast). Vercel staging/production values not verifiable from the connector (no team/project visible).
Branch: agent/TASK-114.30-csp-r2-img-src
<!-- SECTION:NOTES:END -->
