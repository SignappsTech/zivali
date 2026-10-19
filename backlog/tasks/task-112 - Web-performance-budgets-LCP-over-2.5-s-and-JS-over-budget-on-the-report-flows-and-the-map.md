---
id: TASK-112
title: >-
  Web performance budgets: LCP over 2.5 s and JS over budget on the report flows
  and the map
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 12:55'
updated_date: '2026-10-19 12:57'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Data point from TASK-115.6 (2026-10-19, live najdimo.si a5d856e6, Lighthouse 12.6.1 mobile simulate, 1 run): / LCP 2.8 s, /en LCP 2.6 s; LCP element is the consent banner paragraph #consent-body; breakdown TTFB ~0.64 s, load delay 0, render delay ~2.0-2.1 s; FCP 1.0-1.2 s, TBT 60-70 ms, script 153 KB. The home's own content is not the LCP element while the banner shows.

TASK-112 fe pass (2026-10-19): no gh CLI here, so worked from the packet's CI numbers and the chunk manifests of the main checkout's build (f2007312). Initial JS gzip before: found 299 KB (21 files), lost 459 KB (28), map 254 KB + MapLibre 287 + worker 144, content pages 150. Deferred with next/dynamic (loaded with their step, then kept mounted): lost - PetFields (zod enums), LocationPicker/MapView, ResumeDialog (AlertDialog), AuthGate, LostDone (share menu, poster, P15, lib/env zod); found - LocationPicker, the Spremeni Dialog, FoundDone; map - FilterDrawer. errorCode/useErrorText moved to components/auth/error-text.ts (parts re-exports) so the flows stop pulling sonner and the auth parts. focusHeading (lib/utils) keeps focus on a lazy step's h1. Estimate after: found about 250-260 KB, lost about 265-285 KB transfer, map own JS about 232 KB gz; budgets CH-614 (map) and CH-615 (flows) to the tech lead. AC1 (content-page LCP) not touched: TASK-115.6 shows the LCP element is the consent banner #consent-body, painted after hydration (render delay about 2 s); that needs a consent-banner task. continue-on-error stays until a CI run passes (AC4). Branch: agent/TASK-112-lighthouse-budgets

Fix round 1 (2026-10-19): every lazy part has its own Suspense (ssr: false on FilterDrawer, the found Dialog/DialogContent and ResumeDialog; loading skeletons on LostDone/FoundDone), so a first load never suspends to the page's Suspense and blanks it. AuthGate is static again (its GateDialog is already lazy; two stacked chunks held a signed-out Publish), so lost's initial JS grows by AuthGate/StoreProvider/useRequireAuth. Warmed: location-picker when found 'Kje' shows, resume-dialog as soon as a draft is found. The flow and map tests mock next/dynamic with the App Router one (next/dist/shared/lib/app-dynamic; the package export is the Pages loader, which never suspends) and fail when anything suspends to a page-level Suspense; a new found test opens Spremeni. A global vitest alias broke support, reunited and shell tests, so it stays per file. Branch: agent/TASK-112-lighthouse-budgets

Rebased on main after TASK-41.2 and TASK-114.43 (2026-10-19), with the branch squashed to one commit first. The flows keep their dynamic splits next to the ai/ imports, and PET_AI_FIELDS comes from components/ai/prefill.ts. Nothing static in either flow imports pet-fields (lost-form.ts takes a type only). The found focus effect uses focusHeading and depends on sentence. Still static in the flows, from 41.2: ai/prefill pulls @zivali/validation/breeds, and found pulls BreedField with the DOG/CAT_BREEDS lists. Both are small, so they were not split.
<!-- SECTION:NOTES:END -->
