---
id: TASK-9.9
title: 'Auth pages: JS 400 KB gz and Lighthouse perf 73 (budgets 250/90)'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 15:06'
labels:
  - bug
  - fe
  - performance
  - 'est:S'
  - no-design
dependencies: []
references:
  - apps/web/components/auth
  - lighthouserc.json
  - docs/tech/frontend.md
parent_task_id: TASK-9
priority: low
ordinal: 430200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found in QA TASK-9.5 (2026-10-19). Steps: Lighthouse 12 (repo node_modules), mobile simulate, 1 run, live https://najdimo.si/vpis, /registracija, /pozabljeno-geslo, /en/sign-in (no consent cookie). Expected: frontend.md DoD gates for touched pages: perf >= 90, LCP < 2.5 s, initial JS < 250 KB gz (lighthouserc script budget 256000 B). Actual: perf 73-74, LCP 4.1-4.6 s, TBT 400-500 ms, script transfer 421-426 KB (first party about 398 KB; largest chunks 90, 71, 60, 44 KB; Cloudflare api.js 28 KB). Same run on /kako-deluje: perf 91, script 153 KB, so the auth pages carry about 250 KB more JS (supabase-js, zod, captcha, forms loaded up front). The host was busy (other agents), so TBT/LCP read high; the script size is deterministic. Auth pages are not in lighthouserc.json (only axe via PROTECTED), so CI never measured them; TASK-112 covers the content pages, report flows and map, not these. Accessibility 100, best practices 96 on all four. Severity: Low (pilot works; gate miss).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /vpis, /registracija, /pozabljeno-geslo and /en/sign-in meet resource-summary:script:size <= 256000 B, performance >= 0.9 and LCP <= 2500 ms in Lighthouse mobile (or the tech lead revises the auth budgets with a reason in lighthouserc.json and docs/05)
- [ ] #2 The four auth URLs are added to lighthouserc.json collect.url so CI measures them
- [ ] #3 Sign-in, sign-up, reset and the gate still pass apps/web/e2e/auth.spec.ts and axe
<!-- AC:END -->
