---
id: TASK-32.3
title: Mobile checkout hand-off and My payments
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-15 21:52'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-12.2
  - TASK-9.4
  - TASK-12.3
  - TASK-6.10
  - TASK-33.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C13-payments.md
  - docs/design/pages/P15-support-moments.md
parent_task_id: TASK-32
priority: medium
ordinal: 210000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mobile opens web checkout in this phase (A-014); no native purchase UI.

## Packet

Unblocks on: Mobile shell: tabs, Report action, permission primer, settings stack merged (TASK-12.2); Mobile sign-in, sign-up, verification, reset and profile merged (TASK-9.4); Deep links (App Links, universal links) and push token registration path merged (TASK-12.3); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); Design: Support moments: tip and contribution (P15) approved (TASK-33.1)
Design: P15 docs/design/pages/P15-support-moments.md (mockup docs/design/mockups/P15-support-moments.html; TASK-33.1)
Copy: docs/content/pages/P15-support-moments.md
Contracts: C13 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-32.3-payments-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Starting a payment opens web checkout with expo-web-browser openAuthSessionAsync and returns through zivali://payments/return to a result screen.
- [ ] #2 Settings → Payments lists the user's payments.
- [ ] #3 No native purchase UI exists; the mock provider works end to end on an Android dev build.
<!-- AC:END -->
