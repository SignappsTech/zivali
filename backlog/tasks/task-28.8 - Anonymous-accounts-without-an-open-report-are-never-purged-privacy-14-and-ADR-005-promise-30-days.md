---
id: TASK-28.8
title: >-
  Anonymous accounts without an open report are never purged (privacy §14 and
  ADR-005 promise 30 days)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 20:30'
updated_date: '2026-10-19 20:32'
labels:
  - bug
  - 'est:S'
  - web
milestone: m-1
dependencies: []
parent_task_id: TASK-28
priority: medium
ordinal: 467200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: read /en/privacy §14 row "Anonymous accounts without an open report: 30 days" (SL /zasebnost, same row) and docs/tech/adr/005-anonymous-reporting-and-captcha.md ("purge_retention deletes anonymous users with no live report after 30 days"); then apps/api/jobs/retention.purge.job.ts, apps/api/domains/retention/* and apps/api/prisma/data-inventory.json (profiles).
Expected: a retention step deletes anonymous accounts (auth user and app.profiles row) that have no open report after 30 days, or the policy row changes.
Actual: no purge step touches profiles.is_anonymous or auth.users (TASK-114.33 added records and reports, not accounts); the inventory gives profiles only "until the account is deleted". Anonymous sessions (enable_anonymous_sign_ins = true) accumulate with their profile rows, so the published 30-day promise is not kept.
Notes: a closed report's finder may still chat for 6 months (C9) and manage via the private link until close (C7); the window must not cut those off. Like the other TASK-114.33 steps it would only count until app_config retention.purge_live is set. If the lead prefers changing the policy instead, that is a CHANGE for the content strategist.
Severity: medium.

## Packet

Unblocks on: -
Branch: agent/task-28.8-anonymous-account-purge from main
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 retention.purge deletes anonymous accounts with no open report after the 30-day window (ADR-005, privacy §14) without breaking open chats or private links, with a test, and data-inventory.json states the window; or the policy row is changed through a CHANGE
<!-- AC:END -->
