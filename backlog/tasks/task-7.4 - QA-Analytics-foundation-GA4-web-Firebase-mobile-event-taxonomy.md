---
id: TASK-7.4
title: 'QA: Analytics foundation: GA4 web, Firebase mobile, event taxonomy'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 15:02'
labels:
  - qa
  - 'est:XS'
  - 'qa:fail'
milestone: m-0
dependencies:
  - TASK-7.1
  - TASK-7.2
  - TASK-7.3
references:
  - docs/tech/frontend.md
parent_task_id: TASK-7
priority: high
ordinal: 224000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-7 (Analytics foundation: GA4 web, Firebase mobile, event taxonomy) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-7 merged to main (TASK-7.1, TASK-7.2, TASK-7.3); leads add any later TASK-7 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given the web app and no analytics consent, when pages load, then no GA script is fetched and no analytics cookie is set, and Consent Mode v2 defaults (analytics_storage, ad_storage, ad_user_data, ad_personalization) are denied before any tag.
- [ ] #2 Given consent is granted, when a user navigates, then GA4 receives page views on web and Firebase Analytics receives screen views on mobile in the same property through a separate data stream.
- [x] #3 Given the taxonomy, when a developer calls track(), then only registered events with allowlisted parameters are accepted: report_lost_start, report_lost_submit, report_found_start, report_found_submit, match_suggested, match_confirmed, chat_started, reunited, boost_purchase, donation, supporter_subscribe, ad_impression, ad_click, share, poster_download, alert_opt_in.
- [x] #4 Given any event, when sent, then it carries region or municipality and species dimensions where relevant and never contains names, emails, chip numbers, exact coordinates or free text, and a unit test rejects non-allowlisted parameters.
- [x] #5 Given local development and tests, when running, then a mock adapter records events without network calls and GA4 DebugView setup is documented.
- [x] #6 Given the client-provided GA4 property and Firebase project, when configured, then custom dimensions, key events, 14-month retention, Google signals off and data sharing off are documented in a setup checklist.
- [x] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-19 (web-only pilot sweep, main ef6c492f, live https://najdimo.si read-only, Accept never clicked)
- AC#1 PASS: live, fresh context, no consent, Playwright chromium 1280 + 375 and webkit 390 on /, /en, /zemljevid, /en/map plus one client-side nav: 0 google-analytics/googletagmanager requests, no _ga cookie (only NEXT_LOCALE), window.gtag/dataLayer undefined, banner shown. Code: ga4.ts sets consent default (4 signals denied) before update and before gtag.js; adapters.test.ts + e2e analytics.spec.ts cover it.
- AC#2 FAIL (web): live bundle resolves provider to 'mock' (no G-PKY4SCX3RL inlined) and CSP has no Google hosts, so GA4 gets no page views after consent -> TASK-7.5. Code path OK: e2e analytics.spec.ts 'on grant ... page_view by route template' green in CI (ga4/G-E2ETEST). Mobile Firebase screen views: deferred: web-only pilot (owner 2026-10-19).
- AC#3 PASS: registry.ts EVENTS holds all 16 listed events (+ sign_up); checkEvent rejects unknown events/params; track.test.ts 'registry holds the 17 taxonomy events'.
- AC#4 PASS: params are enums/slugs/uuid/EUR only; region/municipality/species on report, match, reunited, boost, poster events; track.test.ts rejects pet_name and names/emails/chip numbers/coordinates/free text.
- AC#5 PASS: mock adapter is in-memory (getMockEvents), default provider; DebugView web + Android documented in packages/analytics/README.md.
- AC#6 PASS: README 'GA4 property checklist': 14-month retention, Google signals off, data sharing off, custom dimensions, key events, Firebase second stream.
- AC#7 PASS (CI evidence): main ci green 2026-10-19 (verify:static, web deps build, audit, 298 web e2e). packages/analytics node --test run in a temp worktree: 18/18 pass. pnpm quality: nightly job, result not readable here (no gh CLI); story adds no page.
Result: qa:fail, 1 bug (TASK-7.5, Major, deploy config).
<!-- SECTION:NOTES:END -->
