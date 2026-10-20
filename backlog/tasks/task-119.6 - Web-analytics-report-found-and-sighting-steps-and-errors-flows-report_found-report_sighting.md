---
id: TASK-119.6
title: >-
  Web analytics: report-found and sighting steps and errors (flows report_found,
  report_sighting)
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 23:52'
updated_date: '2026-10-20 10:09'
labels:
  - fe
  - 'est:S'
  - no-design
  - web
milestone: m-1
dependencies:
  - TASK-119.2
  - TASK-119.4
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C12b-analytics-tracking-plan.md§3. Flows and steps
  - >-
    docs/tech/contracts/C12b-analytics-tracking-plan.md§4. Errors (where people
    get stuck)
  - docs/tech/contracts/C12-analytics-consent.md§Event registry
parent_task_id: TASK-119
priority: high
ordinal: 517200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Drop-off and stuck points in the P7 report-found flow and the sighting path. Files owned: apps/web/components/report-found/** (found-flow.tsx, found-done.tsx, found-form.ts, their tests). One flowTracker per mounted flow in a ref (report_found or report_sighting by the linked report), hooked into the existing step change and error paths. No new copy, no layout change.

## Packet
Unblocks on: TASK-119.2 (registry and flowTracker); TASK-119.4 (analytics flow option on PhotoPicker and usePrefill)
Branch: agent/TASK-119.6-analytics-report-found
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 flow_step fires once each time a step shows: flow report_found with FOUND_STEPS (photo, what, where, situation, send), flow report_sighting with SIGHTING_STEPS (where, when, extra) for a linked report, including the first and a restored step; send and extra carry species when known
- [ ] #2 A refused Naprej sends one flow_error with the first invalid field and its C12b §4 code; a refused send on the last step sends its C1 code (VALIDATION with its field, CAPTCHA_FAILED, RATE_LIMITED, NETWORK, …); never a value, email or message
- [ ] #3 The PhotoPicker and usePrefill calls pass analytics flow report_found (step photo); report_found_start and report_found_submit keep working as today
- [ ] #4 Component tests in found-flow.test.tsx assert the mock events for a found report, a sighting, one refused step and a refused send, and nothing without consent; pnpm verify passes
<!-- AC:END -->
