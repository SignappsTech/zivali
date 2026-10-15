---
id: TASK-98
title: 'e2e and quality runs: free port per run, no foreign server reuse'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-15 04:40'
updated_date: '2026-10-15 06:09'
labels:
  - fe
  - 'est:XS'
dependencies: []
priority: high
ordinal: 312000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Playwright and quality runs must never test another worktree's server (seen: EADDRINUSE :3000 with passing specs in TASK-10.2). Files: apps/web/playwright.config.ts, tests/quality. (CH-108)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 e2e and quality runs pick a free port per run (get-port style or PLAYWRIGHT_PORT/QUALITY_PORT)
- [ ] #2 reuseExistingServer is true only when PW_REUSE=1
- [ ] #3 All web e2e re-run once and green
<!-- AC:END -->

## Packet

Branch: agent/TASK-98-pw-free-port
