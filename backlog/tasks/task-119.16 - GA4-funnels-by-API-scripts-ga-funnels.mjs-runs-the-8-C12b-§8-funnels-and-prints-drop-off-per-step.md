---
id: TASK-119.16
title: >-
  GA4 funnels by API: scripts/ga-funnels.mjs runs the 8 C12b §8 funnels and
  prints drop-off per step
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-20 13:15'
labels:
  - tech
  - 'est:S'
dependencies: []
references:
  - >-
    docs/tech/contracts/C12b-analytics-tracking-plan.md§8. GA4 property config
    (admin client; TASK-119 GA4 tasks)
  - docs/tech/backend.md
parent_task_id: TASK-119
priority: high
ordinal: 529200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner asked 2026-10-20 that the 8 funnels of C12b §8 be done programmatically. Saved explorations cannot be created through any GA4 API, so compute them with the Data API instead: POST https://analyticsdata.googleapis.com/v1alpha/properties/559038055:runFunnelReport (read-only). A repo script scripts/ga-funnels.mjs <root> [--days 28] [--funnel <n>] [--md <file>] builds one funnel request per C12b §8 entry (closed funnels; the match loop open; steps as event filters, flow_step steps filtered on the event-scoped dimensions customEvent:flow / customEvent:step; report_type sighted for the sighting submit), calls runFunnelReport and prints per funnel: step, active users, % of the previous step, drop-off; plus the 'stuck' table (flow_error by customEvent:flow, step, error_field, error_code via runReport). Auth: reuse the service account the way .secrets/ga-admin.mjs does (read that helper for the interface; never print, copy or commit key material; .secrets stays git-ignored). Funnel definitions live in one data structure that mirrors C12b §8 so the doc and the script stay in step.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 scripts/ga-funnels.mjs builds valid runFunnelReport bodies for all 8 C12b §8 funnels (unit test on the request bodies, node --test, no live call) and formats a fixture response into the drop-off table
- [ ] #2 Read-only: only runFunnelReport/runReport calls; no Admin API writes; no key material in the repo or the output
- [ ] #3 --md writes a Markdown report (one table per funnel, date range in the heading); README line in scripts/ or docs/tech how to run it
<!-- AC:END -->
