---
id: TASK-9.5
title: 'QA: Accounts and sign-in (email, Google, Apple)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-0
dependencies:
  - TASK-9.2
  - TASK-9.3
  - TASK-9.4
  - TASK-9.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P16-auth.md
parent_task_id: TASK-9
priority: high
ordinal: 227000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-9 (Accounts and sign-in (email, Google, Apple)) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-9 merged to main (TASK-9.2, TASK-9.3, TASK-9.4, TASK-9.1); leads add any later TASK-9 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a visitor, when they register with email and password or sign in with Google or Apple, then an account and profile are created and they are signed in on web and mobile.
- [ ] #2 Given a new email account, when registered, then email verification is required before alerts or chat but not before saving a report draft.
- [ ] #3 Given a signed-in user, when they edit their profile, then name, language (SL or EN), home area, default alert radius and optional phone can be saved and the phone is never shown publicly.
- [ ] #4 Given the roles user, shelter_member, moderator and admin, when a request is made, then RLS and route guards enforce them and a test proves a user cannot read another profile.
- [ ] #5 Given a forgotten password, when the user requests a reset, then a localised email link resets it and repeated requests are rate limited.
- [ ] #6 Given the auth screens, when used with keyboard and screen reader, then they meet WCAG 2.2 AA.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
