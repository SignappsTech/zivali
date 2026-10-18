---
id: TASK-114.27
title: >-
  Leftovers from the 2026-10-18 CHANGE batch: dev-kit sample text and the lawyer
  briefing's consent-cookie line
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 05:12'
labels:
  - fe
  - content
  - 'est:XS'
  - no-design
  - trivial
dependencies: []
parent_task_id: TASK-114
priority: low
ordinal: 367200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the overnight content batch (CH-503, CH-505):
1. The dev UI-kit samples (apps/web and apps/mobile, samples.ts or similar for the P23 kit gallery) still show the old checked-and-disabled checkbox example with the removed in-app lock text ('V aplikaciji · Možnih ujemanj in sporočil v aplikaciji ni mogoče izklopiti…'). The P23 slice now uses consent.necessary_title + consent.necessary_locked ('Nujni · Vedno vklopljeno' / 'Essential · Always on'). Point the samples at those keys.
2. docs/legal/lawyer-briefing.md and lawyer-briefing.sl.md LQ-26 say 'zz_consent cookie (12 months)'. Since TASK-113 the cookie lives 400 days and the choice counts for 12 months; align the line.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Kit samples use the consent keys in web and mobile; no reference to the removed lock text remains (grep)
- [ ] #2 LQ-26 matches the cookies and privacy pages in SL and EN
<!-- AC:END -->
