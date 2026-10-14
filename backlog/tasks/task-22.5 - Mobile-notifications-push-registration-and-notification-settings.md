---
id: TASK-22.5
title: 'Mobile notifications, push registration and notification settings'
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
  - TASK-12.3
  - TASK-6.10
  - TASK-22.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C10-notifications-alerts.md
  - docs/design/pages/P13-alerts-inbox-settings.md
parent_task_id: TASK-22
priority: high
ordinal: 192000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Push is how owners hear about chip matches within minutes (FR-010).

## Packet

Unblocks on: Mobile shell: tabs, Report action, permission primer, settings stack merged (TASK-12.2); Mobile sign-in, sign-up, verification, reset and profile merged (TASK-9.4); Deep links (App Links, universal links) and push token registration path merged (TASK-12.3); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); Design: Notifications, nearby alerts and settings (P13) approved (TASK-22.2)
Design: P13 docs/design/pages/P13-alerts-inbox-settings.md (mockup docs/design/mockups/P13-alerts-inbox-settings.html; TASK-22.2)
Copy: docs/content/pages/P13-alerts-inbox-settings.md
Contracts: C10 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-22.5-notify-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The Inbox tab shows notifications with unread counts in real time and mark-as-read, per P13.
- [ ] #2 After the notifications primer the device registers its push token on sign-in and unregisters on sign-out; denial falls back to in-app and email.
- [ ] #3 Tapping a push opens the target screen through the deep-link routes; settings control types, channels and quiet hours.
<!-- AC:END -->
