---
id: TASK-9.5
title: 'QA: Accounts and sign-in (email, Google, Apple)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 15:07'
labels:
  - qa
  - 'est:XS'
  - 'qa:fail'
milestone: m-0
dependencies:
  - TASK-9.2
  - TASK-9.3
  - TASK-9.4
  - TASK-9.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P16-auth.md
parent_task_id: TASK-9
priority: high
ordinal: 227000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-9 (Accounts and sign-in (email, Google, Apple)) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-9 merged to main (TASK-9.2, TASK-9.3, TASK-9.4, TASK-9.1); leads add any later TASK-9 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a visitor, when they register with email and password or sign in with Google or Apple, then an account and profile are created and they are signed in on web and mobile.
- [ ] #2 Given a new email account, when registered, then email verification is required before alerts or chat but not before saving a report draft.
- [ ] #3 Given a signed-in user, when they edit their profile, then name, language (SL or EN), home area, default alert radius and optional phone can be saved and the phone is never shown publicly.
- [ ] #4 Given the roles user, shelter_member, moderator and admin, when a request is made, then RLS and route guards enforce them and a test proves a user cannot read another profile.
- [ ] #5 Given a forgotten password, when the user requests a reset, then a localised email link resets it and repeated requests are rate limited.
- [ ] #6 Given the auth screens, when used with keyboard and screen reader, then they meet WCAG 2.2 AA.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-19 on main ef6c492f, web-only pilot (owner 2026-10-19). Live najdimo.si public GETs only (no sign-in, no submit), Playwright Chromium + WebKit at 1440 light, 390 dark, 320; code, unit tests and CI e2e (main green, 298 web e2e). Result: qa:fail, bugs TASK-9.7, TASK-9.8, TASK-9.9.
AC1 FAIL (web) / mobile deferred: web-only pilot (owner 2026-10-19). Email sign-up and sign-in built and tested (lib/auth.test.ts, components/auth/auth.test.tsx, e2e/auth.spec.ts), profile created on first API call by ensureProfile (auth.middleware.test.ts 'creates the missing profile'); Google path coded and unit-tested (signInWithOAuth, callback route.test.ts), but live /vpis, /registracija, /en/sign-in, /en/sign-up show no Google button (NEXT_PUBLIC_GOOGLE_SIGN_IN off in the deploy) -> TASK-9.7 (Medium). Apple deferred until the Apple Developer account (caller).
AC2 FAIL: alerts PUT requireVerified, conversation create requireVerifiedOrAnonymous (route tests 403 UNVERIFIED_EMAIL), drafts and unverified lost reports allowed (C4 CH-195, lost-flow unverified prop); but POST /v1/conversations/:id/messages has no verified check, so an unverified report manager can chat -> TASK-9.8 (Medium).
AC3 PASS: UpdateMeInput has display_name, locale, home, home_radius_km 1-25, phone (strict); account-settings saves name and optional phone (test 'never public'), language via profile locale sync, home and radius on alerts page; phone only in own Me DTO, chat and admin mappers exclude it (me.routes.test, admin mapper).
AC4 PASS: security tests (schema-exposure.test.ts) prove anon and authenticated get no privileges and no PostgREST access to any app table incl. profiles, RLS on every table; /v1/me returns only the caller; requireRole/requireAal2 matrix in admin.routes.test (user and shelter FORBIDDEN, staff without TOTP AAL2_REQUIRED). Live: GET api.najdimo.si/v1/me and /v1/me/reports 401 UNAUTHENTICATED; /racun, /racun/placila, /racun/obvestila, /en/account, /en/account/alerts 307 to sign-in with next.
AC5 PASS: recovery template SL/EN by user_metadata.locale (supabase/templates/recovery.html), reset sends the recovery callback and maps 429 to RATE_LIMITED (lib/auth.test.ts), e2e 'same answer for every address, then the rate-limit note'; config email max_frequency 60s; live reset pages render SL and EN (not submitted).
AC6 PASS (web) / mobile deferred: web-only pilot. Live axe wcag2a/aa/21/22aa 0 violations on 6 auth pages (Chromium all widths, WebKit 1440); Lighthouse a11y 100; labels above fields, autocomplete email/current-password/new-password/given-name, named show-password toggle, hints via aria-describedby; Tab order skip link, logo, Zapri, fields, toggle, forgot, submit, create, footer with visible focus; no overflow at 320; targets >= 44 px except inline Terms/Privacy links in a sentence (WCAG 2.5.8 inline exception); 0 console errors; noindex; no ad slots; e2e axe on error and success states.
AC7 FAIL: pnpm verify runs in merge.mjs before every merge and CI on main is green (verify:static, build, audit, 298 e2e); not rerun here (no suites in the main checkout). Quality for the touched pages: axe 0, console 0, no ads (PROTECTED) pass; Lighthouse mobile live perf 73-74, LCP 4.1-4.6 s, script 421-426 KB vs 256 KB budget (auth pages not in lighthouserc) -> TASK-9.9 (Low). Best practices 96; SEO 63 only from intended noindex.
Cross-browser: Chromium and WebKit identical (render, axe, overflow, redirects).
<!-- SECTION:NOTES:END -->
