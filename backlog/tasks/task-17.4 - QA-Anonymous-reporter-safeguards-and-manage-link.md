---
id: TASK-17.4
title: 'QA: Anonymous reporter safeguards and manage link'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 18:37'
labels:
  - qa
  - 'qa:fail'
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-17.1
  - TASK-17.2
  - TASK-17.3
  - TASK-17.15
  - TASK-17.16
references:
  - docs/tech/frontend.md
  - docs/design/pages/P7-report-found.md
parent_task_id: TASK-17
priority: high
ordinal: 235000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-17 (Anonymous reporter safeguards and manage link) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-17 merged to main (TASK-17.1, TASK-17.2, TASK-17.3); leads add any later TASK-17 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given an anonymous submission, when received, then it needs a valid captcha token (privacy-friendly provider chosen in the TDD) and is rate limited per IP and device (default 5 per hour, 20 per day, configurable) with a friendly error.
- [x] #2 Given a created report, when the finder returns through the secret manage link (high entropy, invalid after close), then they can edit, close or mark returned and open chat on any device without an account.
- [x] #3 Given the anonymous finder, when they chat, then they act through an anonymous session bound to the report and can later claim it by creating an account.
- [x] #4 Given other stories, when they need it, then the anonymous submit endpoint, token model and RLS rules are documented as a contract slice.
- [x] #5 Given abuse patterns (many reports from one device, identical photo hash), when detected, then reports are held for moderation instead of published.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA on main 45abff2 (worktree reset to main). verify: merge queue, main at 45abff2.

AC#1 pass: API limits per IP and per device (5/h, 20/day from app_config) with RATE_LIMITED + Retry-After; rotating x-device-id and anonymous users from one IP still meets the IP limit (new test). Captcha = Supabase Auth Turnstile on anonymous sign-in, enforced server-side, so the mobile client flag cannot bypass it; nginx overwrites X-Forwarded-For (no IP spoofing). Off locally, cloud setting not checkable here. Minor: TASK-17.11 (EAS preview lacks EXPO_PUBLIC_CAPTCHA). Submit-form friendly note is TASK-30.2 (not on main).
AC#2 FAIL: token 256-bit, SHA-256 stored, cleared on close/reunite (claim after close 404, new test); claim on another device, mark returned and Messages work. Close fails on web and mobile (TASK-17.5, major); Edit is a 404 on web (TASK-17.7) and missing on mobile (TASK-17.8); focus lost after the confirm dialog (TASK-17.10, minor).
AC#3 pass: anonymous manager session, claim and Auth Admin conversion keep the same id (manage.routes 18/18); chat needs a managed report.
AC#4 pass: C7 (endpoints, token model, guard) + C4 (RLS deny-all, report_managers via the API).
AC#5 FAIL: holds on create work (device volume, photo hash) and a held report stays unpublished (GET 404 for others, off the map, no chat, matching and alerts skip it, photos not published; new test). Bypass: PATCH photo_ids skips the photo-hash hold (TASK-17.6, major).
AC#6 FAIL: /m ships 415 KB JS against the 256 KB budget (TASK-17.9). Lighthouse (Turbopack build, next start, loaded machine): /m and /en/m a11y 100, BP 96, CLS 0.082, desktop perf 98-99, mobile perf 65, LCP 4.9 s (consent banner, shell-wide); /captcha a11y 100, BP 100, 152 KB, perf 89 mobile / 100 desktop. axe 0 on /m (e2e), no ad slots.

Privacy: the token never appears in a request URL, a Referer (strict-origin-when-cross-origin), a request body other than the claim, an analytics argument, cookies, localStorage or history; it leaves the address bar at once (replaceState) and waits in sessionStorage for the tab. API logs redact body/url/query, email_outbox keeps only the address hash, the idempotency replay is encrypted, no pgboss payload. Observation: the GA4 init and page_view calls run while the hash is still in the address bar (page_location is the template /m, gtag.js loads after the hash is gone, so no hit carries it); stripping the hash before analytics init would remove the timing dependence. Mobile: token in expo-secure-store, screen_view uses the template; Firebase auto-collection on deep links needs a device.
Tests: API manage.routes 18/18, rateLimit/idempotency/ctx 24/24, reports.write 47/48 and report.lifecycle 5/6 (scratch DB has no geo seed or realtime schema; unrelated). Web vitest 40/40 (manage.test focus case flaky under load, passes alone). Mobile jest 54/54. e2e manage.spec 4/4 in Chromium and WebKit. Added: apps/api/test/routes/manage.qa.routes.test.ts (3), apps/web/e2e/manage-privacy.spec.ts (2, Chromium). Turbopack refuses the node_modules junction in a worktree: the QA build used a temporary uncommitted turbopack.root override. CHANGE row: C7 device-volume hold keys only on x-device-id.

Re-QA on main b965dff9 (worktree reset to main). verify, e2e, Lighthouse: merge queue on main at b965dff9 (AC#6 stays open until the queue records them).
AC#2 pass: 17.5 (Close sends reason other, web+mobile), 17.7 (Edit -> /r/<code>/uredi, page exists and gates on is_mine), 17.8 (mobile Edit), 17.10 (focus to h1) verified in code and tests; claim, resend (new token replaces the hash, 3/day, CONFLICT without email), reunited with confirm, extend, Kraj fact present on web and mobile. Gap: mobile /m never fires the C12 reunited event (TASK-17.14, minor); mobile has no resend row (CHANGE row). Added an e2e case to apps/web/e2e/manage.spec.ts (Close body, resend CONFLICT toast), not run here (no e2e on this machine).
AC#5 pass: guard keyed by ip_hash + device_hash, holds on device volume (>10 in 7 days) and photo hash, PATCH photo_ids now holds (17.6, manage.routes test).
Other: session_ended wipe keeps drafts, outbox and manage tokens (wipe.ts, offline-store tests). reunited params carry species/region/municipality only. EAS preview and production set EXPO_PUBLIC_CAPTCHA (17.11). TASK-17.12/17.13 (anonymous-to-account conversion) are not on main: noted, not failed. Tests: web vitest manage + report-found 54 pass; mobile jest manage/offline/outbox/report-found 83 pass (needed i18n and tokens dist built in the worktree).

Re-QA 2 on main 0b573340 (web only; app: later), live najdimo.si 69d07c9716f7 (same app code as main; later commits are docs/backlog). Result: qa:fail on AC#6 only.
AC#1-#5: code unchanged since re-QA 1 (pass). Live, as a visitor: POST /v1/manage/claim and a schema-valid POST /v1/reports without a session answer 401 UNAUTHENTICATED; /m and /en/m without or with an unknown token: no token in any request URL or Referer, token only in sessionStorage, address bar cleared, Referrer-Policy strict-origin-when-cross-origin, X-Robots-Tag noindex, no ad slot, no GA request or _ga cookie with analytics off; invalid-link state focuses its h1, 0 overflow at 320/390/1440 px, targets >= 44 px in main; Chromium and WebKit alike. The claim itself (Turnstile managed challenge) cannot be passed by automation, so close/returned/edit/chat stay verified by tests: web vitest manage, manage-link, auth, report-found 82/82 on main. TASK-17.13 (convert offer on /m, Low) still open.
AC#6 FAIL. pnpm verify: not run here (needs local Supabase; barred for this QA); evidence = merge gate on every merge plus green CI for the deployed 69d07c97. Lighthouse 12.6.1 on live, mobile x3 / desktop x1: /m and /en/m script 238.7 KB (TASK-17.9 fixed), a11y 100, BP 100, desktop perf 99; mobile perf 76-85, LCP 3.46-3.75 s (consent banner is the LCP element), CLS 0.112 (footer jumps when the skeleton is replaced) -> TASK-17.15 (CLS, minor), TASK-17.16 (perf/LCP, minor). /captcha: perf 89 mobile / 99 desktop, LCP 3.15 s, a11y 100, script 184 KB (Turnstile CSP console errors come from Cloudflare's own iframe).
Shell observations, not filed here: at 320 px with 200 % text the flow header 'Zapri' overflows 47 px (/m, /prijava/*, /vpis) and the public header 209 px (/kako-deluje) -> TASK-69 or a shell task; /kako-deluje still has the consent banner as its LCP element (TASK-112.1 is Done).
<!-- SECTION:NOTES:END -->
