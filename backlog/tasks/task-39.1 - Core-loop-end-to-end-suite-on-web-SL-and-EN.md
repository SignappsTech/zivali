---
id: TASK-39.1
title: Core-loop end-to-end suite on web (SL and EN)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
labels:
  - tech
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-29.4
  - TASK-30.2
  - TASK-20.3
  - TASK-21.3
  - TASK-26.4
  - TASK-31.4
  - TASK-22.4
  - TASK-13.2
  - TASK-19.1
  - TASK-20.2
  - TASK-22.3
  - TASK-21.2
  - TASK-17.1
  - TASK-26.3
  - TASK-31.3
  - TASK-14.1
references:
  - docs/tech/frontend.md
  - docs/tech/backend.md
  - docs/tech/contracts/C12-analytics-consent.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-39
priority: high
ordinal: 217000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stories are built in parallel against contracts; this suite proves the whole loop works together before M2 closes.

## Packet

Unblocks on: Web lost flow: signed-out draft hand-off and confirmation screen merged (TASK-29.4); Web quick found or sighted report without an account merged (TASK-30.2); Web match review: compare, confirm, reject merged (TASK-20.3); Web inbox and conversation: realtime chat with safety banner merged (TASK-21.3); Web My reports, owner actions and reunited screen merged (TASK-26.4); Web map and list browse with filters merged (TASK-31.4); Web notifications view, unread badge and notification settings merged (TASK-22.4); Web consent banner and Cookie settings merged (TASK-13.2); Matching engine v1: chip, geo, time, attributes; idempotent suggestions merged (TASK-19.1); Match review RPCs: suggestions, confirm (opens chat), reject with feedback merged (TASK-20.2); Notification delivery: inbox, preferences, quiet hours, Expo push and Brevo email adapters merged (TASK-22.3); Chat backend: conversations, send_message rules, realtime, notifications, retention merged (TASK-21.2); Anonymous safeguards: rate limits, holds, manage token, claim, resend merged (TASK-17.1); Report lifecycle: transition_report, reminders, expiry, reunite effects merged (TASK-26.3); search_reports: filters, viewport and distance, map mode, pagination merged (TASK-31.3); Photo registration, server validation, publishing and cleanup merged (TASK-14.1)
Contracts: C12, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-39.1-e2e-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A Playwright suite runs the core loop on the local stack in SL and EN: lost report, found report without account, match suggested, owner confirms, chat between both, mark reunited.
- [ ] #2 With the same chip on both reports the owner receives the chip-match notification in the test inbox within 2 minutes (worker drained).
- [ ] #3 With consent denied no analytics request is sent; with consent granted the taxonomy events fire with region and species and no personal data.
- [ ] #4 The suite runs in CI and `pnpm verify` and is stable over 5 consecutive runs.
<!-- AC:END -->
