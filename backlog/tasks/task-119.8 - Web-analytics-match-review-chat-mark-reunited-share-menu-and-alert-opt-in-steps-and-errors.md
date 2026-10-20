---
id: TASK-119.8
title: >-
  Web analytics: match review, chat, mark reunited, share menu and alert opt-in
  steps and errors
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 23:53'
labels:
  - fe
  - 'est:S'
  - no-design
  - web
milestone: m-1
dependencies:
  - TASK-119.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C12b-analytics-tracking-plan.md§3. Flows and steps
  - >-
    docs/tech/contracts/C12b-analytics-tracking-plan.md§4. Errors (where people
    get stuck)
  - docs/tech/contracts/C12-analytics-consent.md§Event registry
parent_task_id: TASK-119
priority: medium
ordinal: 519200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The match-to-reunite loop and the sharing and alert steps. Files owned: apps/web/components/matches/match-review.tsx, apps/web/components/chat/thread.tsx, apps/web/components/report/lifecycle.tsx and lifecycle-helpers.ts, apps/web/components/manage/manage-view.tsx (reunite spot only), apps/web/components/report/share-menu.tsx, apps/web/components/alerts/alert-settings.tsx, and their tests. Never send the reject reason text. No new copy.

## Packet
Unblocks on: TASK-119.2 (registry: match_rejected, flow events)
Branch: agent/TASK-119.8-analytics-match-share-alerts
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 match_rejected { species, region, match_source } fires when a rejection succeeds; a refused confirm or reject sends flow_error match_review on confirm or reject with its C1 code; match_suggested and match_confirmed stay as today
- [ ] #2 A refused chat send sends flow_error chat send (FORBIDDEN, RATE_LIMITED, NETWORK); chat_started stays as today
- [ ] #3 flow_step reunite dialog when the mark-reunited dialog opens (report page and manage link); a refused transition sends flow_error reunite dialog; reunited stays as today
- [ ] #4 flow_step share open when the share menu opens; flow_step alerts form when the alert opt-in form shows, flow_error alerts form on a refused save (permission_denied for browser notifications, C1 codes); share, poster_download and alert_opt_in stay as today
- [ ] #5 Component tests on the mock adapter cover each new event and nothing without consent; pnpm verify passes
<!-- AC:END -->
