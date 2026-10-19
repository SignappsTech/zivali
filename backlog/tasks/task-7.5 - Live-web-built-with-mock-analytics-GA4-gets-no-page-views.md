---
id: TASK-7.5
title: 'Live web built with mock analytics: GA4 gets no page views'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-19 15:02'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-7
priority: high
ordinal: 425200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by TASK-7.4 QA (2026-10-19), live https://najdimo.si, read-only. Steps: 1. Load https://najdimo.si/ and fetch its JS chunks (e.g. /_next/static/chunks/318gtdnas__6d.js). 2. Read the @zivali/analytics createAdapter code. 3. curl -sI https://najdimo.si/ and read content-security-policy. Expected: provider ga4 with G-PKY4SCX3RL inlined; CSP opens the GA hosts (apps/web/proxy.ts); after consent GA4 receives page_view. Actual: provider resolves to A.provider||'mock' (NEXT_PUBLIC_ANALYTICS_PROVIDER empty at build), NEXT_PUBLIC_GA_MEASUREMENT_ID not inlined, no loaded chunk contains G-PKY4SCX3RL, CSP connect-src has no Google hosts. So after Accept the mock adapter swallows every event: GA4 gets no data from the pilot (TASK-64 KPIs). Code is fine: e2e analytics.spec.ts passes with ga4/G-E2ETEST. Likely cause: vars.NEXT_PUBLIC_ANALYTICS_PROVIDER / vars.NEXT_PUBLIC_GA_MEASUREMENT_ID unset in the GitHub staging environment (deploy.yml lines 83-84, 145-146). If GA4 is held back on purpose until go-live (TASK-76.1), close this with that note. Severity: Major (no analytics, no privacy risk).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The najdimo.si web image is built with NEXT_PUBLIC_ANALYTICS_PROVIDER=ga4 and NEXT_PUBLIC_GA_MEASUREMENT_ID=G-PKY4SCX3RL (GitHub staging environment variables, pilot-runbook step 10) and redeployed
- [ ] #2 The live CSP connect-src on najdimo.si includes https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com
- [ ] #3 A fresh visit without consent still loads no Google script, sends no Google request and sets no _ga cookie
- [ ] #4 After Accept, GA4 Realtime or DebugView for stream G-PKY4SCX3RL shows page_view with the route-template page_location (runbook section 7 step 2)
<!-- AC:END -->
