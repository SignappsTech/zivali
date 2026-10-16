---
id: TASK-13.5
title: Consent banner hides focused footer controls while open (WCAG 2.4.11)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 03:45'
labels:
  - bug
  - fe
  - 'est:XS'
dependencies: []
parent_task_id: TASK-13
priority: medium
ordinal: 341000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-13.4 QA, AC#5 (WCAG 2.2 AA). Steps: first visit /en (no zz_consent cookie), banner open; press Tab past the banner into the page and on through the footer. Expected: no focused control is entirely covered by the fixed banner (SC 2.4.11 Focus Not Obscured (Minimum); the Understanding doc names a non-modal cookie banner as the typical failure). Actual: Chromium 390x844: 17 controls fully behind the bottom sheet (footer links How it works ... Accessibility, Cookie settings, SL/EN, 'More for shelters'); 1440x900: 9 (logo, How it works, Safety tips, FAQ, For shelters, Privacy, Cookies, Cookie settings, Terms of use). Confirmed with elementFromPoint at each control's centre; WebKit too. Fix options: reserve the banner's height while open (scroll-padding-bottom plus bottom padding on the page), or close as ignored (denied) when focus leaves it. Severity: medium (AA failure, keyboard users; Escape still dismisses).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 While the P17 banner is open, no control that receives keyboard focus is entirely hidden behind it, at 390 px and 1440 px (e2e/consent-qa.spec.ts 'WCAG 2.4.11' tests pass without test.fail)
<!-- AC:END -->
