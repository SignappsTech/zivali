---
id: TASK-7.2
title: GA4 on web with basic Consent Mode v2
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 03:29'
labels:
  - fe
  - 'est:S'
  - no-design
milestone: m-0
dependencies:
  - TASK-7.1
  - TASK-3.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C12-analytics-consent.md
parent_task_id: TASK-7
priority: high
ordinal: 132000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
No GA script or request may happen before consent (TASK-7 AC#1); page views must come from route templates only. Implemented in instrumentation-client so the root layout is not touched.

## Packet

Unblocks on: packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Web app scaffold: Next.js 16, Tailwind 4 + shadcn, tokens, locale routing, Supabase helpers merged (TASK-3.3)
Design: none (no UI of its own)
Contracts: C12 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-7.2-analytics-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Before consent no request reaches Google and no _ga cookie exists (Playwright with network interception).
- [ ] #2 On grant: consent default (all four signals denied), then update analytics_storage granted, gtag.js loaded with the CSP nonce, and page_view sent on each route change through instrumentation-client using the route template (no ids).
- [ ] #3 On withdraw: consent update denied, the ga-disable flag set and _ga cookies deleted at once; a test proves it.
- [ ] #4 The mock adapter is used locally; ga4 runs only when NEXT_PUBLIC_ANALYTICS_PROVIDER=ga4 and the measurement id is set.
<!-- AC:END -->
