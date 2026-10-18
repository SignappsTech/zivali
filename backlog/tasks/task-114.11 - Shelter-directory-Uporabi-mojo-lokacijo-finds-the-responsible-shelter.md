---
id: TASK-114.11
title: 'Shelter directory: "Uporabi mojo lokacijo" finds the responsible shelter'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 14:55'
updated_date: '2026-10-18 04:25'
labels:
  - fe
  - 'est:S'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 361100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: the shelters page (/zavetisca, /en/shelters) should also offer "use my location".

Today: apps/web/app/[locale]/(public)/shelters/page.tsx (P3 T5) has only the municipality search (components/shelters/shelter-search.tsx), which loads the answer for the chosen municipality (shelter-answer.tsx, GET /v1/shelters/responsible?municipality=).

Pieces that exist: the browser geolocation pattern in components/browse/browse.tsx and components/location/location-picker.tsx (permission handling, errors), and the reverse geocoder (`useReversePlaceQuery`, POST /v1/geo/reverse) which returns `municipality_slug` and a label (packages/validation geo.schema.ts).

Wanted: a "Uporabi mojo lokacijo" / "Use my location" button by the municipality search: get the position (coarse is enough), reverse-geocode it, set the municipality and show its responsible-shelter answer, with the municipality name in the field. Denied permission, no fix, or outside Slovenia (reverse returns null): a short message, the search stays usable. The position is not stored or sent to analytics (as in the location picker, C6). Optional: sort the full shelter list below by distance once a position is known.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The button on /zavetisca and /en/shelters fills the municipality from the device location and shows its responsible shelter
- [ ] #2 Denied, unavailable, timeout and outside-Slovenia cases show a message and leave the search usable; SL and EN
- [ ] #3 The position is neither stored nor sent anywhere but the reverse lookup; the page stays server-rendered without it
- [ ] #4 Unit tests with a mocked geolocation; e2e (Playwright geolocation permission) for the happy path
<!-- AC:END -->

## Packet

Branch: agent/TASK-114.11-shelters-use-my-location
