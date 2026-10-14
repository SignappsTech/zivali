---
id: TASK-3
title: Monorepo scaffold and local-first dev environment
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:01'
labels:
  - story
  - 'req:NFR-DEVX'
milestone: m-0
dependencies: []
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
All other work needs one repo layout and a one-command local stack that runs without cloud credentials (local Supabase in Docker, mocked AI, Stripe, email and analytics).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a fresh clone, when a developer runs the documented bootstrap, then pnpm install, local Supabase start, DB migrate and seed, and both apps start with no cloud credentials.
- [ ] #2 Given the workspace, when listing packages, then apps/web, apps/mobile and packages for tokens, types, api, validation and analytics exist and build with Turborepo caching.
- [ ] #3 Given AI, Stripe, email, push and analytics integrations, when running locally or in tests, then each sits behind an adapter interface with a mock implementation chosen by environment.
- [ ] #4 Given the README, when read, then it documents commands, environment variable names (no values) and branch and CI conventions.
<!-- AC:END -->
