---
id: TASK-29.4
title: 'Web lost flow: signed-out draft hand-off and confirmation screen'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-29.3
  - TASK-9.3
  - TASK-29.1
  - TASK-33.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C3-auth-profiles-roles.md
  - docs/design/pages/P6-report-lost.md
  - docs/design/pages/P15-support-moments.md
parent_task_id: TASK-29
priority: high
ordinal: 202000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Visitors fill the form first and sign up at the end without losing anything; the confirmation hosts next steps and the optional contribution slot (FR-005 R-005.2, R-005.4).

## Packet

Unblocks on: Web report-lost flow merged (TASK-29.3); Web sign-in, sign-up, verification, reset, account page and guards merged (TASK-9.3); Design: Report lost flow (P6) approved (TASK-29.1); Design: Support moments: tip and contribution (P15) approved (TASK-33.1)
Design: P6 docs/design/pages/P6-report-lost.md (mockup docs/design/mockups/P6-report-lost.html; TASK-29.1); P15 docs/design/pages/P15-support-moments.md (mockup docs/design/mockups/P15-support-moments.html; TASK-33.1)
Copy: docs/content/pages/P6-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report); docs/content/pages/P15-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report)
Contracts: C3 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-29.4-lost-web-confirm
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A signed-out visitor's draft (fields and photos) survives sign-in or sign-up and is submitted afterwards without data loss (Playwright).
- [ ] #2 The confirmation screen shows next steps (poster, share, alerts, tips) and a collapsed, never pre-selected support-contribution slot, with no ad.
- [ ] #3 The report appears on the map and list within a minute of submit on the local stack (with db:drain).
<!-- AC:END -->
