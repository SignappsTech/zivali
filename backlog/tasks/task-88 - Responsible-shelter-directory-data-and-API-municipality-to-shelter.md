---
id: TASK-88
title: 'Responsible-shelter directory: data and API (municipality to shelter)'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 23:07'
labels:
  - story
  - 'req:FR-044'
milestone: m-1
dependencies:
  - TASK-6
priority: high
ordinal: 272000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners and finders have legal duties towards the responsible shelter of their municipality (212 municipalities, 17 registered shelters); one directory powers the post-submit checklists, the call buttons and the public shelter pages.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a point or municipality, when the directory is queried, then it returns the responsible shelter (name, address, phone, opening hours, website, source and last-verified date) in one call usable by web, mobile and the offline cache.
- [ ] #2 Given the seed data, when loaded, then all 212 municipalities map to one of the 17 registered shelters from the veterinary administration register plus municipal reports, with the source and date recorded.
- [ ] #3 Given a municipality without a confirmed shelter, when queried, then the API says so and the UI falls back to a generic notice, never a wrong number.
- [ ] #4 Given the data, when changed, then every change is versioned and the data is public and contains no personal data.
<!-- AC:END -->

## Packet

Unblocks on: shelter and municipality tables, lookup contract and seed fixtures (TASK-6)
