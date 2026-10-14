---
id: TASK-33.3
title: 'Mobile support ask: reunited tip, lost-report contribution, profile card'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-14 22:43'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-26.5
  - TASK-29.6
  - TASK-32.3
  - TASK-7.1
  - TASK-33.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C13-payments.md
  - docs/design/pages/P15-support-moments.md
  - docs/tech/contracts/C12-analytics-consent.md
parent_task_id: TASK-33
priority: medium
ordinal: 212000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Most reunions are marked on a phone (FR-021).

## Packet

Unblocks on: Mobile My reports, owner actions and reunited screen merged (TASK-26.5); Mobile lost flow: signed-out draft hand-off and confirmation screen merged (TASK-29.6); Mobile checkout hand-off and My payments merged (TASK-32.3); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Support moments: tip and contribution (P15) approved (TASK-33.1)
Design: P15 docs/design/pages/P15-support-moments.md (mockup docs/design/mockups/P15-support-moments.html; TASK-33.1)
Copy: docs/content/pages/P15-support-moments.md
Contracts: C13, C12 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-33.3-support-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The reunited screen offers EUR 3, EUR 5 (highlighted, not pre-selected), EUR 10 and a custom amount (minimum EUR 2) with Skip as visible as Pay, per P15; payment opens web checkout.
- [ ] #2 The lost-report confirmation shows the same optional ask, collapsed by default, nothing pre-selected, and not shown again for that report once skipped.
- [ ] #3 The profile screen shows a "Pomagajte nam izboljšati Najdimo" card with the same amounts (purpose support) and the monthly Podpornik option only when the podpornik feature flag is on (FR-022, M4); no nagging or repeated prompts.
- [ ] #4 Wording is podpora/prispevek (support/contribution), never charitable donation; anonymous finders see no tip flow.
- [ ] #5 A completed contribution shows a warm thank-you and fires donation with value, currency, amount_bucket and purpose only, with consent; ignoring any ask never blocks or delays reporting, matching or alerts.
<!-- AC:END -->
