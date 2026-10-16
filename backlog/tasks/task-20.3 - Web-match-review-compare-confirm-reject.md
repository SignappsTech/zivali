---
id: TASK-20.3
title: 'Web match review: compare, confirm, reject'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-16 05:30'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-18.2
  - TASK-9.3
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
ordinal: 187000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A suggestion is only useful if the owner can judge it fast and act (FR-008).

## Packet

Unblocks on: Web report detail /r/[code]: SSR, slots, OG image, JSON-LD, 410 merged (TASK-18.2); Web sign-in, sign-up, verification, reset, account page and guards merged (TASK-9.3); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Match review (P11) approved (TASK-20.1)
Design: P11 docs/design/pages/P11-match-review.md (mockup docs/design/mockups/P11-match-review.html; TASK-20.1)
Copy: docs/content/pages/P11-match-review.md
Contracts: C8, C12 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-20.3-matchreview-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /r/[code]/matches lists suggestions ranked with photo comparison, distance band, time gap, reasons and a strength label (not only a percentage), per P11.
- [ ] #2 Confirm opens the chat and notifies both sides; Reject asks for an optional reason and hides the suggestion for good.
- [ ] #3 Chip matches are labelled as the strongest match with the note that no personal data is shared until confirmation; an empty state explains matching is running and offers poster, share and alerts.
- [ ] #4 match_suggested (on view) and match_confirmed fire with species, region and match_source only, and only with consent (mock adapter assertions).
- [ ] #5 Keyboard and screen-reader users can compare and act; axe 0 violations.
<!-- AC:END -->
