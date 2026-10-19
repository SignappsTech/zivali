---
id: TASK-112.2
title: >-
  Web: mobile FCP/LCP 3.1-4 s on content and flow pages; the consent banner
  paints at FCP, so it is the LCP element
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 19:57'
updated_date: '2026-10-19 19:59'
labels:
  - fe
  - 'est:M'
  - web
dependencies: []
references:
  - lighthouserc.json
  - docs/tech/frontend.md
parent_task_id: TASK-112
priority: high
ordinal: 451200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
QA 2026-10-19 (TASK-17.4, 18.4, 23.4, 29.7, 30.4, 38.4, 11.3) measured mobile LCP 3.1-5.7 s on many pages with the consent banner as the LCP element, although TASK-112.1 is Done. TASK-18.6 found that on /r/ the banner is server-rendered and paints at FCP, so the real cost is the time to first paint. Tonight's merges already cut /r/ (18.6), /m (17.16) and auth (9.9) JS; measure after their deploy.

## Packet
Unblocks on: -
Branch: agent/task-112-first-paint
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lighthouse mobile (CI quality job, or the staging Lighthouse from TASK-90.8) on /, /kako-deluje, /prijava/izgubljena-zival, /prijava/najdena-zival and /vpis: LCP <= 3.3 s and perf >= 0.9, or each remaining gap is named with its cause and a follow-up task
- [ ] #2 The render-blocking cost before first paint is measured and cut where possible (font loading strategy and preloads, critical CSS size, blocking scripts, hydration of the shell and the consent banner); no visual change at 100% text and no CLS regression
- [ ] #3 Report flows keep their script budgets (TASK-112 AC#2); nothing analytics-related loads before consent
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Live baseline 2026-10-19 (najdimo.si, /api/health version ee189f86 = tonight's merges; curl, mobile UA, br):

| Page | HTML br (raw) | TTFB | JS br, HTML-referenced (files) |
|---|---|---|---|
| / | 24.1 KB (199 KB) | 0.22 s | 150.8 KB (9) |
| /kako-deluje | 19.4 KB (139 KB) | 0.19 s | 150.8 KB (9) |
| /prijava/izgubljena-zival | 28.2 KB (124 KB) | 0.32 s | 366.9 KB (21), over the 300 000 B budget |
| /prijava/najdena-zival | 25.2 KB (111 KB) | 0.20 s | 348.0 KB (18), over the 300 000 B budget |
| /vpis | 16.1 KB (84 KB) | 0.17 s | 194.5 KB (14) |

- Render-blocking: one stylesheet on every page (`2lfxln70n71dx.css`, 109.0 KB raw, 19.2 KB br; 89 KB of it utilities). No blocking external script: Next's chunks are async, and the noModule polyfill (40.6 KB) is not fetched by modern browsers. The inline theme script (228 B) comes after the stylesheet in the head React writes, so the parser waits for the CSS there; the layout cannot reorder it.
- Fonts: 3 woff2, 47.3 KB (21.7 + 12.5 + 13.1), preloaded in the Link header (High), `swap` with Arial metric fallbacks. Already lean: no hinting tables (woff2 directory: no fpgm/cvt); the biggest table is GPOS kerning (23.7 / 11.9 / 11.9 KB raw). All three paint in the first viewport (banner title, body, buttons), so none can drop its preload: TASK-11.2 found that without a preload a font becomes VeryHigh and lands in the FCP chain.
- Banner: first in the body at byte ~4.0 KB on every page. The shell takes about 5 to 6 KB br of each document (header 27.7 KB raw on content pages, footer 7.7 KB, about 30 KB of shell rows in the RSC payload).
- JS on content pages: the framework is 136 KB (react-dom 71.7, next 43.9 + 8.5 + 3.6 + 3.7, turbopack 4.5). The shell's own JS is 14.5 KB (banner + providers 2.7, shell parts + routing + analytics 11.8). No GA request or gtag script before consent (C12 holds).

Why lab LCP ≈ FCP ≈ 3 s: Lantern counts every non-image request (fonts, async JS) and every script evaluation that finished before the observed, unthrottled first paint. On localhost they all do, so roughly 236 KB (content pages) to 450 KB (flows) of bytes sit in the LCP window, plus script evaluation at 4× CPU. At 1.6 Mbps each KB costs about 5 ms.

Change (consent-banner.tsx): no forced layout while the page hydrates. Before, the banner's mount effects read `offsetHeight` and called `focus()` with scroll-into-view, which made two forced synchronous layouts inside the hydration task. When that task beats the first frame, it becomes the trace's first Layout, and Lantern pulls it into the FCP graph together with the scripts it calls (react-dom and the shell chunks, about 86 KB br, plus evaluation). Now ResizeObserver supplies the first height after the browser's own layout, before that frame paints (same frame, so no visual change and no CLS). A banner that has just opened focuses its heading with `preventScroll` (it is fixed and unscrolled, so the heading is in view). A switch between views keeps scroll-into-view, because at 200 % text the banner may be scrolled.

Estimate, not measured locally (no Lighthouse run): if the hydration task was the first Layout, FCP drops by about 0.5 to 1.2 s; otherwise FCP is unchanged. LCP: 0 to −0.4 s. Real users: no change to the first paint, because the server HTML paints before the JS arrives; the hydration task loses one full-page layout (about 10 to 30 ms on a Moto G-class phone).

Remaining gaps (follow-ups for the lead):
1. The report flows are over the script budget (367 / 348 KB br against 300 000 B). Both share chunk `3g97zom_3k5f3.js` (89.3 KB br, 390 KB raw, contains zod). This is page JS, not the shell (TASK-112 AC#2).
2. The framework's 136 KB br sits in the Lantern LCP window on every page; only less client JS per page cuts it.
3. Fonts take about 0.23 s of the window. A tighter subset (Latin Extended-A reduced to čćđšž and their capitals) would save an estimated 25 to 30 %. The trade-off: rare letters in names would render in the fallback font. That is a design-system §4 call.
4. CSS: `experimental.inlineCss` would take the CSS round trip out of FCP (about −0.15 to −0.25 s in Lantern) at +19 KB br per HTML. It needs a build check first: Turbopack writes relative `url(../media/…)` font URLs, which would break once inlined on nested paths.
<!-- SECTION:NOTES:END -->
