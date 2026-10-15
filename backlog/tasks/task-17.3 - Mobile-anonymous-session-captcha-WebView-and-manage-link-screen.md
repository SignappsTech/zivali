---
id: TASK-17.3
title: 'Mobile anonymous session, captcha WebView and manage-link screen'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 19:26'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-12.2
  - TASK-12.3
  - TASK-6.9
  - TASK-30.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C7-anonymous-manage-link.md
  - docs/design/pages/P7-report-found.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-17
priority: high
ordinal: 162000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Most finders report from a phone; the manage link must open in the app when installed (FR-006, FR-037).

## Packet

Unblocks on: Mobile shell: tabs, Report action, permission primer, settings stack merged (TASK-12.2); Deep links (App Links, universal links) and push token registration path merged (TASK-12.3); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Report found or sighted (no account) and manage page (P7) approved (TASK-30.1)
Design: P7 docs/design/pages/P7-report-found.md (mockup docs/design/mockups/P7-report-found.html; TASK-30.1)
Copy: docs/content/pages/P7-report-found.md
Contracts: C7, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-17.3-anon-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Anonymous sign-in obtains a Turnstile token through a WebView of the web /captcha page when captcha is enabled, and skips it otherwise.
- [x] #2 Opening a manage link (universal link or zivali://m#token) signs in anonymously, claims the report and shows the manage screen from P7; unknown or expired links show clear errors.
- [x] #3 Manage tokens are stored in expo-secure-store; failures keep the draft and retry automatically when online.
- [x] #4 Every request carries x-device-id; no ad component on the manage screen.
<!-- AC:END -->
