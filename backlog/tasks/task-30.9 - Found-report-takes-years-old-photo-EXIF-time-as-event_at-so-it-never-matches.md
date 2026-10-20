---
id: TASK-30.9
title: 'Found report takes years-old photo EXIF time as event_at, so it never matches'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-20 12:57'
updated_date: '2026-10-20 12:58'
labels:
  - bug
  - fe
  - 'est:XS'
  - no-design
dependencies: []
references:
  - apps/web/components/report-found/found-form.ts
  - docs/tech/frontend.md
parent_task_id: TASK-30
priority: high
ordinal: 527200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Seen on najdimo.si 2026-10-20: three found cats reported from gallery photos got event_at 2017-01-14, 2019-06-27 and 2022-10-02 (bsgSDckF, tAgk7rns, qycuCubz), so match.report found 0 candidates: the geo pair needs o.event_at between l.event_at - 12h and l.event_at + max_days (apps/api/domains/matching/matching.dao.ts:58-62). Cause: capturedAt() in apps/web/components/report-found/found-form.ts:102 uses the earliest photo EXIF time with only a future guard, no lower bound, and the found flow never asks when. Fix in the web found flow only (mobile later): use the EXIF time only when it is within the last 7 days (and not in the future beyond FUTURE_SLACK_MS); otherwise fall back to startedAt. A linked sighting keeps its own time (unchanged).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 capturedAt ignores an EXIF time older than 7 days before now and uses startedAt instead; an EXIF time within 7 days is still used; a future EXIF time still falls back as today
- [ ] #2 Unit tests in found-form.test.ts cover: EXIF 2017 -> startedAt, EXIF 2 days ago -> EXIF, EXIF in the future -> startedAt, linked sighting unchanged
- [ ] #3 No other behaviour of the found flow changes (steps, analytics, coarsened point)
<!-- AC:END -->
