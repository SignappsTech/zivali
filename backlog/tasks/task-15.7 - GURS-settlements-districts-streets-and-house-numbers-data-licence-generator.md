---
id: TASK-15.7
title: >-
  GURS settlements, districts, streets and house numbers: data, licence,
  generator
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-15 00:11'
updated_date: '2026-10-15 01:49'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C6-location-geo-maps.md
  - docs/tech/adr/007-maps-and-geocoding.md
  - supabase/seed/geo/LICENSE.md
parent_task_id: TASK-15
priority: high
ordinal: 294000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Place search and the area label in the picker run on our own geocoder (ADR-007 revised: MapTiler Free is non-commercial and sending exact points to a third party is a privacy risk, LQ-21). This task produces the dated GURS snapshot it needs, like TASK-6.1 did for municipalities. Pure data work, independent of the stack.

Sources (WFS, CC BY 4.0, counts on 2026-10-15): `SI.GURS.RPE:NASELJA` 6,035, `SI.GURS.RPE:CETRTNE_SKUPNOSTI` 65 and `SI.GURS.RPE:ULICE` 10,499 from https://ipi.eprostor.gov.si/wfs-si-gurs-rpe/wfs; `SI.GURS.KN:HISNE_STEVILKE` 580,251 from https://ipi.eprostor.gov.si/wfs-si-gurs-kn/wfs (page with count=20000 and startIndex); `SI.GURS.RPE:OBCINE` attributes for EID_OBCINA to SIFRA. Request outputFormat=application/json and srsName=EPSG:4326.

## Packet

Unblocks on: nothing (ready now)
Contracts: C6 §Geocoder (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-15.7-gurs-places
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Settlements, city districts, streets and house numbers are downloaded from the GURS WFS layers in the description; supabase/seed/geo/LICENSE.md gains their source, data type, data-state date, licence (CC BY 4.0), the changes made and SL/EN attribution lines for place search, and the reproduce steps.
- [ ] #2 scripts/geo-places.mjs writes a deterministic gzipped snapshot to supabase/seed/geo/ with the C6 fields: places (GURS EID as id, kind, name with district prefixes such as 'Četrtna skupnost' stripped and all-caps or lower-case names normalised, alt_name from NAZIV_DJ, normalisePlace search text, municipality id = GURS SIFRA, settlement id for streets, weight = house-number count, inner point or a point on the street, settlement and district polygons simplified to about 5 %) and addresses (place id, number, suffix, point); committed files total at most 8 MB; Node stdlib only (node:zlib), mapshaper one-off through npx as in TASK-6.1.
- [ ] #3 node --test checks counts against the numbers recorded in LICENSE.md, unique ids, valid polygons, that every street and address links to an existing place and municipality, that normalisePlace matches the C6 definition, and that 'Trubarjeva cesta 5' in Ljubljana, the district 'Šiška' and one village address without streets resolve to the expected points.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
CHANGE from content (TASK-91): supabase/seed/geo/LICENSE.md must include SL/EN search-attribution lines that match content key location.search_attribution (P5).
<!-- SECTION:NOTES:END -->
