---
id: TASK-20.4
title: 'Mobile match review: compare, confirm, reject'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-14 22:42'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-18.3
  - TASK-9.4
  - TASK-6.9
  - TASK-7.1
  - TASK-20.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C8-matching.md
  - docs/design/pages/P11-match-review.md
  - docs/tech/contracts/C12-analytics-consent.md
parent_task_id: TASK-20
priority: high
ordinal: 188000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners usually get the match push on their phone and decide there (FR-008).

## Packet

Unblocks on: Mobile report detail screen with slots merged (TASK-18.3); Mobile sign-in, sign-up, verification, reset and profile merged (TASK-9.4); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Match review (P11) approved (TASK-20.1)
Design: P11 docs/design/pages/P11-match-review.md (mockup docs/design/mockups/P11-match-review.html; TASK-20.1)
Copy: docs/content/pages/P11-match-review.md
Contracts: C8, C12 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-20.4-matchreview-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The matches screen lists ranked suggestions with photo comparison, distance band, time gap, reasons and strength label, per P11.
- [ ] #2 Confirm opens the chat; Reject asks for an optional reason and hides the suggestion for good.
- [ ] #3 Chip matches are labelled strongest with the privacy note; the empty state explains matching is running.
- [ ] #4 match_suggested and match_confirmed fire with consent only; screen-reader labels verified.
<!-- AC:END -->
