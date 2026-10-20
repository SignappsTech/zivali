---
id: TASK-119.9
title: >-
  Web analytics: shelter directory search, map and list browse, partner enquiry
  lead (generate_lead)
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 23:54'
updated_date: '2026-10-20 00:51'
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
ordinal: 520200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Directory, map and partner funnels. Files owned: apps/web/components/shelters/** (shelter-search.tsx, shelter-answer.tsx, shelter-row.tsx), apps/web/components/browse/**, apps/web/components/map/map-view.tsx (only if the report open from a pin lives there), apps/web/components/partners/enquiry-form.tsx, and their tests. No new copy, no layout change.

## Packet
Unblocks on: TASK-119.2 (registry: generate_lead, flow events)
Branch: agent/TASK-119.9-analytics-shelters-browse-partners
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 shelter_search: flow_step search when a municipality is chosen or located, answer when a responsible shelter shows, no_answer when none (these three carry municipality), contact when its phone, email or website is pressed; flow_error on location_unavailable, permission_denied, NETWORK; never the typed text
- [ ] #2 browse: flow_step filter when filters are applied (species and report_type only when exactly one is chosen), report_open when a report is opened from the map or the list
- [ ] #3 partner_enquiry: flow_step form on the first interaction with the enquiry form (once), generate_lead { lead_type } on success, one flow_error per refused submit (field key and code, CAPTCHA_FAILED, RATE_LIMITED, NETWORK); never company, name, email, phone or message
- [ ] #4 The public shelter search keeps its bundle rules (no @zivali/api hooks, frontend.md §Standards); component tests on the mock adapter cover each event and nothing without consent; pnpm verify passes
<!-- AC:END -->
