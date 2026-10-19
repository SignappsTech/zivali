---
id: TASK-115.12
title: 'Web: home map teaser shows Slovenia, not made-up streets'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 14:25'
updated_date: '2026-10-19 18:37'
labels:
  - fe
  - 'est:S'
dependencies: []
references:
  - docs/design/wireframes/P3-home.html
  - docs/tech/frontend.md
parent_task_id: TASK-115
priority: high
ordinal: 420200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-19 (chat, approved): the homepage B map teaser (TASK-115.10/115.11) draws made-up streets, a park and a river, and when the recent reports are close together they merge into one '6' disc, so it says nothing and looks odd. Replace the decorative background with a simplified outline of Slovenia (public-domain source, e.g. Natural Earth admin-0, simplified to a few KB inline SVG), a few main town labels (Ljubljana, Maribor, Celje, Kranj, Koper, Novo mesto, Murska Sobota, Nova Gorica), and the pins at their real rough positions (the same public, fuzzed area the cards use; never exact coordinates). Overlapping pins still cluster with a count, labelled by town where possible. If all pins fall in one small area, show a zoomed region instead of the whole country so they separate. Still no map library on the homepage (TASK-112 budget); the whole teaser stays a link to /zemljevid.

## Packet

Unblocks on: -
Design: docs/design/wireframes/P3-home.html Option B (map teaser block); tokens map-land, map-water, marker-*; no layout change
Review: tech-lead code review (full mode)
Branch: agent/task-115.12-teaser-slovenia
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The teaser shows a recognisable Slovenia outline with town labels and pins at their real rough positions, light and dark, 1440 and 390
- [ ] #2 Clusters keep a count; a concentrated set zooms to its region; no exact coordinates in the DOM; no map library loaded
- [ ] #3 Unit tests for the projection (lat/lng to SVG) and the zoom choice; e2e smoke still passes
<!-- AC:END -->
