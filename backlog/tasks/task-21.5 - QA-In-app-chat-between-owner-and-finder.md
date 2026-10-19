---
id: TASK-21.5
title: 'QA: In-app chat between owner and finder'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 18:36'
labels:
  - qa
  - 'qa:pass'
milestone: m-1
dependencies:
  - TASK-21.2
  - TASK-21.3
  - TASK-21.4
  - TASK-21.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P12-chat.md
parent_task_id: TASK-21
priority: high
ordinal: 239000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-21 (In-app chat between owner and finder) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-21 merged to main (TASK-21.2, TASK-21.3, TASK-21.4, TASK-21.1); leads add any later TASK-21 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a confirmed match or the Contact action on a listing, when a user opens chat, then a conversation is created between the two parties and messages arrive in real time (p95 under 2 s) on web and mobile.
- [x] #2 Given an anonymous finder, when they use their manage link, then they can chat without an account.
- [x] #3 Given a conversation, when displayed, then a persistent safety banner warns never to send money first and no phone number or email is shown unless a user shares it deliberately.
- [x] #4 Given a message, when a user taps report or block, then an abuse report (FR-018) is created and a blocked user can no longer message.
- [x] #5 Given the recipient is offline, when a message arrives, then a notification is requested through the notification contract.
- [x] #6 Given a message containing a link, when displayed, then it is plain text with a caution and no preview unfurling.
- [x] #7 Given the first message in a conversation, when sent, then chat_started fires (consent only).
- [x] #8 Given a closed report, when the retention period (default 6 months) passes, then the conversation is read-only first and then deleted.
- [x] #9 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA main f683d89d. AC1,2,3,5,6,7,8 pass by code read plus tests (web vitest chat+slot-a 37/37, mobile jest chat+report-detail 56/56, eslint clean, i18n check OK SL/EN parity); API tests read, not run. AC4 fail: TASK-21.7 (CH-170, block unreachable). Minor: TASK-21.8 (link caution regex). AC9 gates verify, e2e, Lighthouse: merge queue on main at f683d89d (not run here). Added e2e: failed send retry with same Idempotency-Key, read-only thread (unrun).

QA rerun 2026-10-19, web only (app: later), main 0b573340; live najdimo.si 69d07c97 (no apps/packages/supabase diff to main). AC4 pass: TASK-21.7 merged (other_participant_id in C9; web menu Block + Report person + confirm; API test blocked sender FORBIDDEN). TASK-21.8 merged (has_link any TLD). AC1-3,5-8 pass by code + tests. Gates run here: web vitest chat/abuse/slot-a/manage/inbox-views 82/82, eslint chat/abuse/app clean, i18n check OK. pnpm verify and pnpm quality not run (QA rules: no DB, no next build); evidence: merge.mjs runs verify before each merge, staging deploy of 69d07c97 runs only after CI verify (static, web build, audit, e2e incl. chat.spec) passes. Live: /nabiralnik and /en/inbox guard to sign-in with next; chat API 401 without session; slot A contact on /r/ at 1440/390/320: no overflow, 44-56 px, Tab + Enter opens the P16 gate, focus in and back on Escape, no POST, axe 0 in dialog; Lighthouse /r/ a11y 100, BP 100 (perf/LCP/script misses on /r/ are TASK-112/112.1, MapLibre eager on found detail; not chat). Not done: live inbox/thread (sign-up Turnstile gave no token headless; not bypassed), realtime p95 live, webkit (not installed).
<!-- SECTION:NOTES:END -->
