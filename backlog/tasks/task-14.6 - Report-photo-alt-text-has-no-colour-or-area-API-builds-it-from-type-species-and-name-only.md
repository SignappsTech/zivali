---
id: TASK-14.6
title: >-
  Report photo alt text has no colour (or area): API builds it from type,
  species and name only
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-16 03:36'
updated_date: '2026-10-16 05:08'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-14
priority: medium
ordinal: 342000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-14 AC#6 (QA TASK-14.4). Steps: GET /v1/reports/:code of a lost dog Piki with colours [brown, white] and 2 published photos (fixture in apps/api/test/routes/reports.routes.test.ts). apps/api/domains/reports/reports.mapper.ts toPublicReport builds alt from the ALT[type][species] label and the name only. Expected (AC#6 and P9 section 11, CH-55 moved alt to the API): alt built from species, colour and area, e.g. 'Piki: pes rjave in bele barve, fotografija 1 od 2'. Actual: 'Pogrešani pes Piki, fotografija 1 od 2' / 'Lost dog Piki, photo 1 of 2': no colour, pattern or area; the test pins this wording. Note: P9 section 11 has no area, AC#6 asks for it; content lead to confirm which. Severity: Medium (a11y and SEO alt on every report photo, web and mobile).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 PublicReport.photos[].alt follows docs/content/pages/P9-report-detail.md section 11 in SL and EN (name prefix, species, colours as 'rjave in bele barve' / 'brown and white dog', pattern phrase, collar, 'fotografija n od total'; no attributes: 'Fotografija prijavljene živali'), plus the area if the story AC is kept; reports.routes test asserts a coloured example
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Branch: agent/task-14.5-photo-fixes

Alt: '{name}: ' + species + colours ('rjave in bele barve' / 'brown and white dog') + pattern + ', {municipality}' (name_sl/name_en of the fuzzed circle's municipality, already public as municipality_slug) + ', fotografija n od total' when > 1. Collar left out: its text is manager-only in C4 (PublicReport has collar_described only), so it cannot go into a public alt. The 'Fotografija prijavljene živali' fallback is unreachable (species is required). CHANGE row to P9 §11.
<!-- SECTION:NOTES:END -->
