---
id: TASK-80
title: >-
  Vet Partner visibility: featured slot, alert and poster mention, monthly
  report
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 22:10'
labels:
  - story
  - 'req:FR-028'
milestone: m-3
dependencies:
  - TASK-79
  - TASK-35
  - TASK-36
  - TASK-23
  - TASK-24
priority: medium
ordinal: 110000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The plan only has value if clinics get visible and can see results; this builds featured placement, regional mentions and reporting on the ads infrastructure.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a Vet Partner clinic, when a nearest-vet slot is requested in its municipality or region, then the clinic is returned ahead of other ads, rotating fairly between partners in the same area, labelled Oglas, and without a partner a sponsor or house ad is used.
- [ ] #2 Given a lost-pet alert or poster for a region with a partner, when generated, then it includes one line Need help? Nearest vet with the nearest partner clinic name and phone link, never inside the report-lost flow itself, and alerts and posters work unchanged without a partner.
- [ ] #3 Given each month ends, when the report runs, then the clinic owner gets profile views, clicks, ad impressions and reunions in the area in the portal and by email as PDF and CSV, aggregate only, with values under 5 shown as under 5.
- [ ] #4 Given a lapsed plan, when the period ends, then featured placement and mentions stop within 1 hour.
- [ ] #5 Given the counts, when computed, then they come from our DB without personal data or cookies.
<!-- AC:END -->

## Packet

Unblocks on: active-plan flag and clinic profile (TASK-79); getAd contract and counts (TASK-35); nearest-vet slot (TASK-36); alert text template (TASK-23); poster template (TASK-24)
