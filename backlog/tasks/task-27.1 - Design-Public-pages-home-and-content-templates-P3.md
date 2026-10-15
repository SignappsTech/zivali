---
id: TASK-27.1
title: 'Design: Public pages: home and content templates (P3)'
status: In Progress
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-15 03:00'
labels:
  - design
  - 'est:M'
  - 'req:FR-035'
dependencies:
  - TASK-11.1
references:
  - docs/design/system.md
  - docs/design/pages/P3-public-pages.md
  - docs/content/pages/P3-public-pages.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-27
priority: medium
ordinal: 89000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Home and the content pages carry SEO and trust, and the legal pages need a readable long-text template. Build the static HTML mockup for P3 from its page slice, the design system and the content slice (if docs/content/pages/P3-public-pages.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P1 web shell and P2 mobile shell mockups merged (header, footer, tab bar and sheet patterns)
Branch: design/P3-public-pages
Branch: main (no worktree on this machine; committed on main with an explicit pathspec, per lead)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P3-public-pages.md, when docs/design/mockups/P3-public-pages.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the home page at 1200 px, when shown, then the hero fits one viewport with a headline of at most two lines, one supporting sentence of at most 20 words and one primary action.
- [ ] #5 Given the legal template, when shown, then the draft review note and the table of contents are present, and no public page template contains an ad slot.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Mockup: docs/design/mockups/P3-public-pages.html. T1 home 1200 + 390 (Near you: tiles, empty, loading, error), T2 How it works 1200 + 390 (sticky 'Na tej strani'), T3 FAQ 1200 + 390 (one row expanded, focus, hover; rows toggle), T4 privacy draft 1200 + 390 (draft note, TOC sticky / disclosure on mobile), states: page loading, language fallback, offline. DOM checks: no overflow in any frame, page width 390 at 390, all targets >= 44, max one btn-primary per frame, hero h1 two lines (128 px) and hero ends 708 px from frame top (< 800 viewport). Hero lede is the content slice's 15-word line (three short sentences). Sample: Near you tile data. CHANGE: CH-72 (system 10.9 accordion + on-this-page), CH-73 (P3 slice: TOC from lg, mobile disclosure, mobile pet rows), CH-74 (breadcrumb back label).
<!-- SECTION:NOTES:END -->
