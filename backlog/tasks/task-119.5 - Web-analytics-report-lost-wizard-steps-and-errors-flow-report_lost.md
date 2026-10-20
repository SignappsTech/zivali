---
id: TASK-119.5
title: 'Web analytics: report-lost wizard steps and errors (flow report_lost)'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 23:52'
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
ordinal: 516200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Drop-off and stuck points in the P6 report-lost flow. Files owned: apps/web/components/report-lost/** (lost-flow.tsx, lost-done.tsx, resume-dialog.tsx, their tests). Keep one flowTracker(report_lost) per mounted flow in a ref; hook it into the existing step change (go/advance) and the existing error paths (next() validation, failed()). No new copy, no layout change.

## Packet
Unblocks on: TASK-119.2 (registry and flowTracker); TASK-119.4 (analytics flow option on PhotoPicker and useFormPrefill)
Branch: agent/TASK-119.5-analytics-report-lost
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 flow_step { flow: report_lost, step } fires once each time a step shows (pet, photos, details, where, when, what, review), including the first step and a step restored from a draft; review carries species; auth_gate fires when Publish opens the sign-up dialog for a signed-out owner
- [ ] #2 A refused Naprej sends one flow_error with the first invalid STEP_FIELDS key and its C12b §4 code (photos with no photo: photo/required); a refused publish on review sends its C1 code (DUPLICATE_OPEN_REPORT, VALIDATION with its field, RATE_LIMITED, NETWORK, …); never a value or message
- [ ] #3 The PhotoPicker and useFormPrefill calls pass analytics flow report_lost (step photos); report_lost_start and report_lost_submit keep working as today
- [ ] #4 Component tests in lost-flow.test.tsx assert the mock events for the new-pet and saved-pet paths, one refused step and a refused publish, and nothing without consent; pnpm verify passes
<!-- AC:END -->
