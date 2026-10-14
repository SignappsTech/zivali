---
id: TASK-4
title: Quality kit and CI pipeline
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:01'
labels:
  - story
  - 'req:NFR-QUAL'
milestone: m-0
dependencies:
  - TASK-3
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Gates must exist before feature work lands so every story is checked the same way: lint, types, unit and e2e tests, accessibility and performance budgets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a pull request, when CI runs, then lint, typecheck, unit tests and build run for affected packages and block the merge on failure.
- [ ] #2 Given the web app, when CI runs, then Playwright smoke tests, axe accessibility checks and Lighthouse CI budgets (performance, accessibility, SEO) run against a preview build.
- [ ] #3 Given the mobile app, when CI runs, then unit and component tests run and an Expo typecheck and export check passes.
- [ ] #4 Given a leaked secret or a high-severity dependency issue, when CI runs, then secret scanning and dependency audit fail the build.
<!-- AC:END -->

## Packet

Unblocks on: workspace, turbo pipeline and test runner locations merged (TASK-3)
