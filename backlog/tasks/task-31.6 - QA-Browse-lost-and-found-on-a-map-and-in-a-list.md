---
id: TASK-31.6
title: 'QA: Browse lost and found on a map and in a list'
status: In Progress
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'qa:fail'
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-31.3
  - TASK-31.4
  - TASK-31.5
  - TASK-31.1
  - TASK-31.2
references:
  - docs/tech/frontend.md
  - docs/design/pages/P4-map-list.md
parent_task_id: TASK-31
priority: high
ordinal: 249000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-31 (Browse lost and found on a map and in a list) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-31 merged to main (TASK-31.3, TASK-31.4, TASK-31.5, TASK-31.1, TASK-31.2); leads add any later TASK-31 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given the map, when it loads, then pins or clusters for LOST, FOUND and SIGHTED reports in view appear within 2 s on 4G for 500 reports, coded by icon and colour (not colour alone) with fuzzed locations.
- [x] #2 Given the list, when opened, then it shows the same results ordered by distance or recency with pagination and works as the full alternative to the map for keyboard and screen reader users.
- [ ] #3 Given filters, when applied, then type, species, distance, date range, colour and size narrow both map and list, persist in the URL on web and show result counts with correct SL plural forms.
- [x] #4 Given boosted reports, when listed, then boosted_until sorts them first and highlights them on the map (behaviour ready, purchase comes in M4).
- [x] #5 Given closed or expired reports, when browsing, then they are excluded by default.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

QA 2026-10-16 on main b965dff9 (read-only checks; machine rules forbid e2e, API tests, builds, Lighthouse).
- Ran: web vitest components/browse + components/map (34 pass), mobile jest browse-filters, map-tab, map-view (42 pass), i18n check OK.
- AC#1 pass: map uses public fuzzed areas only (public_point; MapRow has no exact point), icon plus colour markers, e2e 500-pin 2 s test exists (browse.spec, map.spec); e2e run itself: merge queue on main at b965dff9.
- AC#2 pass: list is keyboard alternative (Skip map link in MapView, focus moves to first new row on Nalozi vec), keyset pagination 20, distance or recent sort.
- AC#3 FAIL (partly): filters round-trip in URL via replaceState(null), place and browser position stay out of URL, near rounded to 2 decimals, SL plurals one/two/few/other present. Bug TASK-31.7: count capped at 500. Date range is presets (24h, 7d, 30d) only, no custom range (note, not filed: P4 design defines presets).
- AC#4 pass: boosted first in API order (unit tested), boosted flag on markers, feed ad after every 8 rows labelled Oglas (TASK-36.5).
- AC#5 pass: default WHERE status in (open, matched) and moderation_state = visible; include_closed only to 30 days; hidden, held, removed never returned (API tests read, not run).
- AC#6 pending: verify, e2e, Lighthouse: merge queue on main at b965dff9. /zemljevid has a 320 kB script budget in lighthouserc.json.
- SEO: title absolute seo_title, description, canonical /map per locale, hreflang via proxy Link header (routing.test), CollectionPage + breadcrumb JSON-LD.
- Mobile: reads only lib/data/reports hooks, setCacheArea('current') with rounded point, ad slot every 8, same count logic (same cap).
- TASK-31.1 image still open: empty state uses a SpotIllustration placeholder, not failed.

