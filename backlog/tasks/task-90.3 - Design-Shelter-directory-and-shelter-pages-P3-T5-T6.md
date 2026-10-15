---
id: TASK-90.3
title: 'Design: Shelter directory and shelter pages (P3 T5, T6)'
status: In Progress
assignee:
  - '@ui-designer'
created_date: '2026-10-14 23:48'
updated_date: '2026-10-15 02:30'
labels:
  - design
  - 'est:S'
  - 'req:FR-044'
milestone: m-2
dependencies:
  - TASK-11.1
references:
  - docs/design/system.md
  - docs/design/pages/P3-public-pages.md
  - docs/content/pages/P3-public-pages.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-90
priority: medium
ordinal: 292000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners and finders need the shelter responsible for their municipality in one step, and the public shelter pages are the product's strongest SEO asset (FR-044). Build the static HTML mockup docs/design/mockups/P3-shelter-pages.html from the T5 and T6 sections of the P3 page slice and the design system. The content slice has no shelter strings yet (CHANGE requested): use clearly marked sample Slovenian copy and sample shelter data.

## Packet
Unblocks on: P1 web shell mockup merged (TASK-11.1, done)
Branch: design/P3-shelter-pages
Branch: main (no worktree per lead; mockup docs/design/mockups/P3-shelter-pages.html committed directly)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the P3 slice sections T5 and T6, when docs/design/mockups/P3-shelter-pages.html is opened in light, dark and side by side, then every state in its Mockup scope is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view (the call button), no card borders, no ad slot, one accent, meaning never by colour alone.
- [ ] #3 Given an unknown municipality, when shown, then a note says so with a link to the full list and the 2 nearest shelters, and no guessed name or number is shown. Given an unconfirmed municipality, then a card "Morda pristojno zavetišče" with "Ni potrjeno" (icon plus word) shows, with no "Pokliči" primary, a secondary tel button labelled as unconfirmed and a link to the shelter page. The `.sh-map` has an inset 1 px `map-road-casing` hairline.
- [ ] #4 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body and the call button), targets are at least 44 px, the search is a labelled combobox with a visible focus state, and phone numbers use tabular figures.
<!-- AC:END -->
