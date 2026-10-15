---
id: TASK-4.4
title: 'Bug: photos e2e hardcodes API :4000, fails since TASK-98 free ports'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-15 10:43'
labels:
  - bug
  - web
  - e2e
  - 'est:XS'
dependencies: []
parent_task_id: TASK-4
priority: high
ordinal: 318000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: pnpm --filter web e2e (or playwright test e2e/photos.spec.ts --workers=1). Expected: all photos specs green (TASK-98 AC3). Actual: 'a 6 MB camera photo uploads...' and 'the draft survives a reload...' fail deterministically, UI shows 'Fotografija se ni naložila': spec has const API = 'http://localhost:4000' but playwright.config.ts now builds the web app with NEXT_PUBLIC_API_URL on a random free port, so page.route never matches. Severity: medium (CI e2e job red).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 e2e/photos.spec.ts routes the API origin from process.env.E2E_API_PORT (or NEXT_PUBLIC_API_URL), both photos specs pass
<!-- AC:END -->
