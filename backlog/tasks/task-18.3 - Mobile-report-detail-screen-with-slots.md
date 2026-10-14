---
id: TASK-18.3
title: Mobile report detail screen with slots
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-12.2
  - TASK-15.4
  - TASK-6.9
  - TASK-18.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/design/pages/P9-report-detail.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-18
priority: high
ordinal: 164000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deep links, matches, chat and sharing all land on the report screen in the app (FR-007).

## Packet

Unblocks on: Mobile shell: tabs, Report action, permission primer, settings stack merged (TASK-12.2); Mobile MapView: MapLibre React Native, markers, clusters, areas, list alternative merged (TASK-15.4); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Report detail (lost, found, sighted) (P9) approved (TASK-18.1)
Design: P9 docs/design/pages/P9-report-detail.md (mockup docs/design/mockups/P9-report-detail.html; TASK-18.1)
Copy: docs/content/pages/P9-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report)
Contracts: C4, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-18.3-detail-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 app/r/[code] shows the same content as web from get_public_report in the P9 mobile layout, with the fuzzed area map.
- [ ] #2 The same named slots exist as components so later tasks fill them without layout changes.
- [ ] #3 Gone and not-found states are clear; the screen opens from deep links (C15).
- [ ] #4 Screen-reader order and labels are verified on Android; photos have alt text.
<!-- AC:END -->
