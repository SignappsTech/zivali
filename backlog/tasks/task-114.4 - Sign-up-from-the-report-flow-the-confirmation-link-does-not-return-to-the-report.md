---
id: TASK-114.4
title: >-
  Sign-up from the report flow: the confirmation link does not return to the
  report
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 13:35'
updated_date: '2026-10-18 03:45'
labels:
  - bug
  - fe
  - auth
  - 'est:S'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: high
ordinal: 360400
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: registering while creating a report (Publish pressed signed out, then "Ustvari račun"), the verification link in the email does not bring you back to the report you were creating.

What the Auth log shows (a teammate's run, 13:05 to 13:06): sign-up carried `next=/prijava/izgubljena-zival?handoff=<nonce>`, the link kept it, and the code exchange succeeded. So `next` survives the round trip. Where it breaks:

1. apps/web/app/[locale]/auth/callback/route.ts, case `signup`: always redirects to `/sign-in?confirmed=1&next=…` ("E-naslov je potrjen" with a Nadaljuj button), even when the exchange succeeded and `next` is a report flow. The user has to press Nadaljuj; nothing says it continues their report, and many will not.
2. Opened in another browser or the phone's mail app (no PKCE verifier there, so no session; the draft is in the first browser's IndexedDB, lost-flow.tsx `draft:lost:lost`): Nadaljuj leads to sign-in and then an empty report form; the draft is not there.

Wanted: after a successful confirmation with a report-flow `next`, go straight back to the report (the hand-off then publishes the draft within its 24 h window, C3), optionally with a short "E-naslov je potrjen" notice on the report page. In another browser: say clearly that the report is saved in the browser where it was started (open the link there, or sign in there), instead of an empty form. Cover the found/sighting flow too if it has the same hand-off.

## Packet

Branch: agent/TASK-114.4-signup-confirm-return
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Same browser: the confirmation link (new tab included) lands on the report flow, signed in, and the drafted report publishes (or shows its review step) without an extra click; SL and EN
- [ ] #2 Another browser or device: after the link, the user sees a clear message that the draft is in the browser where it was started, with sign-in, not an empty form
- [ ] #3 Sign-up without a report `next` keeps the "E-naslov je potrjen" view
- [ ] #4 The same holds for the found/sighting report flow if it offers sign-up
- [ ] #5 Tests: callback route unit test for the redirect; e2e for the same-browser round trip (mock confirmation)
<!-- AC:END -->
