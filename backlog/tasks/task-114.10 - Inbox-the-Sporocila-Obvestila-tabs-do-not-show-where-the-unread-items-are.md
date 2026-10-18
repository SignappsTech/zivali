---
id: TASK-114.10
title: 'Inbox: the Sporočila/Obvestila tabs do not show where the unread items are'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 14:45'
updated_date: '2026-10-18 02:17'
labels:
  - bug
  - fe
  - 'est:S'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: high
ordinal: 361000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: the inbox is split into messages and notifications, and the switcher does not show where the unread items are; the header dot says something is unread, then the user has to guess the tab.

Code:
- Tabs: apps/web/components/notifications/inbox-views.tsx (TabsTrigger "conversations" / "notifications"): plain labels, no unread state.
- Header dot: apps/web/components/notifications/unread-dot.tsx counts only the notifications' `unread` (C10).
- Chat: each conversation has its own `unread` (packages/validation chat.schema.ts); a chat message creates a `chat_message` notification only when the recipient is offline, once per conversation per 5 minutes (apps/api/domains/chat/chat.domain.ts). So an unread chat can leave the header dot off, and an unread chat_message notification duplicates the Sporočila state.

Wanted:
1. Each tab shows its unread state (dot or count, with an accessible name such as "Sporočila, 2 neprebrani"), live via the Realtime events the inbox already gets.
2. The inbox opens on the tab that has unread items (messages first), unless the URL names a tab.
3. The header dot reflects both: unread notifications or any unread conversation.
4. Reading a conversation also marks its chat_message notification read (or the notifications list hides chat_message rows whose conversation is read), so the two never disagree.
Merging the two lists into one inbox would be a design rework: it needs a person-approved wireframe first (owner rule); not part of this fix.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Both tabs show an unread indicator with an accessible name when they have unread items; it updates live
- [x] #2 /nabiralnik without a tab opens the tab with unread items (Sporočila first)
- [x] #3 The header dot is on when there is any unread conversation or unread notification
- [x] #4 Reading a conversation clears its chat_message notification state; no tab shows unread for something already read
- [ ] #5 Unit tests for the indicators and the default tab; inbox e2e updated; mobile app inbox checked for the same gap (follow-up task if it differs)
<!-- AC:END -->

## Packet

Branch: agent/TASK-114.10-inbox-unread-tabs

Mobile check (AC5): apps/mobile inbox has the same gap (plain Pogovori/Obvestila tabs, no unread state on the tabs or the tab bar, no default-view rule); needs a follow-up mobile task. The API fix (reading a conversation reads its chat_message notifications) already covers mobile.
