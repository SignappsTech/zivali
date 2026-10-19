---
id: TASK-18.4
title: 'QA: Report detail page'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 20:22'
labels:
  - qa
  - 'qa:fail'
milestone: m-1
dependencies:
  - TASK-18.1
  - TASK-18.2
  - TASK-18.3
  - TASK-18.5
  - TASK-18.6
  - TASK-18.7
  - TASK-18.8
  - TASK-18.9
  - TASK-18.10
  - TASK-18.11
references:
  - docs/tech/frontend.md
  - docs/design/pages/P9-report-detail.md
parent_task_id: TASK-18
priority: high
ordinal: 236000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-18 (Report detail page) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-18 merged to main (TASK-18.2, TASK-18.3, TASK-18.1); leads add any later TASK-18 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a public report, when opened on web or mobile, then it shows photos, species, breed, colours, size, sex, a chip-on-file indicator (never the number), date and time, the fuzzed area on a map, status and circumstances.
- [x] #2 Given the page layout, when rendered, then named action slots exist for Contact, Share, Poster, Report abuse, Owner actions and a labelled ad slot, so later stories plug in without re-layout.
- [x] #3 Given a crawler or link preview, when the web page is fetched, then it is server-rendered with title, description, Open Graph image and structured data, and closed or hidden reports are not indexable.
- [x] #4 Given a hidden or removed report, when its URL is opened, then a clear message explains it is no longer available.
- [x] #5 Given SL and EN, when the language is switched, then page content and meta are localised.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
- [x] #7 Given a lost report with a reward, when its detail page opens on web and mobile, then the 'Nagrada' line and the scam warning are shown, and reports without a reward show neither.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA (agent, merge-queue mode, main e2457eef): web vitest report/abuse/ads/r routes 21 files 230 tests pass (+5 new integrated-slot tests in app/[locale]/(public)/r/[code]/page.test.tsx); mobile jest report-detail 25/25 pass. Integrated page verified by unit/DOM tests: slot order per P9 (A, safety note, B, C, Where, ad, near-here), one h1/one main, owner never sees sighting/abuse, visitor ships no owner code (owner-lazy dynamic + PageMessages owner copy only for is_mine), reward line/scam warning only with reward, 410/404 in proxy.ts (tests), OG/JSON-LD without exact point, noindex for closed/reunited/held. AC#6 not run here: verify, quality, e2e, Lighthouse: merge queue on main at e2457eef. Staging https://staging.najdimo.si/r/* answered 500 for unknown/gone codes (lags main, inconclusive; recheck after deploy). Note: sticky sidebar can sit beside the detail ad while scrolling at lg (design-specified, not filed). AC#1 says date and time; P9 shows the date only (CHANGE row added). Labels left at qa (no qa:pass until AC#6 runs).

QA 2026-10-19 (web only; app: later), live najdimo.si 69d07c97 (apps/web identical to main 0b573340).
AC#6 CI evidence: lead, deploy-after-green-ci, 2026-10-19 (ci = verify:static + build + audit + e2e green for 69d07c97). pnpm verify/quality not run locally (QA rules: no Docker, no next build).
Lighthouse 12.6.1 live, mobile/desktop: /r/zvsmkB5v 78/91, /en/r/zvsmkB5v 78/91, /r/E1ScbpGF 79/96, /r/WD8k8UgN 62 (mobile); a11y 100, BP 100 everywhere; mobile LCP 4.2-6.1 s; script 282 KB mobile, 570 KB with map. SEO 58 = is-crawlable (pilot SEARCH_INDEXING off, expected) + meta-description (Next streaming metadata for non-bot UAs; bots incl. facebook/twitter/slack/bing get it in <head>; Googlebot renders JS): not filed. Baselines /kako-deluje 94/100, /en 89/99.
Live checks pass: AC1 (photos, species, breed, colours, size, sex, chip "Ni podatka" never a number, date, area map, status, circumstances; date only, CHANGE already logged), AC2 (contact, share/poster, more menu with abuse, labelled ad "Oglas"), AC3 (SSR title/desc/OG image 200 png/JSON-LD Article, canonical, hreflang via Link header), AC5 (switch SL->EN: URL, lang, title, desc, og:locale en_GB, body), AC7 (Nagrada 100 EUR + scam warning on the lost report, none on found/sighted). Unknown code: 404 with message SL/EN. 410 not checked live (no gone code without creating data; proxy tests cover it). 320/390 px no overflow, Chromium + WebKit, no console errors besides the 404 resource, keyboard order logical with visible focus except the map canvas.
FAIL: TASK-18.5 (mobile LCP/perf, major), TASK-18.6 (script budget, major), TASK-18.7 (map focus ring, major a11y), TASK-18.8 (200% text overflow, minor). Note: 404 doc title is the generic site title (shell-wide, not filed).

Re-QA 2026-10-19 (web only; app: later), live najdimo.si version 1ce206002ec1 (18.5-18.8 merged). AC#6 CI evidence: lead, deploy-after-green-ci, 2026-10-19. pnpm verify/quality not run locally (QA rules).
Lighthouse 12.6.1 mobile x3 / desktop: /r/zvsmkB5v 80/79/78, LCP 5.1-5.7 s / 98, LCP 1.08 s; /r/WD8k8UgN 87/88/89, LCP 3.8-3.9 s / 98; /en/r/zvsmkB5v 81/82, LCP 4.9-5.0 s / 98. a11y 100, BP 100, CLS 0, TBT 63-129 ms (baseline /kako-deluje 135 ms, perf 94). Script 251.3 KB on every run (<= 256 000 B: TASK-18.6 fixed). SEO 69 = staging noindex (expected).
TASK-18.7 fixed: map canvas :focus-visible ring 3 px solid rgb(26,103,115), offset -3 px, Chromium + WebKit, /r/ and /zemljevid. At human tab speed the canvas is reached in order after 'Preskoči zemljevid'; at automation speed the lazy map (TASK-18.6) loads after focus has passed it (timing artefact, not filed).
TASK-18.8 fixed for its scope: header and action buttons fit at 390/320 px 200% text in both engines. New: the detail ad's CTA overflows (TASK-18.10) and the gallery controls overflow at 320 px (TASK-18.11).
Spot checks pass: SSR title/description/OG image 200 png (SL + ?lang=en)/JSON-LD Article+Place/canonical/hreflang Link header, X-Robots-Tag noindex on staging; SL->EN switch (URL, lang, title, description, og:locale en_GB, body); Nagrada: 100 € + scam warning on the lost report, neither on the found ones (safety note instead); no chip number; one h1/main; unknown code 404 with message; console clean except the 404 resource.
FAIL: TASK-18.9 (mobile LCP/perf still below gate, major), TASK-18.10 (ad CTA overflow at 200% text, minor), TASK-18.11 (gallery controls at 320 px 200% text, minor).
<!-- SECTION:NOTES:END -->
