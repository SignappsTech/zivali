---
id: TASK-17.14
title: >-
  Mobile manage screen (/m) never tracks reunited when the finder marks the
  animal home
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 09:43'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-17
ordinal: 355000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story AC#2 (mark returned), C12. Steps: open mobile manage screen from a private link, tap 'Zival je spet doma', confirm. Expected: reunited event with species/region/municipality when analytics consent is on (web /m does it via trackReunited; mobile owner view does it in components/report/lifecycle.tsx). Actual: m.tsx markReturned only calls act('mark_reunited'); no track call (apps/mobile/__tests__/manage.test.tsx has no analytics assertion). trackReunited in lifecycle.tsx is not exported: export and reuse. Severity: minor (analytics undercount, no PII issue).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Marking 'Zival je spet doma' on apps/mobile/app/m.tsx fires C12 reunited (species, region, municipality) once, consent-gated, like web trackReunited and mobile report/lifecycle.tsx; no event without consent or for a place abroad
<!-- AC:END -->
