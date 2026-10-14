---
id: TASK-45
title: Shelter portal shell and animals dashboard
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:04'
labels:
  - story
  - 'req:FR-015'
milestone: m-2
dependencies:
  - TASK-44
  - TASK-8
  - TASK-11
priority: high
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shelters work on desktop; a calm, efficient web portal with a list of their animals and statuses is the base for upload, matches and chip lookup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a member of a verified organisation, when they open the portal, then a dashboard shows counts (animals in care, new matches, outcomes this month) and an animals table with filters, sort and search.
- [ ] #2 Given an animal, when opened, then notes, holding start date and status (in care, returned to owner, adopted, transferred) can be updated and outcome changes are logged.
- [ ] #3 Given per-organisation holding-period days (rules to be confirmed, Q-006), when configured, then the portal shows days in care and a reminder, and the app never asserts legal rules itself.
- [ ] #4 Given a viewer role, when logged in, then all data is read-only.
- [ ] #5 Given desktop and tablet, when used, then the layout is responsive, SL and EN, keyboard friendly and meets WCAG 2.2 AA.
<!-- AC:END -->

## Packet

Unblocks on: organisation membership guard (TASK-44); primitives (TASK-8); portal route group (TASK-11)
