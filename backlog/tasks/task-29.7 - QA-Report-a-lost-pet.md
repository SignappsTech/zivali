---
id: TASK-29.7
title: 'QA: Report a lost pet'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 19:16'
labels:
  - qa
  - 'qa:fail'
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-29.1
  - TASK-29.2
  - TASK-29.3
  - TASK-29.4
  - TASK-29.5
  - TASK-29.6
  - TASK-88.2
  - TASK-29.17
  - TASK-112
references:
  - docs/tech/frontend.md
  - docs/design/pages/P6-report-lost.md
parent_task_id: TASK-29
priority: high
ordinal: 247000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-29 (Report a lost pet) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: Report write API: POST and PATCH /v1/reports with idempotency, guard hook and jobs merged (TASK-29.2); Web report-lost flow merged (TASK-29.3); Web lost flow: signed-out draft hand-off and confirmation screen merged (TASK-29.4); Mobile report-lost flow merged (TASK-29.5); Mobile lost flow: signed-out draft hand-off and confirmation screen merged (TASK-29.6); Design: Report lost flow (P6) approved (TASK-29.1); Shelter directory API: models, versioned seed, public lookup endpoints merged (TASK-88.2)
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a signed-in owner, when they start a lost report, then they can pick a saved pet or enter pet details on the spot, set last-seen place and radius, date and time (default now), circumstances and contact preference (chat only by default).
- [x] #2 Given a visitor without an account, when they reach submit, then the draft is kept and sign-up or sign-in completes the report without losing data.
- [x] #3 Given a submitted report, when saved, then it appears on the map and list within a minute with fuzzed location, matching runs, nearby alerts fan out and the owner sees a confirmation with next steps (poster, share, tips).
- [x] #4 Given the confirmation screen, when displayed, then it reserves a slot for the optional support contribution (FR-021), nothing is pre-selected, and no ad appears anywhere in the flow.
- [x] #5 Given the flow, when it starts and when it is submitted, then report_lost_start and report_lost_submit fire with region and species only, and only with consent.
- [x] #6 Given incomplete data, when the user submits, then errors are specific and localised and the form keeps their input.
- [x] #7 Given a submitted lost report, when the confirmation shows, then a checklist offers a one-tap call to the responsible shelter from the directory and states the owner reporting duty (escape reported to a vet or the responsible shelter within 3 days; the nearest shelter within 72 h), never claiming the app replaces it; the legal timings appear only when the legal-content flag is on.
- [ ] #8 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
- [x] #9 Given a lost report with a reward, when it is created and viewed, then the reward shows only as a display line with the scam warning, contact data in the note is refused, and no payment step appears.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-16 on main 98289182 (includes Merge TASK-29.10). Web vitest report-lost 50/50, mobile jest report-lost + lost-form + shelter-row 46/46, i18n check OK (SL/EN parity). API write tests read, not run. AC#8 (pnpm verify, quality, e2e, Lighthouse): merge queue on main at 98289182.
Bugs: TASK-29.11 (mobile RATE_LIMITED without minutes), TASK-29.12 (mobile VALIDATION not routed to its step); both low, AC#6 stays open until fixed.
Spec gap, not a bug: legal timings (3 days / 72 h) are never rendered; the flag-on path waits for the lawyer's wording (flag-off behaviour verified).
Re-check 2026-10-16 on main bd5a8271 (static + unit; machine rules: no e2e, API tests, build, Lighthouse). TASK-29.11 (429 retry_after_s shown as minutes, lost-flow.tsx failed(), jest test) and TASK-29.12 (VALIDATION photo_ids to photos step, location/radius_m to where step, input kept, jest test) confirmed. Mobile jest report-lost, report-lost-done, lost-form, shelter-row green; web vitest report-lost green; i18n check OK. AC6 ticked. Only AC8 remains: verify, e2e, Lighthouse: merge queue on main at bd5a8271. Legal-timings spec gap unchanged.

QA web re-run 2026-10-19 (app: later). Code: main a0ae40f6 (incl. TASK-29.14). Live: https://najdimo.si version 69d07c9716f7 (38 commits behind main, before 29.14), env staging.
AC8 gates: pnpm verify not run here (QA rules: no Supabase/build in main); CI evidence "lead, deploy-after-green-ci, 2026-10-19": 69d07c97 passed push ci (verify:static + build + audit + e2e); merges on main pass merge.mjs verify. Local on a0ae40f6: web vitest report-lost + report/lost page + shelter 78/78, i18n check OK.
Lighthouse 12 CLI on live 69d07c97: /prijava/izgubljena-zival mobile perf 61, LCP 5743 ms, CLS 0.043, script 450830 B (budget 300000); desktop perf 97. /en/report/lost mobile perf 72, LCP 4213 ms, script 450804 B; desktop 99. a11y 100, BP 96, SEO 66 (staging noindex, expected). LCP element p#consent-body. Perf + script budget = TASK-112 AC#2 (in progress), banner LCP = TASK-112.1: not re-filed.
Live visitor flow (Chromium 320/390/1280, WebKit 390): every step reachable by keyboard (Enter advances, focus on each step heading, file chooser opens on Enter/Space), errors specific and localised (no photo, species, colour, reward note with phone refused), input kept, reward = display line, no payment step, 0 ad slots, no analytics requests or cookies before or after consent (live analytics provider is mock: AC5 not observable live), no page overflow at 320, no console errors. Hand-off: sign-in gate "Vse, kar ste vnesli, ostane" with next=?handoff; reload offers "Nadaljujete prijavo?" and resumes on the review with all values. Sign-up/sign-in round-trip and publish not done live (no test inbox; a publish would put a fake report on the public map).
FAIL: TASK-29.17 (medium) sticky action bar hides focused controls at 320-390 px (WCAG 2.4.11) + axe target-size on the review at 320 px.
Harness notes, not bugs: Playwright's Windows WebKit has no OffscreenCanvas (photo rejected as "ni fotografija"; real Safari has it since 16.4, so a shim was used) and cannot keep Blobs in IndexedDB in its ephemeral context (draft photos lost after reload). Check draft photos in Safari Private Browsing on a real iPhone.
<!-- SECTION:NOTES:END -->
