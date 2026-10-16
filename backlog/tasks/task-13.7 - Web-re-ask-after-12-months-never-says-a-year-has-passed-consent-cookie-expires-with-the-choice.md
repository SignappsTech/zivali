---
id: TASK-13.7
title: >-
  Web re-ask after 12 months never says a year has passed (consent cookie
  expires with the choice)
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
ordinal: 343000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-13.4 QA, AC#6 / P17 Re-ask 'The first sentence says what changed'. Steps: accept on web; return 12 months later. Expected: banner with 'It has been a year since your last choice. Please choose again.' Actual: packages/analytics/src/consent.ts sets zz_consent with Max-Age = 365 days, the same window isCurrent() uses, so by the time the choice expires the browser has deleted the cookie; the layout reads null and shows a plain first-visit banner. The reask_year branch in consent-banner.tsx is reachable only in tests (cookie injected). Consent is still asked again and nothing is sent (AC#6 holds); mobile (secure-store, no expiry) shows the sentence. Severity: low.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When a stored web choice is older than 12 months, the banner returns with the reask_year sentence (the zz_consent cookie outlives the 12-month consent window, e.g. Max-Age 13 months)
<!-- AC:END -->
