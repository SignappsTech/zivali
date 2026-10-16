---
id: TASK-36.8
title: >-
  Mobile AdSlot: send region_id, reserve 200 px for detail and reunited, count
  impressions like web
status: To Do
assignee: []
created_date: '2026-10-16 06:46'
labels:
  - fe
  - mobile
dependencies: []
parent_task_id: TASK-36
priority: medium
ordinal: 351000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-36.5 review: apps/mobile/components/ads/ad-slot.tsx:64 calls useAd(slot, { locale, species }) with no region_id and the impression body is { slot }. Send the report's region as C14 region_id in GET /v1/ads/slot/:slot and in the impression body using the shared ordered REGION_SLUGS from @zivali/types (TASK-36.5 fix round adds it); the feed uses the first row's region. Reserve 200 px for detail and reunited (changes rows ~242/251; now 136). Count impressions the same way as web per the A-016 decision (rendered vs viewable CHANGE row).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Ad requests and impressions carry region_id when the context has a region (jest), detail and reunited reserve 200 px (no layout jump), full mobile suite green
<!-- AC:END -->
