---
id: TASK-13.6
title: Consent banner does not take focus on the manage page (/m) first visit
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 03:46'
labels:
  - bug
  - fe
  - 'est:XS'
dependencies: []
parent_task_id: TASK-13
priority: low
ordinal: 342000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-13.4 QA, AC#5 / P17 States 'First visit: banner visible, focus moved into it'. Steps: clear cookies, open /m (or /en/m) without a token. Expected: focus on the banner h2 'Piškotki in vaša zasebnost' / 'Cookies and your privacy'. Actual: focus stays on the page (the invalid-link AuthHeading focus wins); the banner is open but a keyboard or screen-reader user is not taken into it. All 33 other public pages pass in Chromium. It is a race between the two focus calls: Chromium loses it every time, WebKit 2 of 6 runs; under load WebKit also missed the banner focus once on /, /en and /varnost (1 of 3 full runs), so the fix should make the banner's focus robust, not only /m-specific. If the manage page must keep focus (urgent flow), raise it as a P17 change instead. Severity: low.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 On a first visit to /m and /en/m (no zz_consent cookie) focus is on the banner heading after load, as on every other public page (e2e/consent-qa.spec.ts '/m focus' test passes without test.fail)
<!-- AC:END -->
