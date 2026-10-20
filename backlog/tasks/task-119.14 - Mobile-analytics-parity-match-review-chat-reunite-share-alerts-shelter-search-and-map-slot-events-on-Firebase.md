---
id: TASK-119.14
title: >-
  Mobile analytics parity: match review, chat, reunite, share, alerts, shelter
  search and map; slot events on Firebase
status: Backlog
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 23:56'
labels:
  - fe
  - 'est:S'
  - no-design
  - mobile
dependencies:
  - TASK-119.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C12b-analytics-tracking-plan.md§3. Flows and steps
  - docs/tech/contracts/C12b-analytics-tracking-plan.md§7. Ads
  - docs/tech/contracts/C12-analytics-consent.md§Mobile wiring
parent_task_id: TASK-119
priority: low
ordinal: 525200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Web-first pilot: mobile follows after the store accounts (status Backlog until then). Files owned: apps/mobile/app/r/[code]/matches/**, apps/mobile/components/chat/**, apps/mobile/components/report/lifecycle*, apps/mobile/lib/share.ts, apps/mobile/lib/alerts.ts, the mobile shelter search and map browse components, and their tests. Same events as web (TASK-119.8, TASK-119.9).

## Packet
Unblocks on: TASK-119.2 (registry, slot event rename); mobile release planning (store accounts)
Branch: agent/TASK-119.14-mobile-analytics-loop
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Mobile sends match_rejected, the reunite, share, alerts, shelter_search and browse flow steps and their flow_error as C12b §3 and §4 (same names as web)
- [ ] #2 Firebase DebugView on a device build shows ad_slot_impression and ad_slot_click from the app slots (the rename avoids the reserved app name ad_click)
- [ ] #3 jest-expo tests assert the mock events and nothing without consent
<!-- AC:END -->
