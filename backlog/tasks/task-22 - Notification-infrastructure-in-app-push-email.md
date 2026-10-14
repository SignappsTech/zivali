---
id: TASK-22
title: 'Notification infrastructure (in-app, push, email)'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:02'
labels:
  - story
  - 'req:FR-010'
milestone: m-1
dependencies:
  - TASK-6
  - TASK-9
priority: high
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Alerts, matches and chat all need one reliable and respectful way to reach people; building it once as a contract lets those stories proceed in parallel.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a notification request (type, recipient, payload, locale), when sent, then it is stored in an in-app inbox and delivered by push (Expo) and/or email per user preferences, in the user language.
- [ ] #2 Given a device, when the user signs in and grants permission, then its push token is registered and removed on sign-out or token invalidation.
- [ ] #3 Given the settings screen, when opened, then the user can control types (match, chat, nearby alert, account) and channels, and quiet hours apply except to chip matches and chat.
- [ ] #4 Given local development and tests, when sending, then mock push and a local email inbox are used and real providers need credentials (Q-007).
- [ ] #5 Given repeated events, when notifications are created, then they are deduplicated and rate limited (at most 1 push per report per hour for nearby alerts).
- [ ] #6 Given the inbox, when opened, then unread count, mark as read and deep links to the target screen work.
<!-- AC:END -->

## Packet

Unblocks on: notifications schema and sendNotification contract (TASK-6); session (TASK-9)
