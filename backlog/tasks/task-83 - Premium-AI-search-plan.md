---
id: TASK-83
title: 'Premium AI: search plan'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-19 14:33'
labels:
  - story
  - 'req:FR-026'
  - 'req:NFR-AI'
milestone: m-3
dependencies:
  - TASK-52
  - TASK-40
  - TASK-18
  - TASK-31
priority: medium
ordinal: 174000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A lost-pet owner in panic does not know where to search; Premium gives species and behaviour-based guidance for the first hours and days, with a heatmap of sightings in the search area (owner 2026-10-19). Sightings on the public map and the trail stay free; the heatmap is the extra analysis.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a Premium user with an open lost report, when they open Search plan, then a localised plan is generated from species, age, temperament notes, time since loss and area type (where to search, when, what to bring, who to tell).
- [ ] #2 Given the plan, when displayed, then it is advice only, uses no exact location and links to poster, share and alerts.
- [ ] #3 Given a free user, when they open the screen, then a short generic checklist is shown and Premium adds the personalised plan.
- [ ] #4 Given AI caps or no key, when unavailable, then the generic checklist remains.
- [ ] #5 Given a Premium owner with an open lost report and 3 or more same-species FOUND or SIGHTED reports in the search area since the loss, when they open the search plan, then a heatmap built from fuzzed public positions only (cells at least 250 m, weighted by match score and recency, linked sightings highlighted, not-my-pet excluded) is shown with a ranked list of the top areas (count, latest time) as the accessible alternative.
- [ ] #6 Given fewer than 3 sightings, when the search plan opens, then the list of sightings with a not-enough-sightings note replaces the heatmap.
- [ ] #7 Given a free user, when they open the map or a report, then every sighting and the trail show as before and no heatmap layer or request exists.
- [ ] #8 Given repeated opens, when the heatmap is requested, then it is computed from our DB with no AI call and refreshed at most every 15 min per report or on a new linked sighting; plan generations are capped at 5 per report per day (R-026.9).
<!-- AC:END -->

## Packet

Unblocks on: hasEntitlement (TASK-52); AI service (TASK-40); report data on the detail model (TASK-18); map layer API of the shared map component and the fuzzed public positions (TASK-31)

Heatmap weighting and the linked-sighting highlight read match suggestions and confirmations (C8 matching contract), not the sighting trail, so there is no dependency on TASK-50. Heatmap contract: CHANGE to the tech lead (C6). Caps: R-026.9.
