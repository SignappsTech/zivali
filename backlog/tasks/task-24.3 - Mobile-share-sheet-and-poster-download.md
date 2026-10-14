---
id: TASK-24.3
title: Mobile share sheet and poster download
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-18.3
  - TASK-7.1
  - TASK-24.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P18-poster-share.md
  - docs/tech/contracts/C15-routes-deeplinks.md
  - docs/tech/contracts/C12-analytics-consent.md
parent_task_id: TASK-24
priority: medium
ordinal: 196000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Sharing into WhatsApp and Facebook happens on phones (FR-011).

## Packet

Unblocks on: Mobile report detail screen with slots merged (TASK-18.3); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Poster and sharing (P18) approved (TASK-24.1)
Design: P18 docs/design/pages/P18-poster-share.md (mockup docs/design/mockups/P18-poster-share.html; TASK-24.1)
Copy: docs/content/pages/P18-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report)
Contracts: C15, C12 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-24.3-share-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The share slot opens the native share sheet with localised text and the short link, per P18.
- [ ] #2 Poster downloads the web PDF (expo-file-system) and offers it through expo-sharing.
- [ ] #3 share and poster_download fire with consent only.
<!-- AC:END -->
