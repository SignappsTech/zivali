---
id: TASK-30.4
title: 'QA: Quick found or sighted report without an account'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 19:16'
labels:
  - qa
  - 'qa:fail'
milestone: m-1
dependencies:
  - TASK-30.1
  - TASK-30.2
  - TASK-30.3
  - TASK-88.2
  - TASK-30.8
  - TASK-112
references:
  - docs/tech/frontend.md
  - docs/design/pages/P7-report-found.md
parent_task_id: TASK-30
priority: high
ordinal: 248000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-30 (Quick found or sighted report without an account) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: Web quick found or sighted report without an account merged (TASK-30.2); Mobile quick found or sighted report (submits through the outbox) merged (TASK-30.3); Design: Report found or sighted (no account) and manage page (P7) approved (TASK-30.1); Shelter directory API: models, versioned seed, public lookup endpoints merged (TASK-88.2)
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a visitor on a phone, when they open Report found, then a short sequence (photo, location pre-filled from GPS or EXIF, I have the animal or I only saw it, optional note, optional contact email) completes in under 60 s median in usability testing.
- [x] #2 Given an accepted submission, when saved, then the report is live, the finder gets a private manage link (and an email if given) and matching and alerts run.
- [x] #3 Given I have the animal, when published, then the public location is where it was found (fuzzed) and where it is kept is never asked for or shown.
- [x] #4 Given a lost listing, when a visitor taps I saw this pet, then a SIGHTED report is created linked to that lost report.
- [x] #5 Given anonymous submissions over the limits, when received, then the safeguards from the anonymous-reporter story apply and the user sees a friendly message.
- [x] #6 Given the flow, when it starts and when it is submitted, then report_found_start and report_found_submit fire (consent only) and no ad appears anywhere in the flow.
- [x] #7 Given a submitted found report, when the confirmation shows (after submit, so the 60 s target is unaffected), then a notice says the find should be reported to the responsible shelter within 24 hours with call buttons from the directory and that any vet or shelter can read the chip; the legal timing appears only when the legal-content flag is on, and the notice also shows once a queued offline report is sent.
- [ ] #8 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-16 on main e2457eef. vitest web report-found+private-link 33 pass (+1 expected-fail); jest mobile report-found 13 pass; i18n check SL/EN OK. Gate AC8 (verify, e2e, Lighthouse, quality): merge queue on main at e2457eef. AC1 judged from code: 5 steps/about 8 taps, usability median not measured. AC2 matching/alerts are API side, not re-run (no API tests). Note: web anonymous session starts at the first photo upload, not only at Publish (TASK-17.9 design). Bugs: TASK-30.6 (web held linked sighting copy, medium), TASK-30.7 (mobile CONFLICT/429 drop the key, medium).

QA re-run 2026-10-19, web only (app: later). Main a0ae40f6 read-only; live najdimo.si 69d07c9716f7 (report-found code identical to main; main 38 commits ahead, none in report-found). Unit: vitest report-found, linked, manage, turnstile, shelter-row, photo-picker 7 files 103 pass (TASK-30.6 fix in, no it.fails left); i18n check OK. verify/build/audit/e2e: lead, deploy-after-green-ci, 2026-10-19 (not run here: no DB, no build). Live (Chromium 390/320/1440, WebKit 390 with an OffscreenCanvas test shim, keyboard only 1440): 5 steps, 8 actions, GPS prefill (Center, Ljubljana), 'Ne sprasujemo, kje je zival zdaj', focus to h1 each step, 0 overflow, axe 0 on all steps and the linked sighting entry, 0 ad slots, 0 ad or analytics requests, no _ga (GA not on staging: CSP has no GA, mock provider). AC4 live: Sporoci opazanje on /r/EPeTbe2e opens the 3-step linked flow. AC3 live: public found reports show area only (radius 150 m, grid point). Publish not done live: Turnstile interactive challenge in headless, not solved (no test report created, nothing to remove). AC2/5/7 from unit tests + live /v1/shelters/responsible (Ljubljana confirmed, phone) + legal_timings flag off. AC8 FAIL: Lighthouse live /prijava/najdena-zival mobile perf 69/62/67, LCP 4.2-5.6 s (consent banner, TASK-112.1), script 431 372 B vs 300 000 (TASK-112; was 314 569 on 2026-10-16); a11y 100, BP 96, SEO 66 (staging noindex). Desktop perf 98. Bugs: TASK-30.8 (captcha challenge off screen and unexplained, medium). Gated on TASK-30.8 and TASK-112.
<!-- SECTION:NOTES:END -->
