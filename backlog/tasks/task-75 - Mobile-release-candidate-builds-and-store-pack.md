---
id: TASK-75
title: Mobile release candidate builds and store pack
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:05'
labels:
  - story
  - 'req:FR-037'
milestone: m-4
dependencies:
  - TASK-12
  - TASK-5
  - TASK-39
priority: low
ordinal: 75000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Store submission is out of scope, but builds, assets and policy answers must be ready when the Apple and Google accounts (Q-007) arrive.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given EAS, when a release profile runs, then signed internal builds can be produced once accounts exist and the profile is validated in dry run until then.
- [ ] #2 Given the store listings, when prepared, then icons, screenshots (SL and EN), descriptions and privacy and data-safety answers are drafted.
- [ ] #3 Given the payment features, when reviewed against App Store and Play rules, then a written decision lists which digital purchases (tips, subscriptions, boosts) need IAP or must be removed on mobile before submission.
- [ ] #4 Given push credentials, when provided, then push delivery is verified on real devices.
<!-- AC:END -->

## Packet

Unblocks on: app shell and deep links (TASK-12); EAS profiles (TASK-5); core loop e2e (TASK-39)
