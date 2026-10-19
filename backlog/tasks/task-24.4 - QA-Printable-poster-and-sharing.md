---
id: TASK-24.4
title: 'QA: Printable poster and sharing'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 19:50'
labels:
  - qa
  - 'qa:fail'
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-24.2
  - TASK-24.3
  - TASK-24.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P18-poster-share.md
parent_task_id: TASK-24
priority: medium
ordinal: 242000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-24 (Printable poster and sharing) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: Poster PDF route and web share menu merged (TASK-24.2); Mobile share sheet and poster download merged (TASK-24.3); Design: Poster and sharing (P18) approved (TASK-24.1)
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given an open lost report, when the owner taps Poster, then an A4 PDF in SL or EN is generated with a large photo, key details, area, a QR code and short link to the listing and no phone number, and poster_download fires (consent only).
- [x] #2 Given the poster printed in greyscale, when scanned and read, then the QR still scans and the text stays legible.
- [x] #3 Given a report, when the user taps Share, then WhatsApp, Facebook, copy link and the native share sheet are offered with prefilled localised text, and share fires (consent only).
- [x] #4 Given a shared link, when previewed in WhatsApp or Facebook, then an Open Graph image shows the pet photo with type label and no exact location.
- [x] #5 Given a FOUND report, when shared, then the preview never reveals where the animal is kept.
- [x] #6 Given the poster QR code, when scanned, then it resolves to the public listing only (never to a pet profile, owner data or a tag page).
- [ ] #7 Given a report, when the owner opens the Facebook share kit, then it provides ready SL text, a square image and a list of regional Facebook lost-pet groups to post in (group names supplied by the client, shown as links) plus the Radio Aktual submission form.
- [ ] #8 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-19 (agent, web only; app: later). Code main e778c604; live najdimo.si 030da43f (no poster/share code diff between them).
- Unit: web vitest for poster-pdf (incl. render test), poster-link, share, app/r routes, share-menu, slots, /r/[code] page: 11 files, 107 tests pass.
- Live Chromium and WebKit at 1440, 390, 320 px: slot B menu by keyboard (Enter opens on first row, arrows, End, Escape returns focus), rows 48 px, no page overflow at 320; WhatsApp text SL and EN with the short link; Facebook sharer gets the link; copy link toast and clipboard; no Web Share API, so More copies the link with the note. Poster dialog labelled, focus kept inside, targets 44 px or more, Preparing state shown.
- PDF SL and EN downloaded: A4, photo 114 x 152 mm, title and Lang tagged, no phone, email, chip or point; QR decodes in greyscale at 72 dpi with blur to https://najdimo.si/r/<code> (lost and found). No-photo report: note in the dialog, route 409; unknown code 404.
- OG: 1200 x 630, photo and type label only, no location (lost, found, sighted, EN); og tags in head for facebookexternalhit and WhatsApp agents; found share text has the area only.
- Consent: no analytics request or _ga cookie without consent; firing with consent not checkable live (GA4 off, TASK-7.5); unit tests cover the consent gate.
- AC7: owner kit not checkable live (no owner account); the public config has no share.* keys, so no groups and no Radio Aktual row: TASK-24.5 (major). AC7 unchecked.
- 200 % text: poster dialog language pills overflow: TASK-24.6 (minor).
- AC8: verify not run locally (no Docker); CI green before the 030da43f deploy (lead, deploy-after-green-ci, 2026-10-19). pnpm quality not run locally (rules). Lighthouse live /r/zvsmkB5v: mobile perf 80, LCP 5.0 s (known TASK-18.6), desktop perf 95, a11y 100, best practices 100, SEO 58 (staging noindex); /r/E1ScbpGF a11y 100. axe: poster dialog 0; menu open: region (moderate, Radix portal); header language switcher label-content-name-mismatch (shell, not this story).
<!-- SECTION:NOTES:END -->

## QA notes (agent, machine-rules run)
- Web vitest (lib, app/r, components/report, report-lost): 26 files, 269 tests pass. Mobile jest share: 11 pass. Added `apps/web/lib/poster-pdf.render.test.ts`: real render, pdftotext shows č/š/ž, short link, area only, no phone/email/chip/exact point; QR module matrix rebuilt from the drawn rectangles equals the matrix of `https://najdimo.si/r/Rex12345`; all fills neutral (greyscale-safe).
- Routes poster.pdf and square.png match apps/mobile/lib/share.ts; 404 missing/held/gone, 410 closed (poster; square answers 404), 409 no photo, 503 render/photo failure (no-store), 200 `private, max-age=300`; photo fetch media origin only, redirect:error, 4 MB cap (route tests).
- AC8 gates (verify, e2e, Lighthouse, quality): merge queue on main at e2457eef. Left open.
- Observation, not a bug: square.png answers 404 for a closed report, poster.pdf 410. C15 table lacks square.png (CHANGE row added).
