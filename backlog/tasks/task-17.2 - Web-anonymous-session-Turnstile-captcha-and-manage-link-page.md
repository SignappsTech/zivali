---
id: TASK-17.2
title: 'Web anonymous session, Turnstile captcha and manage-link page'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 18:35'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-11.2
  - TASK-6.9
  - TASK-30.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C7-anonymous-manage-link.md
  - docs/design/pages/P7-report-found.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-17
priority: high
ordinal: 161000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finders without an account must be able to return to their report from any device through a private link (FR-006).

## Packet

Unblocks on: Web shell: header, footer, layout, route groups and guards, shared states merged (TASK-11.2); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Report found or sighted (no account) and manage page (P7) approved (TASK-30.1)
Design: P7 docs/design/pages/P7-report-found.md (mockup docs/design/mockups/P7-report-found.html; TASK-30.1)
Copy: docs/content/pages/P7-report-found.md
Contracts: C7, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-17.2-anon-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A Turnstile component (no extra dependency) yields a token when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set and is skipped otherwise; signInAnonymously uses it; /captcha hosts the widget for the mobile WebView and posts the token back.
- [ ] #2 /m and /en/m read the token from the URL fragment, sign in anonymously, call claim_manage_token and show the manage page from P7 (status, edit, close, mark returned, open chat) with clear errors for unknown or expired links.
- [ ] #3 The manage token returned at submit is stored locally for that report; the success screen shows and copies the manage link.
- [ ] #4 Captcha or network failure keeps the draft and retries automatically every 60 s and on reconnect with a calm message.
- [ ] #5 Every request carries x-device-id; no ad slot is rendered on the manage page (quality-kit helper).
<!-- AC:END -->
