---
id: TASK-90.5
title: >-
  Public pages: mobile LCP ≤ 2.5 s and make the Lighthouse quality job blocking
  again
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 00:10'
updated_date: '2026-10-16 00:24'
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
- [x] #2 Script transfer stays ≤ 256 KB on every public page (no regression of TASK-90.4).
- [ ] #3 Remove `continue-on-error: true` from the quality job in .github/workflows/ci.yml so the Lighthouse budgets block CI and staging deploys again.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Done: Redux/RTK out of the root providers (StoreProvider in the (app)/(admin)/dev layouts, on /m, and lazy islands for the shelter answer, the header inbox dot and SessionSync); the language switch's profile side moved into SessionSync; client catalogue trimmed to CLIENT_NAMESPACES; home photos converted to WebP. Not done: option 3 (measured worse: FCP 0.9 to 1.8 s simulated, CLS 0.151 with devtools throttling), option 4 (devtools TBT 460-2350 ms on this machine), AC#3 (the job still fails AC#1). Best-of-2 simulated mobile, before -> after: / perf 0.80 LCP 4.28 -> 0.87 3.89 s; /en 0.82 4.22 -> 0.88 3.81; /kako-deluje 0.81 3.77 -> 0.87 3.58; /o-nas 0.77 3.79 -> 0.84 3.41; /pogosta-vprasanja 0.81 3.76 -> 0.86 3.60; /varnost 0.81 3.78 -> 0.87 3.58; /za-zavetisca 0.79 3.80 -> 0.84 3.64; /zavetisca 0.89 2.50/3.97 -> 0.85 3.74; shelter page 0.85 3.61 -> 0.85 3.63. JS 192 -> 165 KB (/zavetisca 219 -> 183), HTML 33-39 -> 26-31 KB, home 594 -> 440 KB. Fonts (159 KB) and the late headless first frame keep LCP above 2.5 s; decisions are in backlog/changes.md (TASK-90.5 rows).
<!-- SECTION:NOTES:END -->
