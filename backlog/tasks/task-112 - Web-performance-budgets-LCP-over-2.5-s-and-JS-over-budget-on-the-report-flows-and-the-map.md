---
id: TASK-112
title: >-
  Web performance budgets: LCP over 2.5 s and JS over budget on the report flows
  and the map
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 12:55'
labels:
  - fe
  - performance
  - 'est:M'
dependencies: []
parent_task_id: TASK-69
priority: medium
ordinal: 357000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
First complete Lighthouse CI run in CI (commit 7debfff6, 2026-10-16; until then Lighthouse's Chrome never started on the Ubuntu 24.04 runner). Mobile profile, 2 runs per URL, lighthouserc.json budgets. Accessibility, SEO, best practices and links (linkinator: 135 links, 0 broken) pass; performance does not. The quality job is continue-on-error, so it does not block the deploy.

Failures (found vs budget):
- LCP over 2500 ms: /en 3182, /kako-deluje 2806, /varnost 2764, /za-zavetisca 2775, /o-nas 2830, /zemljevid 2751, /prijava/izgubljena-zival 3094.
- Performance score: /prijava/najdena-zival 0.84 (min 0.9), /prijava/izgubljena-zival 0.73 (min 0.9), /zemljevid 0.65 (min 0.8).
- Script size: /prijava/najdena-zival 314569 B (budget 256000), /prijava/izgubljena-zival 478774 B, /zemljevid 715331 B and 1830755 B (two budgets; maplibre).

The content pages share a pattern (LCP ~2.8 s with no heavy JS): check the LCP element (hero image or heading font), font loading (preload, font-display), and render-blocking CSS first. Report CI artifact: quality-report (lighthouse/).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The content pages (/, /en, /kako-deluje, /varnost, /za-zavetisca, /o-nas) meet LCP <= 2500 ms in the CI Lighthouse run
- [ ] #2 The report flows meet performance >= 0.9 and their script budgets, or the budgets are revised with the tech lead's reason in lighthouserc.json and docs/05
- [ ] #3 /zemljevid meets its performance and script budgets (maplibre loaded only when the map is shown), or revised as in #2
- [ ] #4 The CI quality job passes; then make it blocking again (drop continue-on-error in ci.yml)
<!-- AC:END -->
