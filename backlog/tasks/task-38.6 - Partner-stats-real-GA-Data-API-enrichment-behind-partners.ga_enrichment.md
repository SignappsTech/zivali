---
id: TASK-38.6
title: 'Partner stats: real GA Data API enrichment behind partners.ga_enrichment'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:19'
labels:
  - be
  - 'est:S'
milestone: m-4
dependencies:
  - TASK-38.2
references:
  - docs/tech/contracts/C14-ads-partners.md
parent_task_id: TASK-38
priority: low
ordinal: 372200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Real GA enrichment for partner stats had no owner (CH-227, TASK-38 AC2); start when the client supplies GA credentials.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given partners.ga_enrichment on and GA credentials set, when the partners.stats job runs, then the snapshot includes GA-derived audience figures; with the flag off or credentials missing the stats stay DB-only
- [ ] #2 Given a GA API failure, when the job runs, then the previous snapshot is served and the failure is logged without blocking
<!-- AC:END -->

## Packet

Unblocks on: Partner stats job and endpoint merged (TASK-38.2, done) and the client supplies GA credentials (docs/client-todo.md)
Review: local
