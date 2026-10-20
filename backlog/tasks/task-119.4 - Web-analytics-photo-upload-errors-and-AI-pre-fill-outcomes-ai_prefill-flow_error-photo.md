---
id: TASK-119.4
title: >-
  Web analytics: photo upload errors and AI pre-fill outcomes (ai_prefill,
  flow_error photo)
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 23:51'
updated_date: '2026-10-20 00:36'
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
  - docs/tech/contracts/C12b-analytics-tracking-plan.md§5. AI pre-fill (C19)
  - docs/tech/contracts/C12b-analytics-tracking-plan.md§3. Flows and steps
  - >-
    docs/tech/contracts/C12b-analytics-tracking-plan.md§4. Errors (where people
    get stuck)
parent_task_id: TASK-119
priority: high
ordinal: 515200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Photo and AI pre-fill instrumentation in the shared pieces, so the lost and found tasks only pass their flow name. Files owned: apps/web/components/ai/** (use-prefill.ts, ai-parts.tsx), apps/web/components/photos/** (photo-picker.tsx, use-photo-uploads.ts), apps/web/components/pets/pet-form.tsx and their tests. Do not edit report-lost or report-found files (TASK-119.5 and TASK-119.6 pass the new option there).

Use the flowTracker / track() from @zivali/analytics (TASK-119.2); never send a file name, size, EXIF or any AI value, only the outcome. No new copy.

## Packet
Unblocks on: TASK-119.2 (registry: ai_prefill, flow_error, flowTracker)
Branch: agent/TASK-119.4-analytics-photos-ai
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 usePrefill and useFormPrefill take an optional analytics flow (report_lost | report_found | pet) and, when set, send ai_prefill once per first-photo check with outcome filled, empty, unavailable, timeout or error, then at most once each confirmed and edited per photo; nothing when the flow is not set or ai.enabled is false
- [x] #2 PhotoPicker takes an optional analytics flow and step and, when set, sends one flow_error per failed or refused photo with error_field photo and error_code too_large, file_type, upload_failed, NETWORK or RATE_LIMITED
- [x] #3 The pet form (components/pets/pet-form.tsx) passes flow pet and step form; lost and found flows are wired by their own tasks
- [ ] #4 Component tests on the mock adapter cover each outcome and a photo failure, and that nothing is recorded without consent; pnpm verify passes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TASK-119.4: usePrefill/useFormPrefill take analytics (flow); PhotoPicker takes analytics { flow, step }; pet form wired (pet/form). Photo codes: UPLOAD_SIZE too_large, UPLOAD_TYPE/HEIC file_type, TOO_SMALL invalid (CHANGE row on C12b §3), failed/captcha upload_failed, NETWORK, RATE_LIMITED; the 5-photo cap sends nothing. Touched tests pass (use-prefill 16, photo-picker 32); AC 4's pnpm verify runs at merge (no full suite in the worktree).
<!-- SECTION:NOTES:END -->
