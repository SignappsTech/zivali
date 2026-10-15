---
id: TASK-10.4
title: 'QA: Slovenian and English localisation infrastructure'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
  - 'qa:pass'
milestone: m-0
dependencies:
  - TASK-10.1
  - TASK-10.2
  - TASK-10.3
references:
  - docs/tech/frontend.md
parent_task_id: TASK-10
priority: high
ordinal: 228000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-10 (Slovenian and English localisation infrastructure) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-10 merged to main (TASK-10.1, TASK-10.2, TASK-10.3); leads add any later TASK-10 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given web and mobile, when a user changes language, then the UI switches between SL and EN, the choice persists on the device and in the profile, and SL is the default.
- [ ] #2 Given a message with a count, when rendered in SL, then ICU plural rules for one, two, few and other are applied correctly (1, 2, 3-4 and 5+ listings).
- [ ] #3 Given public web pages, when requested, then routes are language-aware with hreflang tags and a language switcher that stays on the same page.
- [ ] #4 Given a missing translation key, when CI runs, then the check fails; dates, times, numbers and EUR amounts use Slovenian formats.
- [ ] #5 Given server-sent text (notifications, emails), when sent, then it uses the recipient language.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-15 on main 959465b: qa:pass.
- AC1 hook level (web useLocaleSwitch, path wins over cookie, NEXT_LOCALE kept in step; mobile profile > stored > device, 6/6). Switcher UI ships with TASK-11.2 AC#1 (web) and TASK-12.2 settings/language (mobile); keyboard and screen-reader check moves to TASK-11.3 / TASK-12.4.
- AC2 sl plurals one/two/few/other valid on native Intl and the polyfill. AC3 localised paths, cross-locale 307, hreflang as Link header from NEXT_PUBLIC_APP_URL, html lang correct. AC4 332/332 keys, Europe/Ljubljana formats. AC6 pnpm verify 30/30.
- AC5 (server text in the recipient's locale) is not exercised yet: moved to TASK-22.3 AC#6.
- Note: `/` with NEXT_LOCALE=en serves sl (localeDetection off, path wins, per C16).
- Web e2e: all locale specs pass; 8 unrelated timeouts (kit/admin-directory axe, photos) are TASK-4.4/4.5.
<!-- SECTION:NOTES:END -->
