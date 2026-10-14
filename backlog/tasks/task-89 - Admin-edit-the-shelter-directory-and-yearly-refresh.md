---
id: TASK-89
title: 'Admin: edit the shelter directory and yearly refresh'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 23:07'
labels:
  - story
  - 'req:FR-044'
milestone: m-2
dependencies:
  - TASK-88
  - TASK-34
priority: low
ordinal: 273000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The directory changes (new shelters, new municipal contracts); admins need to correct it and be reminded to refresh it every year after 31 March.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an admin, when they edit a shelter or the municipality assignments, then the change is validated, saved with the source, audit-logged and visible in the app at once.
- [ ] #2 Given the yearly cycle, when 1 April passes, then admins see a reminder with the list of entries older than 12 months.
- [ ] #3 Given a CSV, when imported, then a dry run shows changes before they apply.
<!-- AC:END -->

## Packet

Unblocks on: directory data model and API (TASK-88); admin layout and audit log (TASK-34)
