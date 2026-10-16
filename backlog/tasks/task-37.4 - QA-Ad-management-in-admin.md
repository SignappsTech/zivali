---
id: TASK-37.4
title: 'QA: Ad management in admin'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-14 23:38'
labels:
  - qa
  - qa:fail
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

Unblocks on: Ad administration API: validated create and edit, image upload, status, soft delete, stats merged (TASK-37.2); Web admin ad management: editor with preview, stats and CSV merged (TASK-37.3); Design: Admin ad management (P20) approved (TASK-37.1)
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given an admin, when they create an ad, then they can upload an image and set title, text, link, language, slots, region or municipality, species, start and end dates and status (draft, active, paused) with a live preview per slot.
- [x] #2 Given validation, when saving, then missing alt text, non-https links, wrong image size or overlapping dates in an exclusive slot are rejected with clear errors.
- [x] #3 Given an ad, when its detail is opened, then impressions, clicks and CTR per day, slot and region are shown with CSV export for sponsor reports.
- [x] #4 Given house ads, when managed, then admins can edit and enable the three default house ads (SL and EN) from the public copy story.
- [x] #5 Given any edit or status change, when saved, then it is written to the audit log.
- [x] #6 Given validation, when an ad is saved, then it is rejected if it advertises the sale, gift or change of ownership of animals.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## QA notes

Branch with tests and bugs only; product code unchanged. Machine rules: no e2e, API tests, build or Lighthouse here.
- Unit: web vitest admin/ads and i18n 75/75 pass; i18n catalogue check OK; eslint clean on admin/ads; tsc has only env noise (PageProps, tokens dist not generated in the worktree).
- Gates (#7): verify, e2e, Lighthouse: merge queue on main at f683d89d.
- #1 not checked: TASK-37.5 (SL draft URL), TASK-37.6 (cta label), see also TASK-37.7 (#6 note).
- CSV carries exact counts while the screen shows '< 5' for 1 to 4; the UI note (ads_method) does not say so.
- Added e2e (not run here): cta required for two languages, CSV BOM/rows/formula, house switch status call, EN parity.
Re-check 2026-10-16 on main bd5a8271 (static + unit; machine rules: no e2e, API tests, build, Lighthouse). Fixes are on branch agent/task-37.5-admin-ads-fixes (approved, not on main); checked with git diff main...branch and the branch tests run in this worktree. TASK-37.5 (draft URL via localisedPath, SL /admin/oglasi/<id>/uredi and EN, tested for both), TASK-37.6 (cta label/help required for 2+ languages, optional with default for one; i18n keys SL+EN; CHANGE row), TASK-37.7 (blocked terms checked on title, body, cta only; C14 updated; API domain test updated, read not run) confirmed. Web vitest admin/ads 34/34 and i18n check OK on the branch. AC1 ticked. Only AC7 remains: verify, e2e, Lighthouse: merge queue on main at bd5a8271, after the branch merges.
