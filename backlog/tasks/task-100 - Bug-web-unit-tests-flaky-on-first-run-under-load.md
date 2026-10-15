---
id: TASK-100
title: 'Bug: web unit tests flaky on first run under load'
status: Done
assignee: []
created_date: '2026-10-15 08:20'
updated_date: '2026-10-15 08:51'
labels:
  - bug
  - fe
  - 'est:XS'
dependencies: []
priority: high
ordinal: 314000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
merge.mjs verify failed once on web#test 3 times on 2026-10-15 (each retry passed). Find the flaky spec(s) and fix the cause (timing, shared state, jsdom startup, fake timers), not by raising timeouts further.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The flaky web spec(s) are identified with the failing assertion and cause
- [ ] #2 Fixed at the cause; pnpm --filter web test passes 5 runs in a row while another verify runs in parallel
<!-- AC:END -->
