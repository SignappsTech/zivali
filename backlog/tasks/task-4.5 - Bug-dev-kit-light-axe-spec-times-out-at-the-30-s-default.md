---
id: TASK-4.5
title: 'Bug: /dev/kit light axe spec times out at the 30 s default'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-15 12:55'
labels:
  - bug
  - web
  - e2e
  - 'est:XS'
dependencies: []
parent_task_id: TASK-4
priority: medium
ordinal: 319000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From QA TASK-4.3. Steps: pnpm --filter web e2e (3 runs). Expected: e2e/kit.spec.ts 'in light has no axe violations' passes well inside its timeout. Actual: it times out at the 30 s Playwright default in 3 of 3 runs; sibling kit specs take 18-29 s, and the admin-directory axe spec also timed out once under load. Severity: medium (CI e2e red). Fix the cost (one axe pass per page, scope or split the gallery, wait for a ready marker instead of networkidle) rather than only raising the timeout; a per-test timeout is fine as a guard once the spec runs comfortably under it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 kit.spec.ts light and dark axe specs pass 3 consecutive pnpm --filter web e2e runs, each under 20 s
- [x] #2 No e2e spec hardcodes a port or API origin (grep localhost: in apps/web/e2e)
<!-- AC:END -->

## Final Summary

Branch agent/task-4.4-e2e-fixes. photos.spec derives API origin from E2E_API_PORT; kit.spec overlay axe passes scoped to the overlay, 90 s guard timeouts (kit, admin-directory); photos upload wait 60 s. 3 consecutive e2e runs 30/30 passed; pnpm verify green.

