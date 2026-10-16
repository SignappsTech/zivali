---
id: TASK-17.9
title: 'Manage page /m ships 415 KB of JS, over the 256 KB Lighthouse script budget'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 00:24'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-17
ordinal: 334000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-17 AC#6 (QA TASK-17.4). Steps: production Turbopack build with the e2e env, next start, Lighthouse mobile and desktop on /m and /en/m. Expected: script <= 256 KB. Actual: 415 KB on /m and /en/m (baseline /en/about 202 KB on the same build). /m-only chunks about 213 KB gz: one chunk of about 90 KB gz is mostly zod (the @zivali/validation schemas pulled in on the client), one of about 61 KB gz is the full supabase-js client incl. RealtimeClient, plus Turnstile and Radix dialog code. Other numbers on /m: a11y 100, best-practices 96, CLS 0.082, desktop perf 98; mobile perf 65 and LCP 4.9 s on a loaded shared machine (LCP element = consent banner, shell-wide). Severity: major (gate). Precedent: TASK-90.4.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lighthouse on /m and /en/m (production Turbopack build) reports resource-summary script transfer <= 256 KB (lighthouserc budget, DoD initial JS < 250 KB gz)
<!-- AC:END -->
