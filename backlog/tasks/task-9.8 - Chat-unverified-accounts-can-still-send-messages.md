---
id: TASK-9.8
title: 'Chat: unverified accounts can still send messages'
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-19 15:06'
updated_date: '2026-10-19 18:19'
labels:
  - bug
  - be
  - 'est:XS'
  - no-design
dependencies: []
references:
  - apps/api/routes/conversations.routes.ts
  - docs/tech/contracts/C9-chat.md
parent_task_id: TASK-9
priority: medium
ordinal: 429200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found in QA TASK-9.5 (2026-10-19, code review on main ef6c492f). Story TASK-9 AC#2: email verification is required before alerts or chat. Steps: an account with an unconfirmed email publishes a lost report (allowed, C4 CH-195), so it is a report manager; a verified finder opens a conversation about that report (POST /v1/conversations passes for the finder); the unverified owner then POSTs /v1/conversations/:id/messages. Expected: 403 UNVERIFIED_EMAIL (C9 lists it among chat errors, and apps/web/components/chat/thread.tsx:305 already maps it to an 'unverified' lock). Actual: 201, the message is stored and sent: the send route has only authMiddleware + rate limits + idempotency (conversations.routes.ts:91-95), and ChatDomain checks is_anonymous only (chat.domain.ts:53); grep finds no email_verified check on any chat path except conversation creation. The same holds for an unverified account that files a found or sighted report. Severity: Medium (anti-abuse gate bypassed for the reply side). If the product owner wants unverified owners of lost reports to reply, record that as a CHANGE to AC#2 instead.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST /v1/conversations/:id/messages answers 403 UNVERIFIED_EMAIL for a real account whose email is unconfirmed; anonymous finders who manage the report and verified accounts still send (same rule as requireVerifiedOrAnonymous)
- [ ] #2 A route test in apps/api/test/routes/conversations.routes.test.ts proves it (unverified manager refused, verified and anonymous manager pass)
- [ ] #3 The web thread shows its existing 'unverified' lock on that answer (components/chat/thread.tsx), no product change needed there
<!-- AC:END -->
