---
id: TASK-90
title: 'Public shelter pages /zavetisca/{slug}'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 23:07'
labels:
  - story
  - 'req:FR-044'
  - 'req:NFR-SEO'
milestone: m-2
dependencies:
  - TASK-88
  - TASK-11
priority: medium
ordinal: 274000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Searches for the shelter of a municipality are frequent and poorly answered; a public page per shelter helps owners and finders and is the strongest SEO asset of the product.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a shelter, when /zavetisca/{slug} is opened, then it shows name, address, phone with a call button, opening hours, municipalities served, a link to report found or lost, and the latest verified date, in SL and EN.
- [ ] #2 Given a crawler, when the page is fetched, then it is server-rendered with valid AnimalShelter structured data and appears in the sitemap.
- [ ] #3 Given the shelter directory index /zavetisca, when opened, then it lists shelters and a municipality search.
- [ ] #4 Given content flags, when legal timings are not yet confirmed, then no legal duty text is shown on these pages.
<!-- AC:END -->

## Packet

Unblocks on: directory API (TASK-88); public layout (TASK-11)
