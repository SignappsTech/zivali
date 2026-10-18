---
id: TASK-115.7
title: 'Home: recent-report card photo alt shows the pet''s name'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 23:20'
updated_date: '2026-10-18 23:34'
labels:
  - bug
  - 'est:XS'
  - fe
dependencies: []
parent_task_id: TASK-115
priority: medium
ordinal: 403200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: open https://najdimo.si/ (or /en), any width, inspect a recent-report card with a photo, e.g. /r/eeXYycPT. Expected: card shows only status, species, rough area and time (approved layout A, TASK-115.1 notes; copy P3 §2 'No names'); photo alt per P3 §Home alt text. Actual: img alt is the API's detail-page alt, which starts with the name and adds the photo count: 'Iri: mačka bele in sive barve, Ljubljana, fotografija 1 od 2', 'Bjorn: grey tabby cat, Ljubljana', 'Spuži Kvadratnik: ...'. It is in the HTML (search engines, image-off view, screen readers browsing images). Source: components/home/blocks.tsx ReportCard uses photo.alt. Found in TASK-115.6 (version a5d856e6), Chromium and WebKit, SL and EN. Severity: Medium (privacy rule of the approved card content).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 On / and /en the recent-report card photo alt never contains the pet's name; it follows P3 §Home alt text (rule P9: species, colour, status, e.g. 'Izgubljena mačka, bele in sive barve' / 'Lost cat, white and grey') or is empty (the card link's aria-label already describes the report)
- [x] #2 A unit test in components/home/blocks.test.tsx feeds a report with a name and asserts the name is absent from the card's text, aria-label and img alt
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Packet: Branch: agent/TASK-115.7-home-cards (shared with TASK-115.8). Card alt built in ReportCard from browse.row_title_* + report.seo_colours/seo_colour (P3 §Home alt text, P9 §11), never photo.alt; test in blocks.test.tsx feeds a named report with the API alt and checks text, aria-label and alt. No e2e asserted the old alt.
<!-- SECTION:NOTES:END -->
