---
id: TASK-21.8
title: 'Chat: link caution misses bare domains on uncommon TLDs (has_link regex)'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-16 10:02'
updated_date: '2026-10-16 10:46'
labels:
  - bug
  - 'est:XS'
milestone: m-1
dependencies: []
parent_task_id: TASK-21
priority: low
ordinal: 359000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found in QA TASK-21.5, TASK-21 AC#6. Steps: send 'poglej is.gd/abc' or 'foo.dev/x' in a conversation. Expected: link caution line shown. Actual: LINK in apps/api/domains/chat/chat.domain.ts only matches schemes, www. and a fixed TLD list (si, com, net, ... ), so has_link is false and no caution shows for other TLDs. Text is never linkified so no click-through risk, only the warning is missing. Severity: Minor.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 has_link is true for any host-like token such as foo.dev, cutt.ly, is.gd, example.page, not only the TLD allowlist in chat.domain.ts
<!-- AC:END -->

## Packet

Branch: agent/task-21.7-chat-block
