---
id: TASK-21.7
title: >-
  Chat: block is unreachable in web and mobile (no other_participant_id from C9,
  CH-170)
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-16 10:02'
updated_date: '2026-10-16 10:34'
labels:
  - bug
  - 'est:S'
milestone: m-1
dependencies: []
parent_task_id: TASK-21
priority: high
ordinal: 358000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found in QA TASK-21.5, TASK-21 AC#4 (report or block). Steps: open any conversation on web (/inbox/[id]) or mobile and open the thread menu. Expected: Prijavi osebo, Blokiraj and the 'block' switch in the abuse dialog. Actual: ConversationSummary (packages/validation/src/chat.schema.ts) has no other_participant_id, so web thread.tsx and mobile thread.tsx get participant undefined: the block action is not offered and Report only targets the latest message of the other person. POST /v1/conversations/:id/block works (API tests) but no client can call it. Already tracked as CHANGE CH-170 (open). Severity: Major (AC#4 half unreachable for users; report message works).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ConversationSummary carries other_participant_id (or block takes a message id) and the web and mobile thread menus offer Block and Report person; a blocked user's POST message answers FORBIDDEN
<!-- AC:END -->

## Packet

Branch: agent/task-21.7-chat-block
