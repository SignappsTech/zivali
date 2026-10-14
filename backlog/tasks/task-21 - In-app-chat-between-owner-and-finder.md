---
id: TASK-21
title: In-app chat between owner and finder
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:02'
labels:
  - story
  - 'req:FR-009'
milestone: m-1
dependencies:
  - TASK-6
  - TASK-9
  - TASK-17
  - TASK-7
priority: high
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Hidden phone numbers and in-app chat are the main scam defence and the way owners and finders actually reunite.
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
<!-- AC:END -->

## Packet

Unblocks on: conversations, messages and abuse-report schemas with RLS pattern (TASK-6); session (TASK-9); anonymous participant identity and manage-token model (TASK-17); track() (TASK-7)
