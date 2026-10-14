---
id: TASK-21.3
title: 'Web inbox and conversation: realtime chat with safety banner'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-11.2
  - TASK-9.3
  - TASK-6.10
  - TASK-25.3
  - TASK-21.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C9-chat.md
  - docs/design/pages/P12-chat.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-21
priority: high
ordinal: 189000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners and finders talk without sharing phone numbers, the main scam defence (FR-009).

## Packet

Unblocks on: Web shell: header, footer, layout, route groups and guards, shared states merged (TASK-11.2); Web sign-in, sign-up, verification, reset, account page and guards merged (TASK-9.3); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); Web ReportAbuseDialog and detail-page slot merged (TASK-25.3); Design: Chat (P12) approved (TASK-21.1)
Design: P12 docs/design/pages/P12-chat.md (mockup docs/design/mockups/P12-chat.html; TASK-21.1)
Copy: docs/content/pages/P12-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report)
Contracts: C9, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-21.3-chat-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /inbox lists conversations with unread counts and /inbox/[id] shows messages in real time with a persistent safety banner, per P12.
- [ ] #2 URLs are shown as plain text with a caution and no preview; no phone or email is shown unless a user types it.
- [ ] #3 Report message and Block participant use the shared abuse dialog; a blocked user's messages are refused with a clear note.
- [ ] #4 chat_started fires on the first sent message (consent only); anonymous managers can chat from the manage page; read-only conversations disable the input with an explanation.
- [ ] #5 No ad slot on chat routes (quality-kit helper); axe 0 violations; Playwright covers two browser contexts exchanging messages.
<!-- AC:END -->
