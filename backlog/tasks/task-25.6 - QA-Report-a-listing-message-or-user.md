---
id: TASK-25.6
title: 'QA: Report a listing, message or user'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 20:16'
labels:
  - qa
  - 'est:XS'
  - 'qa:fail'
milestone: m-1
dependencies:
  - TASK-25.1
  - TASK-25.2
  - TASK-25.3
  - TASK-25.4
  - TASK-25.5
  - TASK-25.7
references:
  - docs/tech/frontend.md
  - docs/design/pages/P10-report-abuse.md
  - docs/design/pages/P19-admin-shell.md
parent_task_id: TASK-25
priority: medium
ordinal: 243000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-25 (Report a listing, message or user) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-25 merged to main (TASK-25.2, TASK-25.3, TASK-25.4, TASK-25.5, TASK-25.1); leads add any later TASK-25 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a listing or profile, when a user taps Report abuse, then they pick a reason (scam, fake, spam, inappropriate image, other), add an optional note and submit, and anonymous visitors can report listings too (rate limited).
- [x] #2 Given a submitted report, when stored, then it links to the target with reason and reporter, a confirmation is shown and duplicates from the same user are ignored.
- [x] #3 Given 3 independent abuse reports on one listing (default), when received, then the listing is hidden from public view pending review and the owner is told.
- [x] #4 Given a chat message report from the chat screen, when submitted, then the same abuse model is used.
- [x] #5 Given flags, when stored, then moderators can read them through the admin shell until the full queue exists (M4).
- [x] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
  - QA note: verify, e2e, Lighthouse: merge queue on main at e2457eef. Local: web vitest (abuse, admin, matches, chat, report) and mobile jest (report-abuse, report-detail) green; i18n check OK.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA run 2026-10-19 (web only; app: later) on main 76866f50→c2040993 (no abuse/dialog/admin/slot-C diff), live najdimo.si 030da43f44fe (dialog checks) and 1ce206002ec1 (admin, Lighthouse); no story-file diff between either and main. FAIL: 1 Low bug, TASK-25.7 (owner hidden note lacks P10/P9 'Pišite podpori' action).
AC1 PASS: live signed-out, Chromium 320/390/1440 + WebKit 390/1440, SL+EN: Več možnosti 44x44, menuitem 48 px, keyboard Enter/Enter opens, focus on h2, 5 reasons in a labelled radiogroup (arrows move+check, Space), rows >= 64 px, Pošlji 56 px disabled with aria-describedby 'Najprej izberite razlog.', Prekliči 44 px, note max 500 with counter from 50 left, dialog 440 px desktop, no overflow at 320, axe 0, Escape/Prekliči close and refocus the trigger (WebKit after ~200 ms), state reset on reopen, 0 abuse/signup/captcha requests before send (lazy C7), 0 page errors. Never sent live (rule). Send/anonymous session/rate limit: e2e report-abuse.spec (CI) + vitest. API: anon + profile targets, 10/h per user and per IP.
AC2 PASS: API 201 + duplicate 200 with first id, reason/reporter/target stored; confirmation 'Hvala' focused (e2e, vitest).
AC3 PASS (with TASK-25.7): weight 3 hides, flag, photo.publish, report_hidden to managers only, 410 public (reports.routes GONE), search excludes hidden; restore resets weight.
AC4 PASS: chat message + profile report via the same dialog/C11 (chat.test), participant-only FORBIDDEN (API).
AC5 PASS: /v1/admin lists aal2 + audited (API), admin abuse-reports vitest; live signed-out /admin/prijave-zlorab and /en/admin/abuse-reports go to sign-in with next, no admin data or API calls.
AC6 PASS with known exceptions: verify:static PASS (prettier, eslint, 49 script tests, secretlint); turbo lint+typecheck web/api/packages 13/13; web vitest 46/46; packages/api abuse 2/2; i18n OK; API on scratch task_25_6_qa (dropped): abuse+admin 38/38 at c2040993, reports+search 74/77 (3 failures = scratch DB has no GURS municipalities seed: area names/in_slovenia, not this story). Build + e2e: lead, deploy-after-green-ci, 2026-10-19. Lighthouse /r/tGqYLMmT on 1ce20600: mobile perf 77 LCP 4.8 s (known TASK-18.5/112), desktop perf 82/87/96 over 3 runs (TBT variance, script 542 KB map: known 18.6), a11y 100, BP 100, SEO 69 (staging noindex), label-content-name-mismatch (known 38.7/115.13).
<!-- SECTION:NOTES:END -->
