---
id: TASK-22.6
title: 'QA: Notification infrastructure (in-app, push, email)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-22.3
  - TASK-22.4
  - TASK-22.5
  - TASK-22.1
  - TASK-22.2
references:
  - docs/tech/frontend.md
  - docs/design/pages/P13-alerts-inbox-settings.md
parent_task_id: TASK-22
priority: high
ordinal: 240000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-22 (Notification infrastructure (in-app, push, email)) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-22 merged to main (TASK-22.3, TASK-22.4, TASK-22.5, TASK-22.1, TASK-22.2); leads add any later TASK-22 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a notification request (type, recipient, payload, locale), when sent, then it is stored in an in-app inbox and delivered by push (Expo) and/or email per user preferences, in the user language.
- [ ] #2 Given a device, when the user signs in and grants permission, then its push token is registered and removed on sign-out or token invalidation.
- [ ] #3 Given the settings screen, when opened, then the user can control types (match, chat, nearby alert, account) and channels, and quiet hours apply except to chip matches and chat.
- [ ] #4 Given local development and tests, when sending, then mock push and a local email inbox are used and real providers need credentials (Q-007).
- [ ] #5 Given repeated events, when notifications are created, then they are deduplicated and rate limited (at most 1 push per report per hour for nearby alerts).
- [ ] #6 Given the inbox, when opened, then unread count, mark as read and deep links to the target screen work.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
