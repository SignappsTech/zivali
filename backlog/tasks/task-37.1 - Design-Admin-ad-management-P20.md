---
id: TASK-37.1
title: 'Design: Admin ad management (P20)'
status: Done
assignee:
  - '@ui-designer'
created_date: '2026-10-14 21:50'
updated_date: '2026-10-16 03:54'
labels:
  - design
  - 'est:M'
  - 'req:FR-031'
dependencies:
  - TASK-34.1
  - TASK-36.4
references:
  - docs/design/system.md
  - docs/design/pages/P20-admin-ads.md
  - docs/content/pages/P20-admin-ads.md
  - docs/design/mockups/_template.html
parent_task_id: TASK-37
priority: high
ordinal: 107000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The client runs campaigns by hand and must see results, so the form, preview and statistics are designed together. Build the static HTML mockup for P20 from its page slice, the design system and the content slice (if docs/content/pages/P20-admin-ads.md does not exist yet, use clearly marked sample Slovenian copy). Frontend implements from this mockup, so every state in the slice has to be drawn.

## Packet
Unblocks on: P19 admin shell and P21 ad slot mockups merged
Branch: agent/TASK-37.1-ad-admin-mockup
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given docs/design/pages/P20-admin-ads.md, when docs/design/mockups/P20-admin-ads.html is opened in light, dark and side by side, then every state and platform listed in "Mockup scope" is shown and nothing is clipped or scrolls horizontally at 390 and 1200 px.
- [ ] #2 Given the visual review checklist in docs/design/system.md section 1, when the mockup is reviewed, then it passes: one primary action per view, no card borders, status as icon plus word, one accent, status and meaning never by colour alone.
- [ ] #3 Given accessibility, when the mockup is checked, then text meets 4.5:1 (7:1 for body text and the main action), targets are at least 44 px, a visible focus state is shown, and labels sit above fields.
- [ ] #4 Given the create form, when shown, then each validation error (missing alt text, non-https link, wrong image format, overlapping dates in an exclusive slot) appears inline and the live preview shows all four slots in SL and EN.
- [ ] #5 Given the ad detail, when shown, then impressions, clicks and CTR by day, breakdown tables with "< 5" handling, the CSV export and the history are present.
<!-- AC:END -->
