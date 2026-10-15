---
id: TASK-86.2
title: >-
  Mobile queue UI: waiting to send, sent, failed with retry or delete, sign-out
  prompt
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:39'
updated_date: '2026-10-15 21:52'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-86.1
  - TASK-9.4
  - TASK-12.2
  - TASK-30.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C17-mobile-offline-data.md
  - docs/design/pages/P7-report-found.md
parent_task_id: TASK-86
priority: medium
ordinal: 266000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
People need to see that their report is waiting, sent or stuck, and must never lose a queued report silently (FR-042 R-042.1, R-042.3).
## Packet
Unblocks on: Mobile outbox engine: queued found and sighting submissions sent once merged (TASK-86.1); Mobile sign-in, sign-up, verification, reset and profile merged (TASK-9.4); Mobile shell: tabs, Report action, permission primer, settings stack merged (TASK-12.2); Design: Report found or sighted (no account) and manage page (P7) approved (TASK-30.1)
Design: P7 docs/design/pages/P7-report-found.md (TASK-30.1); offline states requested from the design lead (CHANGE)
Copy: docs/content/pages/P7-report-found.md (add offline-state keys as SL/EN drafts if missing and list them)
Contracts: C17 (in references); ADR-019
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-86.2-outbox-ui
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Queued reports appear as "Waiting to send" (Profile → My reports and a small banner on the Map tab), switch to "Sent" with the manage link when delivered, and show the failure reason with Retry and Delete when stuck.
- [ ] #2 Sign-out and account deletion first offer "Send now", "Delete" or "Cancel" when items are pending (C17 wipe), per FR-042 AC#4.
- [ ] #3 States are announced to screen readers; Android screenshots for queued, sent and failed are attached.
<!-- AC:END -->
