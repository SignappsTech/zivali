---
id: TASK-27.6
title: 'Web home: hero h1, lede and report chooser are cut off at 200 percent text'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:25'
updated_date: '2026-10-19 21:12'
labels:
  - bug
  - 'est:S'
  - web
  - a11y
dependencies: []
parent_task_id: TASK-27
ordinal: 460200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: https://najdimo.si/ and /en (live ee189f86, 2026-10-19; hero layout same on main c2040993), Chromium and WebKit at 390x844 and 320x844, inject html{font-size:200%} (TASK-18.8 method), measure the hero section and document scrollWidth.
Expected: no clipped text and no sideways scroll at 200 % text (docs/tech/frontend.md DoD 'works at 320 px width and 200 % text'; WCAG 1.4.4, 1.4.10).
Actual: the hero content box stays about 450 px wide whatever the viewport: h1 'Izgubljena žival? Skupaj jo pripeljemo domov.' and the lede end at x 530 (EN 467), the chooser h2 at 490, the row texts at 422; the hero section (app/[locale]/page.tsx, 'relative isolate overflow-hidden') clips them, so words are cut mid-letter ('Izgubljen|', 'pripel|'). The map teaser svg also ends past the viewport: document scrollWidth 401 (SL) / 409 (EN) at both widths (WebKit: 384 at 320).
Severity: medium (the page's main action is partly unreadable for large-text users).

## Packet

Unblocks on: - (TASK-115.10, 115.11, 115.13 merged)
Branch: agent/<id>-home-hero-large-text
Branch: agent/TASK-27.6-home-hero-large-text
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given / and /en at 390 px and 320 px with root text at 200 percent (as apps/web/e2e/large-text.spec.ts), when the page loads, then the hero h1, lede and report chooser wrap inside the viewport with nothing clipped, the map teaser fits, and the page has no horizontal scroll; a large-text e2e case covers the home body
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Large text approach (review fix, WCAG 1.4.4): below lg the home headings are clamp(1.125rem, rem + vw, 100 % size), the middle term equal to the 100 % size at 320 px: h1 clamp(1.125rem, 1.5rem + 3.75vw, 2.25rem), h2 clamp(1.125rem, 1rem + 2.5vw, 1.5rem), h3 clamp(1.125rem, 0.875rem + 1.875vw, 1.25rem). 100 % (px at 320/390/1023): h1 36/36/36, h2 24/24/24, h3 20/20/20, the same as before. 200 % root: h1 60/62.6/72, h2 40/41.75/48, h3 36/36/40 (1.67-2x). The rem part means the user's text size scales them (not pure vw, F94). Line heights are ratios equal to the old tokens at 100 % (h2 1.25 = 1.875rem = 30 px, h3 1.4 = 28 px). Only the photo layer clips (overflow-hidden); below lg the columns are minmax(0,1fr); main has break-words; side paddings, gaps and carets cap at their 100 % px. Trade-off: at 200 % the h1's longest word (pripeljemo, 5 em = 300-314 px) is wider than the 200/270 px hero, so it breaks across lines (no clipping, no scroll); the same goes for shelters veterinarje at 320 and EN municipalities.
<!-- SECTION:NOTES:END -->
