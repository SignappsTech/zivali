---
id: TASK-90.5
title: 'Public pages: mobile LCP ≤ 2.5 s and make the Lighthouse quality job blocking again'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 00:10'
labels:
  - bug
  - fe
  - 'est:S'
dependencies:
  - TASK-90.4
parent_task_id: TASK-90
priority: high
ordinal: 317500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Carries TASK-90.4 AC#2 and AC#4, which 90.4 did not reach. 90.4 server-rendered the consent banner (it was the LCP element on every page, rendered only after hydration), which raised performance from about 0.75 to 0.83-0.86, and met the 256 KB script budget on every public page. Simulated mobile LCP is still about 3.6-4.0 s (FCP about 0.9 s): Lighthouse's simulated LCP counts every request that finished before the first frame, which on these pages is all scripts (196-224 KB) and the 4 preloaded fonts (163 KB).

Options from the 90.4 agent, in order of preference:
1. Take Redux and RTK Query out of the root providers for public pages (load them only in the app/admin route groups or behind the first client island that needs them).
2. Trim the client message catalogue: send only the namespaces a page's client components use (NextIntlClientProvider `messages` per route group), not every catalogue.
3. Preload only the LCP font weight; the rest load with `font-display: swap`. Dropping the Bricolage opsz axis (−48 KB) needs design-lead sign-off (CHANGE row from TASK-90.4).
4. Only as a documented last resort: Lighthouse `throttlingMethod: devtools` or the median of 3 runs. Budgets are never loosened.

## Packet

Branch: agent/task-90.5-lcp
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Mobile LCP ≤ 2.5 s and performance ≥ 0.9 in pnpm quality on /, /en, /zavetisca, a shelter page and one content page (e.g. /kako-deluje), without loosening any budget.
- [ ] #2 Script transfer stays ≤ 256 KB on every public page (no regression of TASK-90.4).
- [ ] #3 Remove `continue-on-error: true` from the quality job in .github/workflows/ci.yml so the Lighthouse budgets block CI and staging deploys again.
<!-- AC:END -->
