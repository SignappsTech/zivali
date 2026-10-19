---
id: TASK-17.15
title: >-
  Manage page /m: footer jumps when the claim result replaces the skeleton,
  mobile CLS 0.112 (gate < 0.1)
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 18:33'
updated_date: '2026-10-19 18:51'
labels:
  - bug
  - 'est:XS'
  - web
milestone: m-1
dependencies: []
parent_task_id: TASK-17
priority: low
ordinal: 435200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-17 AC#6 (QA TASK-17.4, re-QA 2026-10-19). Steps: Lighthouse 12.6.1 mobile (simulated throttling), live https://najdimo.si/m and /en/m (version 69d07c9716f7 = main code), no consent cookie, 3 runs each; Playwright PerformanceObserver at 390 and 412 px, first visit. Expected: CLS < 0.1 (frontend.md DoD, lighthouserc). Actual: CLS 0.112 in all 6 Lighthouse runs (desktop 0.035). The shift is the footer moving up (y 687 -> 407-440) about 0.4 s after load, when the PageSkeleton (about 456 px tall) is replaced by the claim result ('Ta povezava ne deluje vec', main 340-376 px); Playwright 0.093-0.112 at 390/412 px with the consent banner, 0 at 390 px with a consent cookie, 0.035 at 320 px. On /m#<token> the Turnstile widget inserted above the skeleton adds another 0.059. Severity: minor (gate miss; page works).

## Packet

Unblocks on: - (ready now)
Review: local
Branch: agent/task-17.15-m-cls
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lighthouse mobile on /m and /en/m (first visit, no consent cookie) reports CLS < 0.1; the token path (/m#<token>, captcha widget then report view) stays under 0.1 too (e.g. skeleton sized like what replaces it, or the widget's space reserved)
<!-- AC:END -->
