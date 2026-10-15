---
id: TASK-13.3
title: Mobile consent sheet and settings entry
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 16:06'
labels:
  - fe
  - 'est:S'
milestone: m-0
dependencies:
  - TASK-12.2
  - TASK-7.3
  - TASK-13.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P17-consent.md
  - docs/tech/contracts/C12-analytics-consent.md
parent_task_id: TASK-13
priority: high
ordinal: 146000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The app needs the same opt-in choice before Firebase Analytics collects anything (FR-039).

## Packet

Unblocks on: Mobile shell: tabs, Report action, permission primer, settings stack merged (TASK-12.2); Firebase Analytics on mobile with consent merged (TASK-7.3); Design: Consent banner and preferences (P17) approved (TASK-13.1)
Design: P17 docs/design/pages/P17-consent.md (mockup docs/design/mockups/P17-consent.html; TASK-13.1)
Copy: docs/content/pages/P17-consent.md
Contracts: C12 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-13.3-consent-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On first launch a sheet offers Accept all, Reject all and Customise with equal weight and nothing pre-selected, per P17.
- [ ] #2 The choice (with version and timestamp) is stored in secure storage and applied to Firebase consent at once; rejection keeps collection off.
- [ ] #3 Settings → Consent changes or withdraws the choice as easily as it was given.
- [ ] #4 Screen-reader labels and focus order are verified; a version bump or 12 months re-asks.
<!-- AC:END -->
