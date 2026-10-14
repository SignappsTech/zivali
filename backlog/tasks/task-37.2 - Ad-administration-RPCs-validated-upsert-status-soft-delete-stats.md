---
id: TASK-37.2
title: 'Ad administration RPCs: validated upsert, status, soft delete, stats'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
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

Unblocks on: Ad serving: get_ad targeting and rotation, house-ad fallback, aggregate counting merged (TASK-35.1); Admin backend: aal2 enforcement, admin bootstrap script, audit log read merged (TASK-34.2)
Contracts: C14, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-37.2-ads-admin-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 admin_upsert_ad rejects missing alt text, non-https links, wrong image size for the chosen slots and overlapping dates in an exclusive slot with clear error details.
- [ ] #2 Ad images upload to the ad-images bucket (admins with aal2 only).
- [ ] #3 admin_ad_stats returns impressions, clicks and CTR per day, slot and region for a date range.
- [ ] #4 Every create, edit, status change and soft delete is written to the audit log; ending an ad mid-day keeps its stats.
<!-- AC:END -->
