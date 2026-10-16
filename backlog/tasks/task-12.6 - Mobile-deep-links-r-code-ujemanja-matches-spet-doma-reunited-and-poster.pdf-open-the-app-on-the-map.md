---
id: TASK-12.6
title: >-
  Mobile deep links: /r/<code>/ujemanja, /matches, /spet-doma, /reunited and
  /poster.pdf open the app on the map
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 01:49'
updated_date: '2026-10-16 02:33'
labels:
  - bug
  - 'est:S'
dependencies: []
references:
  - docs/tech/contracts/C15-routes-deeplinks.md
  - apps/mobile/lib/deep-link.ts
  - apps/web/lib/app-links.ts
parent_task_id: TASK-12
priority: medium
ordinal: 337000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-12 AC#2 (QA TASK-12.4). Steps: with the app installed and links verified, tap the email button of a match notification (API webUrl('/r/<code>/matches') = https://<APP_HOST>/r/<code>/ujemanja, EN /en/r/<code>/matches), or a shared poster link https://<APP_HOST>/r/<code>/poster.pdf?lang=sl. Equivalent check without a device: toAppPath('https://najdimo.si/r/Hk3vT9qP/ujemanja') returns '/' (same for /en/r/<code>/matches, /spet-doma, /poster.pdf, /opengraph-image). Expected: the listing (or its matches screen) opens in the app; the poster PDF and OG image open in the browser. Actual: AASA '/r/*' and the Android intent filter pathPrefix '/r/' claim every sub-path, and the allowlist in lib/deep-link.ts (ALLOWED = /^\/(r\/[^/]+|m|payments\/.+|auth\/callback)?$/) sends anything below /r/<code>/ to '/', so the user lands on the map and loses the link. Severity: Major (email match links lose their target on phones with the app).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A universal or App Link under /r/<code>/ (SL or EN) that the app claims opens that listing in the app (or its matches or reunited screen once it exists), never the map
- [ ] #2 /r/<code>/poster.pdf and /r/<code>/opengraph-image are not claimed by the app (AASA exclude component; Android: open them in the browser) and open the PDF or image
- [ ] #3 Tests in apps/mobile/__tests__/deep-links.test.ts and apps/web/lib/app-links.test.ts cover both
<!-- AC:END -->
