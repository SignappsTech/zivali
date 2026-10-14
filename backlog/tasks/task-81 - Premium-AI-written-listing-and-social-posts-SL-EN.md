---
id: TASK-81
title: 'Premium AI: written listing and social posts (SL/EN)'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 22:13'
labels:
  - story
  - 'req:FR-026'
  - 'req:NFR-AI'
milestone: m-3
dependencies:
  - TASK-52
  - TASK-40
  - TASK-24
priority: medium
ordinal: 170000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Premium owners get a well-written listing and ready-to-post social texts in Slovenian and English at one tap, built on the capped AI service; the free listing form and the template post for Boost stay available.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a Premium user with an open lost report, when they tap Write for me, then an AI-written listing description and social posts for Facebook and WhatsApp are generated in SL and EN from the report data (no chip number, no exact location) and are editable before use.
- [ ] #2 Given a free user, when they open the same screen, then they can write the text themselves or use the template and see a Premium offer without any nag.
- [ ] #3 Given AI cost caps (per user per day and monthly budget), when a cap is reached, then the feature says so and the manual text still works.
- [ ] #4 Given local development and tests, when no AI key exists, then a deterministic mock returns fixture text.
<!-- AC:END -->

## Packet

Unblocks on: hasEntitlement (TASK-52); capped AI service and mock (TASK-40); share texts and preview (TASK-24)
