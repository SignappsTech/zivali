---
id: TASK-37.2
title: >-
  Ad administration API: validated create and edit, image upload, status, soft
  delete, stats
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-14 23:38'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-35.1
  - TASK-34.2
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C14-ads-partners.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-37
priority: high
ordinal: 181000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Without self-serve, admins create, schedule and report on ads by hand (FR-031).

## Packet

Unblocks on: Ad serving API: slot endpoint, targeting and rotation, house ads, impressions, no animal-sale ads merged (TASK-35.1); Admin API: aal2 enforcement, users and roles, audit log, queues, admin bootstrap script merged (TASK-34.2)
Contracts: C14, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-37.2-ads-admin-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST and PUT /v1/admin/ads reject missing alt text, non-https links, images that are not 4:3 and at least 1200×900 px (JPG or PNG under 500 KB, design P21), text over 120 characters, ads that sell, give away or rehome animals, and overlapping dates in an exclusive slot, with clear error details.
- [ ] #2 POST /v1/admin/ads/:id/image returns a presigned upload to the media bucket (admins with aal2 only).
- [ ] #3 GET /v1/admin/ads/:id/stats returns impressions, clicks and CTR per day, slot and region for a date range.
- [ ] #4 Every create, edit, status change and soft delete is written to the audit log; ending an ad mid-day keeps its stats.
<!-- AC:END -->
