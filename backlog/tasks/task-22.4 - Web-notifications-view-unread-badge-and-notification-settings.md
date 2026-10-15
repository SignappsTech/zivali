---
id: TASK-22.4
title: 'Web notifications view, unread badge and notification settings'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-15 23:21'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-11.2
  - TASK-9.3
  - TASK-6.10
  - TASK-22.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C10-notifications-alerts.md
  - docs/design/pages/P13-alerts-inbox-settings.md
parent_task_id: TASK-22
priority: high
ordinal: 191000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users need one inbox for matches, chat and alerts and control over channels and quiet hours (FR-010).

## Packet

Unblocks on: Web shell: header, footer, layout, route groups and guards, shared states merged (TASK-11.2); Web sign-in, sign-up, verification, reset, account page and guards merged (TASK-9.3); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); Design: Notifications, nearby alerts and settings (P13) approved (TASK-22.2)
Design: P13 docs/design/pages/P13-alerts-inbox-settings.md (mockup docs/design/mockups/P13-alerts-inbox-settings.html; TASK-22.2)
Copy: docs/content/pages/P13-alerts-inbox-settings.md
Contracts: C10 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-22.4-notify-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The header shows an unread badge updated in real time; /inbox?view=notifications lists notifications with mark-as-read and deep links to their targets, per P13.
- [ ] #2 /account/notifications lets the user control each notification type per channel and set quiet hours.
- [ ] #3 Empty and error states follow the design system; axe 0 violations; Playwright covers read and preference changes.
<!-- AC:END -->
