---
id: TASK-21.5
title: 'QA: In-app chat between owner and finder'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-21.2
  - TASK-21.3
  - TASK-21.4
  - TASK-21.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P12-chat.md
parent_task_id: TASK-21
priority: high
ordinal: 239000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-21 (In-app chat between owner and finder) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-21 merged to main (TASK-21.2, TASK-21.3, TASK-21.4, TASK-21.1); leads add any later TASK-21 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a confirmed match or the Contact action on a listing, when a user opens chat, then a conversation is created between the two parties and messages arrive in real time (p95 under 2 s) on web and mobile.
- [ ] #2 Given an anonymous finder, when they use their manage link, then they can chat without an account.
- [ ] #3 Given a conversation, when displayed, then a persistent safety banner warns never to send money first and no phone number or email is shown unless a user shares it deliberately.
- [ ] #4 Given a message, when a user taps report or block, then an abuse report (FR-018) is created and a blocked user can no longer message.
- [ ] #5 Given the recipient is offline, when a message arrives, then a notification is requested through the notification contract.
- [ ] #6 Given a message containing a link, when displayed, then it is plain text with a caution and no preview unfurling.
- [ ] #7 Given the first message in a conversation, when sent, then chat_started fires (consent only).
- [ ] #8 Given a closed report, when the retention period (default 6 months) passes, then the conversation is read-only first and then deleted.
- [ ] #9 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
