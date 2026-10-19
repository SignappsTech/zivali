---
id: TASK-13.8
title: >-
  Safari/WebKit: focused FAQ questions stay hidden behind the open consent
  banner (WCAG 2.4.11)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 18:34'
labels:
  - bug
  - 'est:XS'
  - web
  - fe
milestone: m-0
dependencies: []
references:
  - apps/web/components/consent/consent-banner.tsx
  - docs/design/pages/P17-consent.md
parent_task_id: TASK-13
priority: medium
ordinal: 437200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-13.4 QA re-run 2026-10-19, live https://najdimo.si (version 69d07c9716f7 = main code), AC#5 (WCAG 2.2 AA, SC 2.4.11 Focus Not Obscured). Follow-up to TASK-13.5: its fix (body padding-bottom + html scroll-padding-bottom = banner height) works in Chromium but WebKit ignores scroll-padding when focus lands on a control that is already inside the viewport, so it does not scroll it out from under the fixed banner.

Steps: Playwright WebKit 1.64 (webkit-2370), no zz_consent cookie, open https://najdimo.si/en/faq at 390x844, banner open; press Tab past the banner through the FAQ questions (<summary> elements).
Expected: each focused question is scrolled clear of the banner (as in Chromium: 0 hidden at 390, 1024, 768 and 320 px).
Actual: the page does not scroll (scrollY unchanged) and the focused summary sits fully under the banner (elementFromPoint at its centre and corners hits the banner): /en/faq 390x844 20 questions hidden (e.g. 'Why does the map only show an approximate...' top 528-620, banner top 516, scroll-padding-bottom 328px), /pogosta-vprasanja 390x844 11, /en/faq 1024x768 20 (desktop Safari laptop size), 768x1024 5, 320x640 10. / and /en pass in WebKit only because its Tab skips links there. Fix idea (dev's choice): while the banner is open, on focusin outside it, if the target's rect overlaps the banner call target.scrollIntoView({ block: 'nearest' }) (WebKit honours scroll-padding there) or scrollBy the overlap. Note: CI runs e2e on Chromium only, so run the spec with --project=webkit locally. Confirm once in real Safari if available.
Severity: medium (AA failure for keyboard users in Safari; Escape or a choice removes the banner).

## Packet

Unblocks on: - (ready; TASK-13.5 merged)
Review: tech-lead code review
Branch: agent/TASK-13.8-webkit-faq-consent
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 While the P17 banner is open, no control that receives keyboard focus is entirely hidden behind it in WebKit as well as Chromium, at 390 px, 1024 px and 1440 px, on /en/faq and /pogosta-vprasanja (e2e/consent-qa.spec.ts 'WCAG 2.4.11' tests cover the FAQ page and pass with --project=webkit)
<!-- AC:END -->
