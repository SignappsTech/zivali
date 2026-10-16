---
id: TASK-21.6
title: >-
  Detail slot A contact actions: 'Pošlji sporočilo' and 'To je moja žival' start
  a conversation (C9) on web and mobile
status: Done
assignee: []
created_date: '2026-10-16 07:27'
updated_date: '2026-10-16 09:45'
labels:
  - fe
dependencies: []
parent_task_id: TASK-21
priority: high
ordinal: 354000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found in QA TASK-18.4: P9 slot A visitor actions include contact (lost: text 'Pošlji sporočilo'; found: primary 'To je moja žival'; sighted: 'Pošlji sporočilo' + text 'To je moja žival'), and the slot docs say 'Contact comes with TASK-21.3', but neither web nor mobile calls C9 POST /v1/conversations { about_report_code } (packages/api/src/chat.ts has the client). Add the actions next to the existing sighting action (web components/report/slots/slot-a.tsx visitor branch, mobile components/report/slots/slot-a.tsx): signed-out or anonymous viewers go through the gate (C9: verified email or anonymous manager), UNVERIFIED_EMAIL shows the verify dialog, RATE_LIMITED (contact 10/day) a calm note, then open the conversation (/inbox/[id] web, mobile route) with chat_started analytics consent-gated on first message (already in chat).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A signed-in visitor on a lost, found or sighted listing can start a conversation from slot A per P9 and lands in it (web vitest + mobile jest with the API mocked)
- [ ] #2 Gate, UNVERIFIED_EMAIL and RATE_LIMITED paths handled; owners never see contact actions; the call is idempotent per report and caller (C9) and double-press guarded
<!-- AC:END -->

## Packet

Branch: agent/task-21.6-detail-contact
