---
id: TASK-119.12
title: >-
  Mobile analytics parity: report lost, found and sighting steps, photo errors
  and AI pre-fill
status: Backlog
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 23:55'
labels:
  - fe
  - 'est:M'
  - no-design
  - mobile
dependencies:
  - TASK-119.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C12b-analytics-tracking-plan.md§3. Flows and steps
  - docs/tech/contracts/C12b-analytics-tracking-plan.md§5. AI pre-fill (C19)
  - docs/tech/contracts/C12-analytics-consent.md§Mobile wiring
parent_task_id: TASK-119
priority: low
ordinal: 523200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Web-first pilot: mobile follows after the store accounts (status Backlog until then). Files owned: apps/mobile/components/report-lost/**, apps/mobile/components/report-found/**, the mobile photo picker and AI pre-fill hooks, and their tests. Same events as web (TASK-119.4 to TASK-119.6); the shared registry is already done (TASK-119.2).

## Packet
Unblocks on: TASK-119.2 (registry and flowTracker); mobile release planning (store accounts)
Branch: agent/TASK-119.12-mobile-analytics-reports
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The mobile report-lost, report-found and sighting flows send flow_step per shown step and flow_error per refused attempt exactly as C12b §3 and §4 (same flow and step names as web)
- [ ] #2 Photo failures and AI pre-fill outcomes send flow_error photo and ai_prefill as C12b §5
- [ ] #3 jest-expo tests assert the mock events and nothing without consent; Firebase DebugView on a device build shows the steps
<!-- AC:END -->
