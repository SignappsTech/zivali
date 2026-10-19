---
id: TASK-17.17
title: >-
  Manage page /m#<token>: the token path loads 466 KB script (budget 256 KB),
  mobile perf 77-81, LCP 3.3-4.3 s
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:27'
updated_date: '2026-10-19 22:14'
labels:
  - bug
  - 'est:S'
  - web
  - performance
milestone: m-1
dependencies: []
parent_task_id: TASK-17
priority: medium
ordinal: 463200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-17 AC#6 (QA TASK-17.4, re-QA 3, 2026-10-19, live najdimo.si version ee189f86e027).

Steps: Lighthouse 12.6.1 mobile (simulated throttling) x3 and desktop x1 on https://najdimo.si/m#<unknown token>, first visit, no consent cookie (headless: Turnstile never completes, so the page stays at 'Stran se nalaga.' and no claim is sent; a real visitor also loads the claimed report view on top).

Expected: the /m gates hold on the path every real visitor takes (a manage link always carries a token): script <= 256000 B, perf >= 0.9, LCP <= 3.3 s (frontend.md DoD, lighthouserc /m group).

Actual: script 466.1 KB (najdimo.si 437.8 KB + Turnstile api.js 28.3 KB) against 242.2 KB on /m without a hash; largest extra chunks 91.7 KB and 61.5 KB (lib/auth: zod + supabase-js, which TASK-17.9 moved to load with the claim, and the claim starts on load). Mobile perf 79/77/81, LCP 4.12/4.34/3.27 s, TBT 337-437 ms; desktop perf 99; CLS 0.044 (ok); a11y 100; BP 96 (the known zod eval CSP probe). Total bytes 1.29 MB (Cloudflare 764 KB third party). lighthouserc measures /m only without a hash, so CI never sees this path.

Severity: major (gate miss on the real entry path; the page works).

## Packet

Unblocks on: - (ready now; coordinate with TASK-17.18 and TASK-112.2)
Review: local
Branch: agent/task-17.17-m-token-js
Branch: agent/task-17.17-m-perf-2 (with TASK-17.18)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lighthouse mobile on /m#<a well-formed unknown token> and /en/m#<token> (first visit, no consent cookie, median of 3): resource-summary script <= 256000 B, performance >= 0.9, LCP <= 3300 ms, CLS < 0.1; or the tech lead sets a reasoned token-path budget in lighthouserc.json and docs/05
- [ ] #2 The token path is measured by the CI quality job (a /m#<token> URL in lighthouserc.json collect.url) or the reason it cannot be is written in docs/05
<!-- AC:END -->
