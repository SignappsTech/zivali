---
id: TASK-115.6
title: 'QA: homepage rework'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-16 14:00'
updated_date: '2026-10-18 23:21'
labels:
  - qa
  - 'qa:fail'
  - 'est:XS'
dependencies:
  - TASK-115.5
parent_task_id: TASK-115
priority: high
ordinal: 361600
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify TASK-115 on main against the approved design and the quality gates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TASK-115 ACs verified on main; visual QA by the design lead against the approved design
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-19 on live https://najdimo.si (version a5d856e6), read-only. FAIL: 2 bugs. Matrix: SL+EN x 390/1440 x light/dark in Chromium and WebKit (16+16 runs): all T1 v0.8 copy present, section order hero > Nedavne prijave > Kako deluje > varnost > zavetišča > closing band (layout A), live numbers hidden (stats/public all null), 4 cards linking /r/{code}, Odpri zemljevid > /zemljevid (/en/map), 0 h-overflow (also 320), 0 console errors, axe (wcag2a-22aa + best-practice) 0 violations, focus ring on every main control (contrast >= 5.5:1), skip link first, main targets >= 44 px (only the consent banner's inline policy link is 21 px, P17, inline exception). Hero CTAs above the fold at 390 without the banner. Unit tests home: 15/15 pass (empty, error, stats states). Bugs: TASK-115.7 card photo alt carries the pet's name (Medium); TASK-115.8 focused card 2/4 stays ~70 % off-screen in the mobile snap strip (Low). Lighthouse mobile, 1 run, live: / perf 96, a11y 100, BP 100, SEO 69 (is-crawlable only: pilot noindex), LCP 2.8 s, TBT 60 ms, CLS 0, script 153 KB; /en perf 96, LCP 2.6 s, TBT 70 ms, CLS 0, script 153 KB. LCP element is the consent banner text (render delay ~2.1 s), the shared pattern of TASK-112 AC#1, so no new bug. CHANGE: sighted link target in P3 copy §1 (/report/sighted does not exist; built as /report/found like the header). Not done here: visual QA by the design lead (QA AC#1 second half).
<!-- SECTION:NOTES:END -->
