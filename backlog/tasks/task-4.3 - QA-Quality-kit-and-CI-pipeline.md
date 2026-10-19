---
id: TASK-4.3
title: 'QA: Quality kit and CI pipeline'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 15:06'
labels:
  - qa
  - 'est:XS'
  - 'qa:fail'
milestone: m-0
dependencies:
  - TASK-4.1
  - TASK-4.2
references:
  - docs/tech/frontend.md
parent_task_id: TASK-4
priority: high
ordinal: 221000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-4 (Quality kit and CI pipeline) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-4 merged to main (TASK-4.1, TASK-4.2); leads add any later TASK-4 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a pull request, when CI runs, then lint, typecheck, unit tests and build run for affected packages and block the merge on failure.
- [ ] #2 Given the web app, when CI runs, then Playwright smoke tests, axe accessibility checks and Lighthouse CI budgets (performance, accessibility, SEO) run against a preview build.
- [ ] #3 Given the mobile app, when CI runs, then unit and component tests run and an Expo typecheck and export check passes.
- [ ] #4 Given a leaked secret or a high-severity dependency issue, when CI runs, then secret scanning and dependency audit fail the build.
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-15 on main 44d55ea: qa:fail.
- pnpm verify PASS. quality: playwright 18/18 PASS, links 0 broken of 14, Lighthouse FAIL on items owned elsewhere: script budget 288-315 KB / 256 KB, mobile LCP 2.7-2.8 s, perf 0.76-0.80, no meta description on / and /en (all TASK-11.2 / TASK-90.4), robots.txt missing (TASK-72 AC3).
- TASK-4.2: secretlint catches a planted token; all 5 action refs are 40-char SHAs (existence unverified, no gh here); SUPABASE_*_PORT env comment in ci.yml is misleading (config.toml uses literal ports), harmless. AC2/AC3 need the first CI run after a push.
- TASK-98 AC3 FAIL: web e2e 25 pass / 5 fail. Bugs TASK-4.4 (photos spec hardcodes :4000) and TASK-4.5 (kit axe spec timeout).
- Re-run QA after TASK-4.4, TASK-4.5 and TASK-11.2 merge.

QA 2026-10-19 on main ef6c492f (last code commit 69d07c97; the 20 files after it are docs/backlog only), judged against TASK-4.6 design (docs/04 §CI/CD, ADR-016 §As built CI split): qa:fail.
- AC#1 FAIL: ci.yml runs on pull_request + push; verify = verify:static, build web^..., audit, e2e; lint/typecheck/unit in local pnpm verify via merge.mjs (post-merge, red.json blocks further merges; no red.json now). But GitHub main is unprotected (protected:false, contexts [], no rulesets), so a red verify blocks no PR merge. Bug TASK-4.8.
- AC#2 PASS (by design): e2e with axe runs in ci on every PR/push, run 39269904291 green on 69d07c97 (298 tests). Lighthouse CI + kit axe in quality.yml nightly/on demand on the production build :8080; 0 runs yet (first cron 2026-10-20 02:30 UTC); in the old ci its quality job ran every push and failed non-blocking (continue-on-error, LCP budget, TASK-90.7).
- AC#3 deferred: web-only pilot (owner 2026-10-19). FYI mobile.yml green on cbd1a3c2 (lint, typecheck, jest-expo, expo export).
- AC#4 FAIL (part): pnpm audit --audit-level high runs in ci, green, ignores listed with reasons in pnpm-workspace.yaml. secretlint in verify:static catches a planted ghp_ token under apps/ (exit 1) but its globs skip deploy/** and backlog/** (planted tokens there not reported). Bug TASK-4.9.
- AC#5 PASS with notes: pnpm verify green per merge.mjs (no .devteam/red.json after the 16:26-16:40 merges) and ci verify green on 69d07c97; pnpm quality not run (sweep rules), story touches no public pages. Live najdimo.si (10 public pages, chromium 375+1280, webkit 375 on / and /en): HTTP 200, axe wcag2.1 AA 0 serious/critical, meta description present, lang ok, one h1, no horizontal overflow at 375 px, Tab reaches the cookie banner first. robots.txt and sitemap.xml 200; api /ping and /v1/health/ready 200 (version 69d07c97). Lighthouse mobile live / and /en: perf 0.85/0.84, a11y 1, BP 1, CLS 0, script 153 KB, LCP 4.0/4.2 s (TASK-90.7 AC#2), SEO 0.69 only from the intended pilot noindex.
- Aside, not a TASK-4 AC: /o-nas, /za-zavetisca, /pogosta-vprasanja log a CSP console error: the Cloudflare Email Obfuscation script (cdn-cgi email-decode.min.js) is blocked; e-mail links still render. Lead to decide (Cloudflare toggle).
- Re-run QA after TASK-4.8 and TASK-4.9.
<!-- SECTION:NOTES:END -->
