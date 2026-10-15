---
id: TASK-103
title: 'Audit: pin @grpc/grpc-js >= 1.13.6 via override (firebase transitive)'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-15 19:50'
labels:
  - tech
  - 'est:XS'
dependencies: []
priority: high
ordinal: 325000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CI's `pnpm audit --audit-level high` fails on GHSA-m9gg-hp2v-232j (@grpc/grpc-js < 1.13.6), pulled in by @react-native-firebase/app → firebase → @firebase/firestore (TASK-7.3). Firestore is unused and grpc-js is Node-only, but the gate is right to block: force the patched version with a pnpm override instead of ignoring the advisory.

## Packet

Branch: lead/task-103-grpc-override
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pnpm-workspace.yaml overrides pin @grpc/grpc-js to ^1.13.6 with a one-line reason; the lockfile has no grpc-js below 1.13.6
- [x] #2 `pnpm audit --audit-level high` passes
<!-- AC:END -->
