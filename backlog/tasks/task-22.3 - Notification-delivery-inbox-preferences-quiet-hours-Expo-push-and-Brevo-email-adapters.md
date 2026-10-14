---
id: TASK-22.3
title: >-
  Notification delivery: inbox, preferences, quiet hours, Expo push and Brevo
  email adapters
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-14 22:41'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-6.7
  - TASK-6.3
  - TASK-10.1
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

Unblocks on: Matching, chat, notification and alert schema with RLS and seed merged (TASK-6.7); Job queue: pgmq, enqueue_job, pg_cron trigger, worker with handler registry merged (TASK-6.3); packages/i18n: ICU catalogues, key-parity and plural check, formatting helpers merged (TASK-10.1)
Contracts: C10, C16 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-22.3-notify-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 enqueue_notification and the notify handler store inbox rows (deduped), apply per-type channel preferences and quiet hours (Europe/Ljubljana; not for match_chip and chat_message), and deliver push through the Expo adapter and email through the Brevo adapter, both mock by default.
- [ ] #2 Push and email text use the @zivali/i18n notifications and email namespaces in the recipient's locale; unverified email addresses receive no email.
- [ ] #3 Register and unregister push token RPCs exist; DeviceNotRegistered results delete the token.
- [ ] #4 Nearby-alert pushes are limited to one per report per user; quiet-hour items are re-enqueued for the end of quiet hours.
- [ ] #5 Tests assert email_outbox rows (mocked) and push mock calls for each notification type in C10.
<!-- AC:END -->
