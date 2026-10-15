---
id: TASK-9.3
title: 'Web sign-in, sign-up, verification, reset, account page and guards'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 18:27'
labels:
  - fe
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-11.2
  - TASK-6.9
  - TASK-9.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P16-auth.md
  - docs/tech/contracts/C3-auth-profiles-roles.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-9
priority: high
ordinal: 143000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners need a quick account on the web with the same session rules as mobile (FR-001).

## Packet

Unblocks on: Web shell: header, footer, layout, route groups and guards, shared states merged (TASK-11.2); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Sign in, account creation and gates (P16) approved (TASK-9.1)
Design: P16 docs/design/pages/P16-auth.md (mockup docs/design/mockups/P16-auth.html; TASK-9.1)
Copy: docs/content/pages/P16-auth.md
Contracts: C3, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-9.3-auth-web
Branch: agent/task-9.3-e2e-main
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sign up, sign in (email and password; Google button only when configured), verify-email prompt, password reset and sign-out work on web in SL and EN per the P16 mockup.
- [ ] #2 An unverified account can save report drafts but sees a clear prompt when opening chat or alerts; the contextual sign-in dialog returns the user to where they were.
- [ ] #3 The account page edits name, language, home area, default alert radius and optional phone; the phone is never shown publicly.
- [ ] #4 Route guards for (app) and (admin) redirect correctly; middleware refreshes the Supabase session alongside next-intl.
- [ ] #5 Keyboard and screen-reader use meets WCAG 2.2 AA (axe 0 violations on all auth pages); repeated reset requests show the rate-limit message.
<!-- AC:END -->
