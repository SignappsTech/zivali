---
id: TASK-13.4
title: 'QA: Consent banner and preferences (web and mobile)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 18:37'
labels:
  - qa
  - 'est:XS'
  - 'qa:fail'
milestone: m-0
dependencies:
  - TASK-13.1
  - TASK-13.2
  - TASK-13.3
  - TASK-13.8
references:
  - docs/tech/frontend.md
  - docs/design/pages/P17-consent.md
parent_task_id: TASK-13
priority: high
ordinal: 231000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-13 (Consent banner and preferences (web and mobile)) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-13 merged to main (TASK-13.2, TASK-13.3, TASK-13.1); leads add any later TASK-13 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a first web visit or first mobile launch, when the page or app loads, then a banner or sheet in the user language offers Accept all, Reject all and Customise with equal visual weight and nothing pre-selected.
- [x] #2 Given the user rejects or ignores the banner, when browsing, then only strictly necessary storage is used and Consent Mode signals stay denied.
- [x] #3 Given the user accepts, when the choice is stored, then the record holds choice, version and timestamp, applies to analytics adapters at once and persists across sessions.
- [x] #4 Given any page or the app settings, when the user opens Cookie settings, then they can change or withdraw consent as easily as they gave it.
- [ ] #5 Given keyboard and screen reader use, when the banner appears, then it is labelled, focus-managed and meets WCAG 2.2 AA.
- [x] #6 Given the consent version changes (new vendor or purpose) or 12 months pass, when the user returns, then consent is requested again.
- [x] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-16 on main b7dc52d (worktree reset to main). Result: qa:fail (AC#5).

Gates: verify: merge queue, main at b7dc52d. pnpm quality not run (no further web production builds on this shared machine); its consent guard is vacuous anyway (mock provider), CHANGE row in backlog/changes.md. Axe (wcag2a/aa, 21aa, 22aa) clean on the banner first view and Customise at 1440, 390 and 320 px. Unit: packages/analytics 18/18, web vitest consent/providers/screen-views 26/26, i18n check OK, mobile jest consent/analytics/shell/ad-slot 36/36 (3 new Cookie settings tests).

E2E (ga4 build, G-E2ETEST, every Google request fulfilled locally), new apps/web/e2e/consent-qa.spec.ts + consent.spec + analytics.spec: Chromium 55/55 (3 known bugs as test.fail). WebKit desktop + iPhone 13: all criteria pass; engine artifacts only (no focus on mouse click, Tab skips links, SameSite reported None), plus the TASK-13.6 focus race.

AC#1 pass: all 35 public pages (content, legal, auth, /m, shelters, 404), SL and EN: dialog and copy in the page language, Reject/Accept/Customise identical (bg-secondary, same size, >= 44 px), Customise starts off, necessary locked on; no overflow at 320 px, header uncovered; 200 % text scrolls inside the banner. Mobile: jest, equal secondary buttons, nothing stored until a choice.
AC#2 pass: no googletagmanager/google-analytics request, no _ga cookie, no dataLayer/gtag before a choice, after Escape/ignore, or after Reject across navigation (expectNoAnalyticsBeforeConsent on every page); cookies only zz_consent and NEXT_LOCALE. Mobile firebase.json starts collection off and all four signals denied; grant sets ad_* false. All taxonomy events (report_*, match_*, chat_started, donation, ad_impression, ad_click, share, poster_download, reunited, alert_opt_in) go through track(); no direct gtag/logEvent outside packages/analytics. Ads are first-party and contextual (slot, locale, species), impressions aggregated without cookies: non-personalised without consent. Web sends no events but page_view (no web track() calls).
AC#3 pass: zz_consent {v:1, analytics, ts}, Max-Age 365 d, Path /, SameSite Lax; GA loads at once; a new browser session keeps it. Mobile: expo-secure-store zz_consent.
AC#4 pass: footer Cookie settings on every page opens Customise with the stored choice; grant or withdrawal in two steps; withdrawal clears _ga/_ga_*, sets ga-disable, toast; Profile row opens the same on mobile (resetAnalyticsData on withdraw). Sync: web cookie and mobile secure-store are separate by design (C12), no server copy.
AC#5 FAIL: TASK-13.5 (medium) WCAG 2.4.11, focused footer controls entirely behind the open banner (17 at 390 px, 9 at 1440 px); TASK-13.6 (low) first visit on /m keeps focus on the page heading (race; WebKit sometimes elsewhere). Otherwise labelled non-modal dialog, aria-describedby, heading focus, keyboard Tab/Enter/Space/Escape, focus returns to Cookie settings.
AC#6 pass: a 13-month-old grant or an older version asks again and sends nothing; TASK-13.7 (low) web never shows the a-year-has-passed sentence (cookie expires with the choice).

Needs a device: iOS no ATT prompt and no IDFA (no NSUserTrackingUsageDescription, no ATT code; check the built Podfile/AdSupport); Android Firebase consent mode in DebugView (no events before grant, analytics_storage granted with ad_* denied after, AD_ID not collected; consider google_analytics_adid_collection_enabled false); sheet after permission primers and never over the camera (code mounts it at launch on any route); TalkBack/VoiceOver announce the sheet as Cookie choice; 200 % font scale scrolls inside the sheet.

QA re-run 2026-10-19 (web only; app: later) on live https://najdimo.si version 69d07c9716f7 (no code diff to main 0b573340), read-only visitor, Playwright 1.64 scripts from the scratchpad (Chromium + WebKit, Google hosts answered locally). Result: qa:fail (AC#5, WebKit only) -> TASK-13.8 (medium).
- Re-checks: TASK-13.5 fixed in Chromium (2.4.11: 0 hidden on /, /en, /en/faq at 320, 390, 1440; also 768, 1024 on FAQ) but not in WebKit (FAQ summaries focused under the banner, page not scrolled: TASK-13.8). TASK-13.6 fixed (/m, /en/m 6/6 in both engines). TASK-13.7 fixed (cookie 400 d; 366-day grant shows the year sentence).
- AC#1 pass: 33 public pages SL/EN, both engines: dialog in page language, heading focused, Reject/Accept identical (secondary, 197x44 / 171x44 / 136x44), none primary, Customise a text button 103x44 per CH-630 (design change, P17 not yet amended); Customise starts off, Essential locked on; no overflow at 320/390/1440, header uncovered; 200 % text at 320 scrolls inside; reduced motion no animation. Banner 39 % of 390x844 on /en (280 px = 33 % on /).
- AC#2 pass: no Google request, no _ga, no dataLayer/gtag before a choice, after Escape+reload or after Reject across navigation; cookies only NEXT_LOCALE (+ zz_consent after a choice); localStorage device_id on 2 pages (necessary per cookie policy, abuse limits).
- AC#3 pass: zz_consent {v:1, analytics, ts}, Max-Age 400 d, Path /, Secure, SameSite Lax (WebKit reports None, engine artefact); new session keeps it. GA start at once not observable live: build uses the mock provider (TASK-7.5); covered by CI e2e on the ga4 build.
- AC#4 pass: footer Cookie settings on all 33 pages; opens the settings view with the stored choice, heading focused; grant and withdrawal both switch + Save, toast 'Choice saved.'. _ga clearing not observable live (mock adapter, TASK-7.5); CI e2e covers it.
- AC#5 FAIL (WebKit): TASK-13.8. Otherwise pass both engines: labelled non-modal dialog (aria-label Cookie choice, aria-describedby consent-body), axe wcag2a/aa/21aa/22aa 0 violations on banner and settings view at 1440/390/320 (whole page clean too), keyboard Tab/Shift+Tab/Enter/Space/Escape, focus back to Cookie settings.
- AC#6 pass: 366-day grant -> year sentence, older version -> asked again, nothing sent; 335-day choice not asked.
- AC#7: pnpm verify via merge queue; CI ci+deploy green on 69d07c97 (consent-qa.spec Chromium, no test.fail left). pnpm quality not run locally (QA rules); Lighthouse mobile on live, 1 run, machine shared with other agents: /piskotki perf 0.94, a11y 1.00, BP 0.93 (Cloudflare email-decode CSP + React #418, known from TASK-4.3), SEO 0.66 (staging noindex by design), LCP 3.0 s (consent text), CLS 0; / and /en perf 0.87, LCP 4.0 s (hero image, not the banner; TASK-112/90.5 scope), a11y 1.00, CLS 0, script 156 KB.
- App: later (device checks listed in the 2026-10-16 note).
<!-- SECTION:NOTES:END -->
