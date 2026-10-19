---
id: TASK-30.8
title: >-
  Web found flow: an interactive captcha challenge sits above the steps
  unexplained while Publish spins
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 19:15'
updated_date: '2026-10-19 19:49'
labels:
  - bug
  - 'est:S'
  - web
dependencies: []
parent_task_id: TASK-30
priority: medium
ordinal: 445200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: https://najdimo.si/prijava/najdena-zival (live 69d07c9716f7; the found flow code is the same on main a0ae40f6), Chromium 320x568. Pick a photo: Cloudflare asks for an interactive check (Turnstile appearance interaction-only; here because the browser is automated, VPN and privacy browsers get the same). Go on to Objavite prijavo and tap Objavi prijavo without solving it.
Expected: P7 Flow 'if it needs a challenge it appears as a sheet', the M5 line 'Preverjamo ...' after 2 s, TASK-30 AC #5 (friendly message). The finder sees the check where they are, with captcha_title and captcha_body, and the Send step says why Publish waits.
Actual: the useCaptcha widget is the first child of main, above the step bars, with no title or text. On Send at 320x568 it is at top -20 px before the tap and -508 px after (off screen). The aria-live line stays empty: captcha_checking shows only while sending, but Publish waits for the photo upload (the session starts at the first photo, TASK-17.9), so sending is false. Publish spins (aria-busy) with no message until Turnstile times out.
Severity: medium (a challenged finder cannot tell why Publish does not finish; the draft is kept). Code: apps/web/components/report-found/found-flow.tsx (captcha.widget at the top of main; the captcha_checking line on the Send step).

## Packet

Unblocks on: -
Branch: agent/<id>-captcha-challenge from main
Branch: agent/TASK-30.8-captcha-challenge
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When the anonymous-session check needs an interactive Turnstile challenge, the finder sees it in view on every step (also on Send at 320x568), with captcha_title and captcha_body, and the Send step shows captcha_checking while Publish waits for it
<!-- AC:END -->
