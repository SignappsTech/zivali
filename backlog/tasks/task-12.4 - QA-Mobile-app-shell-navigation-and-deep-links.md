---
id: TASK-12.4
title: 'QA: Mobile app shell, navigation and deep links'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-16 01:51'
labels:
  - qa
  - 'qa:fail'
  - 'est:XS'
milestone: m-0
dependencies:
  - TASK-12.2
  - TASK-12.3
  - TASK-12.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P2-mobile-shell.md
parent_task_id: TASK-12
priority: medium
ordinal: 230000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-12 (Mobile app shell, navigation and deep links) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-12 merged to main (TASK-12.2, TASK-12.3, TASK-12.1); leads add any later TASK-12 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given the app, when launched signed in or out, then bottom tabs (Map, Report, Inbox, Profile) and a prominent Report action are available.
- [ ] #2 Given a listing link or poster QR, when opened on a phone with the app, then it deep-links to the report screen, and without the app it opens the web page (universal and app link configuration verified in dev builds).
- [x] #3 Given camera, location and notifications, when first needed, then a plain-language explainer precedes the OS prompt and a denial leaves a working fallback (manual location, gallery).
- [x] #4 Given an EAS development build, when run, then the push token registration code path exists and uses a mock until Firebase and APNs credentials arrive (Q-007).
- [x] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-16 on main 01a32d5 (worktree reset to main).

Gates: verify: merge queue, main at 01a32d5 (full pnpm verify not run here per machine rules). Mobile jest --maxWorkers=2: 36 suites / 418 tests pass before QA tests; 37 / 437 with them. Mobile tsc --noEmit clean; eslint + prettier clean on the changed tests. Web vitest lib/app-links.test.ts 3/3. pnpm quality: n/a (story touches no web pages; only /.well-known route handlers, which proxy.ts's matcher skips (dot in path)).

AC#1 PASS: four items in P2 order (Map, Inbox, Report action, Profile), Report is a button and opens the sheet, signed out and signed in (QA test added in shell.test.tsx). Targets min-h-11 (44 px), focus ring on NavItem for keyboard/D-pad. Report choices push /report/lost and /report/found, which have no screens until TASK-29.5 / TASK-30.3 (see TASK-12.7).
AC#2 FAIL: TASK-12.6 (Major): every /r/<code>/<sub> link (email match link /r/<code>/ujemanja, /en/r/<code>/matches, /spet-doma, /poster.pdf, /opengraph-image) is claimed by the app and lands on the map. Otherwise OK: app.config adds applinks + autoVerify https intent filters for /r/, /en/r/, /m, /en/m, /payments/ from EXPO_PUBLIC_APP_URL; +native-intent allowlist maps unknown links to /; malformed links (bad %-escapes, empty, javascript:, 4000-char code, /r/..) render without throwing (new deep-link-landing.test.tsx). Staging https://staging.najdimo.si/.well-known/assetlinks.json and /apple-app-site-association: 200, application/json, no redirect, but empty ([] and details: []) because ANDROID_CERT_SHA256 and APPLE_TEAM_ID are unset (CHANGE row filed). The development EAS profile sets no EXPO_PUBLIC_APP_URL, so dev builds only get zivali://; https link verification needs a preview build on a device.
AC#3 PASS (code + jest): PermissionPrimer before the OS prompt, only while canAskAgain; camera denied/Not now -> gallery (photos.test), location denied -> search + pin with PermissionNote (location-picker.test), notifications primer in settings + denied note in the inbox (notifications.test). The camera primer is mounted by the P6/P7 flows (TASK-29.5, TASK-30.3, not merged).
AC#4 PASS: development profile EXPO_PUBLIC_PUSH_PROVIDER=mock; registerToken sends ExponentPushToken[mock-<platform>] through registerPushToken; env refuses mock in production; deep-links.test covers mock, expo, denied, failure, sign-in, sign-out. Note: preview profile uses expo while the FCM key is not uploaded; getExpoPushTokenAsync fails silently (caught).
AC#5 PASS (recorded above).
Push and notification taps: lib/push.ts open() -> toTargetPath allowlist (/r/<code>, /r/<code>/matches, /inbox/<id>, /settings/payments, else /inbox). /r/<code>/matches and /inbox/<id> have no screens yet (TASK-20.4, TASK-21.4) and show Expo's default Unmatched page: TASK-12.7 (Minor).

Needs a device: TalkBack/VoiceOver on tabs (role tab + selected, Report announced as button), sheet focus trap and title announcement; App Links autoVerify and iOS universal links on a real install (needs ANDROID_CERT_SHA256 / APPLE_TEAM_ID on staging, Q-007 for iOS); real OS permission prompts and the Allow -> OS flow; push tap from a cold start; hardware keyboard / D-pad traversal; 320 px width and 200 % text on a phone.

Bugs: TASK-12.6 (Major), TASK-12.7 (Minor).
<!-- SECTION:NOTES:END -->
