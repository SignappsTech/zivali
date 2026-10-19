---
id: TASK-18.13
title: >-
  Web P9 and home cards: area_label, posted-by line, owner-disagree note, reopen
  days from config (C4; CH-304, CH-341, CH-422, CH-547, CH-561)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:34'
labels:
  - fe
  - 'est:M'
  - web
dependencies:
  - TASK-18.12
  - TASK-26.10
  - TASK-18.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md§Public read model
  - docs/design/pages/P9-report-detail.md
  - docs/content/pages/P9-report-detail.md
parent_task_id: TASK-18
priority: medium
ordinal: 492200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Uses the C4 read-model additions. Drops the web server's reverse-geocoding of public points and the hard-coded reopen window.

## Packet
Unblocks on: TASK-18.12 (area_label, source, reunited_via) and TASK-26.10 (public lifecycle.reopen_days) merged; design TASK-18.1 done
Branch: agent/task-18.13-web-p9-area-label-posted-by
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The detail page (title, area line, description, OG alt, JSON-LD) and the homepage cards name the area from `area_label`; lib/report.ts getPlace, its LRU and every POST /v1/geo/reverse call from the web server go; a null label shows no area line
- [ ] #2 The facts show the posted-by line from `source`: anonymous found → `report.posted_by_finder`, anonymous sighted → `report.posted_by_sighter`; no line for a user's report (no display name is public, C4)
- [ ] #3 A reunited report with `reunited_via: 'counterpart'` shows `report.owner_disagree` with Reopen to its manager within the reopen window; 'self' shows no note
- [ ] #4 The lifecycle `{days}` copy and the Reopen offer read `lifecycle.reopen_days` from GET /v1/config/public (7 while loading); the REOPEN_DAYS constant goes; unit and e2e tests updated
<!-- AC:END -->
