---
id: TASK-37.4
title: 'QA: Ad management in admin'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-37.2
  - TASK-37.3
  - TASK-37.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P20-admin-ads.md
parent_task_id: TASK-37
priority: high
ordinal: 255000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-37 (Ad management in admin) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-37 merged to main (TASK-37.2, TASK-37.3, TASK-37.1); leads add any later TASK-37 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an admin, when they create an ad, then they can upload an image and set title, text, link, language, slots, region or municipality, species, start and end dates and status (draft, active, paused) with a live preview per slot.
- [ ] #2 Given validation, when saving, then missing alt text, non-https links, wrong image size or overlapping dates in an exclusive slot are rejected with clear errors.
- [ ] #3 Given an ad, when its detail is opened, then impressions, clicks and CTR per day, slot and region are shown with CSV export for sponsor reports.
- [ ] #4 Given house ads, when managed, then admins can edit and enable the three default house ads (SL and EN) from the public copy story.
- [ ] #5 Given any edit or status change, when saved, then it is written to the audit log.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
