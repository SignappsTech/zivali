---
id: TASK-119.15
title: >-
  Admin console loads gtag after analytics consent (e2e admin-shell no-GA red on
  main)
status: Done
assignee: []
created_date: '2026-10-20 10:01'
updated_date: '2026-10-20 10:09'
labels:
  - bug
  - fe
  - 'est:XS'
dependencies: []
references:
  - apps/web/e2e/admin-shell.spec.ts
  - docs/tech/contracts/C12-analytics-consent.md
parent_task_id: TASK-119
priority: high
ordinal: 526200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CI on main a4bb3cd6 (after the TASK-119.4/.7/.8/.9/.10 merges) fails one e2e: apps/web/e2e/admin-shell.spec.ts:285 'no GA in the console even with analytics granted; the public pages still load it'. At :305 the external request list on the admin audit page (h1 'Revizijska sled') contains https://www.googletagmanager.com/gtag/js?id=G-E2ETEST. The admin console must never load GA or create window.dataLayer, whatever the consent; the public pages still load it after a grant. Likely one of the TASK-119.x changes calls into the GA adapter from a component mounted in the admin tree too (e.g. auth session-sync / setUserRole from TASK-119.7, or a flowTracker/track call), which lazy-loads gtag. Deploy of najdimo.si is blocked until main is green.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 admin-shell.spec.ts:285 passes: no googletagmanager request and no dataLayer on the admin console with analytics granted
- [ ] #2 Public pages still load GA after a grant (same spec, second half) and analytics.spec.ts / consent*.spec.ts still pass
- [ ] #3 Fix is at the root (the admin tree never initialises the GA adapter), not a test change; a unit test covers the guard
<!-- AC:END -->

## Packet

Branch: agent/TASK-119.15-admin-no-ga
