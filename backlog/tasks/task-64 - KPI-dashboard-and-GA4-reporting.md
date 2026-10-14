---
id: TASK-64
title: KPI dashboard and GA4 reporting
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:05'
labels:
  - story
  - 'req:FR-019'
  - 'req:FR-038'
milestone: m-3
dependencies:
  - TASK-34
  - TASK-32
priority: medium
ordinal: 64000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Goals G-1 to G-5 need measuring: reunite rate, time to first match, found-report completion, active shelters and revenue; GA4 covers audience and funnels.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the admin KPI page, when opened, then it shows reunite rate (30 days), median time to first match, found reports per week, active shelters, alert opt-in rate, boosts, subscriptions and contribution revenue from our DB, filterable by region and species.
- [ ] #2 Given the GA4 checklist, when followed, then funnels (report_lost_start to submit, report_found_start to submit, match_suggested to match_confirmed to reunited) and key events are configured and verified in DebugView.
- [ ] #3 Given definitions, when numbers are displayed, then they match the metric definitions documented in the PRD.
- [ ] #4 Given users who decline analytics, when KPIs are computed, then DB-based KPIs still work without personal data and GA numbers are labelled as modelled or partial.
<!-- AC:END -->

## Packet

Unblocks on: admin layout (TASK-34); payments ledger for revenue (TASK-32)
