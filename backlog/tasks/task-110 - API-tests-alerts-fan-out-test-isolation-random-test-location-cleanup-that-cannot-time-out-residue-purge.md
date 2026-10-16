---
id: TASK-110
title: >-
  API tests: alerts fan-out test isolation (random test location, cleanup that
  cannot time out, residue purge)
status: Done
assignee: []
created_date: '2026-10-16 09:10'
updated_date: '2026-10-16 09:45'
labels:
  - tech
  - test
dependencies: []
priority: high
ordinal: 355000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On 2026-10-16 the shared local DB held 12,032 alert subscriptions and 47,665 deliveries of test-created users (no auth account), left by apps/api/test/domains/alerts.domain.test.ts: 'fans out to 1000 subscribers' creates 1000 profiles+subscriptions at the fixed test point P, and afterAll (delete profiles) exceeds the 30 s hookTimeout under load, so residue stays. Every later run fans out to the residue at P and times out (blocked most batch verifies). The lead deleted the residue by hand (owner approved). Make it permanent: (1) pick the test's point per run (a random point inside Slovenia far from earlier ones, or a unique municipality) so stale subscriptions cannot match; (2) bulk cleanup in afterAll with an explicit long timeout and set-based deletes (subscriptions, deliveries, jobs by dedupe_key, profiles), not row by row; (3) extend TASK-109's global-setup purge, local DB only, to delete alert_subscriptions/alert_deliveries (and optionally profiles) of users with no auth.users row. Check other tests that createMany profiles (matching, pets) for the same pattern.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Two consecutive full api runs leave no new alert_subscriptions/alert_deliveries rows for test users (count before/after)
- [ ] #2 alerts.domain.test.ts passes in under 30 s even with 12k stale subscriptions at the old test point (seeded in a scratch DB)
<!-- AC:END -->
