---
id: TASK-22.3
title: >-
  Notifications: notify.send job, inbox and preferences API, push tokens, Expo
  and Brevo adapters
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-14 23:38'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-6.7
  - TASK-6.3
  - TASK-10.1
  - TASK-3.9
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C10-notifications-alerts.md
  - docs/tech/contracts/C16-i18n.md
  - docs/content/notifications-and-emails.md
parent_task_id: TASK-22
priority: high
ordinal: 169000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Matches, chat and alerts need one reliable and respectful way to reach people in their language (FR-010).

## Packet

Unblocks on: Matching, chat, notification and alert models with seed merged (TASK-6.7); Worker and jobs: pg-boss, queue registry with stubs, schedules, keep-alive, drain merged (TASK-6.3); packages/i18n: ICU catalogues, key-parity and plural check, formatting helpers merged (TASK-10.1); API adapters ported from the TASK-3.2 branch, plus a storage adapter (R2, MinIO, memory) merged (TASK-3.9)
Contracts: C10, C16 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-22.3-notify-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 notify.send stores inbox rows (deduped), applies per-type preferences and quiet hours (Europe/Ljubljana; not for match_chip and chat_message), broadcasts notification.created on user:<id>, and delivers push through the Expo adapter and email through the Brevo adapter (mock by default).
- [ ] #2 Push and email text use the @zivali/i18n notifications and email namespaces in the recipient's locale; unverified email addresses receive no email.
- [ ] #3 GET /v1/notifications, POST /v1/notifications/read, GET and PUT /v1/notification-prefs, POST and DELETE /v1/push-tokens and the signed unsubscribe link work per C10 with permission tests; DeviceNotRegistered deletes the token.
- [ ] #4 Nearby-alert pushes are limited to one per report per user; quiet-hour items are re-sent for the end of quiet hours.
- [ ] #5 Tests assert email_outbox rows (mocked) and push mock calls for each notification type in C10.
<!-- AC:END -->
