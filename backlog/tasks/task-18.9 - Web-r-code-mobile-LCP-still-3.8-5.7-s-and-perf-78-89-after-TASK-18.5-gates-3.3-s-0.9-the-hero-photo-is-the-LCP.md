---
id: TASK-18.9
title: >-
  Web /r/[code]: mobile LCP still 3.8-5.7 s and perf 78-89 after TASK-18.5
  (gates 3.3 s, 0.9); the hero photo is the LCP
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:19'
updated_date: '2026-10-19 20:42'
labels:
  - bug
  - 'est:M'
  - web
milestone: m-1
dependencies: []
parent_task_id: TASK-18
priority: high
ordinal: 453200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: Lighthouse 12.6.1 CLI, mobile preset, headless Chrome, 3 runs each against live najdimo.si (version 1ce206002ec1, TASK-18.5/18.6 merged).
Expected: perf >= 0.9, LCP <= 3.3 s (lighthouserc.json, docs/tech/frontend.md DoD; TASK-18.5 AC).
Actual: /r/zvsmkB5v perf 80/79/78, LCP 5127/5509/5655 ms; /en/r/zvsmkB5v 81/82, LCP 4975/4905 ms; /r/WD8k8UgN 87/88/89, LCP 3880/3872/3799 ms. FCP 1.1-1.2 s, TBT 63-129 ms, CLS 0, script 251.3 KB (in budget now). Desktop passes (perf 98, LCP 1.05-1.08 s). Baseline /kako-deluje mobile: perf 94, LCP 2.9 s.
LCP element = hero gallery <img> (fetchpriority=high, preloaded at byte 135 of the HTML, before S:0: discovery is fixed; the consent banner is not the LCP here, so not TASK-112.2). Simulated phases: map report TTFB 0.49 s, load delay 2.88 s, load 0.42 s, render delay 1.72 s; short report 0.47 / 2.01 / 0.32 / 1.07 s.
Hints: on a phone sizes calc((100vw - 40px) * 0.5625) = 209 px x DPR 1.75 = 366 px > the 360w thumb, so display.webp 1200w (176 KB) is chosen; Lighthouse image-delivery estimates 170 KB waste. The four other thumbs also load at High priority beside it. media.najdimo.si is a second origin with no preconnect. Render delay 1.1-1.7 s points at main-thread work before the photo paints (3dmm3v_fq28gc.js ~0.55 s bootup).
Severity: major (story gate AC#6 of TASK-18.4).

## Packet

Unblocks on: -
Branch: agent/task-18.9-r-lcp from main
Branch: agent/task-18.9-r-lcp
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lighthouse mobile (3 runs) on live /r/zvsmkB5v (5 photos), /en/r/zvsmkB5v and /r/WD8k8UgN (1 photo): performance >= 0.9 and LCP <= 3300 ms in every run
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Live evidence 2026-10-19 (curl + headless Chrome over CDP at 412x823 DPR 1.75, no Lighthouse):
- fetchpriority=high: on the img and on React's preload (byte 129). OK.
- Preload vs img: same srcset/sizes, ONE request (parser, High, starts right after TTFB). No double download. But the strip's first thumb is thumb.webp of the same photo: 176 KB + 30 KB for one photo.
- Client-only render: no. The img is SSR at byte 36755 in <main>, no Suspense boundary.
- Thumb not chosen: YES (cause 1). thumb.webp 360w (360x480, 30 KB), display.webp 1200w (1200x1600, 176 KB); sizes 209 px x 1.75 = 366 > 360, so Chrome loads display.webp (currentSrc measured). Chrome takes the first file that covers DPR, no nearest-density rounding. Local test: 378w -> thumb.webp.
- Strip thumbs (cause 2): 5 x thumb.webp (122 KB) start at layout ~90 ms after the hero, two raised Low>High.
- Media origin: CF HIT, TTFB 106-139 ms, h2 (site is h3), Cache-Control max-age=14400 (R2 default). Not slow, but a second origin: new DNS+TCP+TLS (~100 ms observed, ~0.7 s in Lantern).
Why 3.8-5.7 s: Lantern's LCP graph holds every request and script task that ended/started before the OBSERVED LCP. Observed, the hero paints at 892 ms (map report) / 756 ms (=FCP, 1-photo), after all 19 scripts (251 KB) arrived (596-681) and ran. FCP itself is late: render-blocking files done ~585 ms, first paint 712-756 (/kako-deluje: done 217, FCP 456), so all JS + hydration count. QA's load delay 2-2.9 s is the observed timeline scaled by simulated/observed LCP (LH LCPBreakdown), not a real delay. Byte model (TTFB + graph bytes at 1.6 Mbps + ~1.6 s CPU) fits: map report ~616 KB -> 5.1 s, 1-photo ~357 KB -> 3.8 s.
Fixed here: thumb counted 5 % wider (378w) -> hero = thumb.webp on 412@1.75 and the strip's first thumb reuses it; strip thumbs fetchpriority=low.
Estimate before -> after: /r/zvsmkB5v 5.1-5.7 s -> ~4.0-4.5 s, perf 78-80 -> ~83-85; /en/r/zvsmkB5v 4.9-5.0 -> ~3.9-4.3; /r/WD8k8UgN (11 KB hero, 1 photo) 3.8-3.9 -> unchanged. Applied throttling (562 ms RTT) today: display.webp 848->4678 ms, LCP 4.7 s; the thumb would land ~2.1-2.5 s.
AC#1 needs more, by effect:
1. Shell first paint before the scripts run (TASK-112.2): if the first paint comes when HTML+CSS+fonts are in (~585 ms) with the hero, the JS leaves the LCP graph: est. 1.8-2.5 s on all three.
2. Same-origin media (infra, lead): Cloudflare Worker route najdimo.si/media/* with an R2 binding to zivali-media (key = path minus /media/, return body, content-type, ETag, Cache-Control public, max-age=31536000, immutable), or Rules > Cloud Connector (R2, zivali-media) for /media/* plus a URL rewrite that strips /media. Then API MEDIA_BASE_URL=https://najdimo.si/media (C5). CSP img-src 'self' covers it; keep media.najdimo.si for old links. Hero arrives with the CSS on the warm h3 connection; Lantern drops ~0.7 s.
3. /r/ page JS, 87 KB br beyond /kako-deluje: Radix Dialog 8.6 KB, Popper 11 KB, Menu 10.3 KB, share icons 11.8 KB, @formatjs/intl-pluralrules polyfill 12.7 KB (not needed on web), detail 14.1 KB; ~0.1 s per 20 KB. Follow-up task.
4. TTFB /r/ 0.33-0.65 s vs /kako-deluje 0.19-0.22 s (API per request, private no-store).
5. CHANGE (C5): medium.webp for DPR 2.6-3 phones, which still load the 1200 px display; immutable Cache-Control on upload.
<!-- SECTION:NOTES:END -->
