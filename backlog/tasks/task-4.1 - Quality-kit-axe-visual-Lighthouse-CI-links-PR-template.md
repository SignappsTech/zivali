---
id: TASK-4.1
title: 'Quality kit: axe, visual, Lighthouse CI, links, PR template'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 22:12'
labels:
  - tech
  - 'est:S'
milestone: m-0
dependencies:
  - TASK-3.3
references:
  - docs/tech/frontend.md
  - docs/tech/backend.md
parent_task_id: TASK-4
priority: high
ordinal: 117000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Gates must exist before feature work lands so every story is checked the same way (NFR-QUAL); the kit comes from the dev-team templates/quality and is adapted to Next.js.

## Packet

Unblocks on: Web app scaffold: Next.js 16, Tailwind 4 + shadcn, tokens, locale routing, Supabase helpers merged (TASK-3.3)
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-4.1-qkit
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The dev-team quality kit is copied and adapted: tests/quality/quality.spec.mjs (axe with WCAG 2.0/2.1/2.2 A and AA tags, console errors, visual snapshots for / and /en at 390 and 1440 px), lighthouserc.json (mobile preset; performance ≥ 0.9, accessibility ≥ 0.95, SEO ≥ 0.95, best practices ≥ 0.9, LCP < 2500 ms, CLS < 0.1, script transfer ≤ 250 KB), linkinator, and .github/pull_request_template.md.
- [ ] #2 `pnpm quality` builds and starts the web app on :8080 and runs axe, visual, Lighthouse CI and link checks, writing quality-report/.
- [ ] #3 Reusable Playwright helpers expectNoAdSlots(page) and expectNoAnalyticsBeforeConsent(page) exist with their own tests, ready for later stories.
- [ ] #4 Thresholds match docs/05 §Quality gates; html-validate is dropped with a note (server-rendered React).
<!-- AC:END -->
