---
id: TASK-11
title: Web app shell and navigation
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:01'
labels:
  - story
  - 'req:FR-035'
milestone: m-0
dependencies:
  - TASK-8
  - TASK-10
priority: medium
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every web story needs the same header, navigation, footer (legal and cookie settings), responsive layout and a reserved sidebar slot, so pages can be built in parallel.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given any web page, when rendered, then a header (logo, Map, Report, My pets and reports, Account, language switcher), a footer (About, Safety tips, Partners, Privacy, Cookies, Terms, Imprint, Accessibility, Cookie settings) and a skip link are present.
- [ ] #2 Given viewports from 360 px to 1440 px, when resized, then the layout is mobile-first with no horizontal scroll and a right sidebar region appears from the lg breakpoint.
- [ ] #3 Given a loading, empty or error state, when a page needs one, then shared patterns with calm, helpful copy are available.
- [ ] #4 Given later areas, when added, then route groups for public, app, organisation portal and admin exist with guards (empty pages are fine).
<!-- AC:END -->

## Packet

Unblocks on: primitives Button, Sheet, Tabs (TASK-8); message catalogue API and language switcher hook (TASK-10)
