---
id: TASK-21.4
title: 'Mobile inbox and conversation: realtime chat with safety banner'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-14 22:42'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-12.2
  - TASK-9.4
  - TASK-6.10
  - TASK-25.4
  - TASK-21.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C9-chat.md
  - docs/design/pages/P12-chat.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-21
priority: high
ordinal: 190000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Chat happens mostly on phones, often while meeting to hand over the animal (FR-009).

## Packet

Unblocks on: Mobile shell: tabs, Report action, permission primer, settings stack merged (TASK-12.2); Mobile sign-in, sign-up, verification, reset and profile merged (TASK-9.4); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); Mobile report-abuse sheet and detail slot merged (TASK-25.4); Design: Chat (P12) approved (TASK-21.1)
Design: P12 docs/design/pages/P12-chat.md (mockup docs/design/mockups/P12-chat.html; TASK-21.1)
Copy: docs/content/pages/P12-chat.md
Contracts: C9, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-21.4-chat-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The Inbox tab lists conversations with unread counts; the conversation screen shows messages in real time with a persistent safety banner, per P12.
- [ ] #2 URLs are plain text with a caution; no contact data is shown unless typed.
- [ ] #3 Report and Block actions work; blocked users are refused; read-only conversations disable input.
- [ ] #4 chat_started fires with consent only; anonymous managers chat from the manage screen; no ad component on chat screens.
<!-- AC:END -->
