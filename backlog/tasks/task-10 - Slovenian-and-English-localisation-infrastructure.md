---
id: TASK-10
title: Slovenian and English localisation infrastructure
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:01'
labels:
  - story
  - 'req:FR-036'
  - 'req:NFR-I18N'
milestone: m-0
dependencies:
  - TASK-3
priority: high
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Slovenian is the default and English the second language from day one; retrofitting strings later is expensive and Slovenian needs dual plural forms.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given web and mobile, when a user changes language, then the UI switches between SL and EN, the choice persists on the device and in the profile, and SL is the default.
- [ ] #2 Given a message with a count, when rendered in SL, then ICU plural rules for one, two, few and other are applied correctly (1, 2, 3-4 and 5+ listings).
- [ ] #3 Given public web pages, when requested, then routes are language-aware with hreflang tags and a language switcher that stays on the same page.
- [ ] #4 Given a missing translation key, when CI runs, then the check fails; dates, times, numbers and EUR amounts use Slovenian formats.
- [ ] #5 Given server-sent text (notifications, emails), when sent, then it uses the recipient language.
<!-- AC:END -->

## Packet

Unblocks on: workspace and packages/* exist (TASK-3)
