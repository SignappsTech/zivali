---
id: TASK-80
title: >-
  Vet Partner visibility: featured slot, alert and poster mention, monthly
  report
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 22:10'
updated_date: '2026-10-14 23:08'
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
- [ ] #1 Given each month ends, when the report runs, then the clinic owner gets profile views, clicks, ad impressions and reunions in the area in the portal and by email as PDF and CSV, aggregate only, with values under 5 shown as under 5.
- [ ] #2 Given a lapsed plan, when the period ends, then featured placement and mentions stop within 1 hour.
- [ ] #3 Given the counts, when computed, then they come from our DB without personal data or cookies.
- [ ] #4 Owners can switch off the Vet Partner line on their own poster (any user, not a Premium perk); the poster renders cleanly without it
- [ ] #5 Given a Vet Partner clinic, when a vet slot is requested in its municipality or region, then the clinic is returned ahead of other ads, rotating fairly between partners in the same area, always labelled Oglas, titled Veterinar v vaši regiji (never nearest unless it truly is), with a Kako razvrščamo link explaining the ranking rules.
- [ ] #6 Given a lost-pet poster for a region with a partner, when generated, then it includes one line labelled Oglas with the partner clinic name and phone link and never inside the report-lost flow; alerts by push or email carry no paid vet line unless the user gave marketing consent; posters and alerts work unchanged without a partner.
<!-- AC:END -->

## Packet

Unblocks on: active-plan flag and clinic profile (TASK-79); getAd contract and counts (TASK-35); nearest-vet slot (TASK-36); alert text template (TASK-23); poster template (TASK-24)
