---
id: TASK-114.39
title: 'Ads: allow an empty cta; public AdView falls back to t(learn_more) (CH-467)'
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-18 22:08'
updated_date: '2026-10-19 11:12'
labels:
  - be
  - fe
  - 'est:S'
  - no-design
dependencies: []
references:
  - docs/tech/contracts/C14-ads-partners.md
  - docs/tech/backend.md
  - docs/tech/frontend.md
parent_task_id: TASK-114
priority: low
ordinal: 401200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
C14 1.3 allows an empty AdInput.cta (the doc change is in). Code: packages/validation ads.schema.ts accepts an empty cta (still max 24, still checked by the content rule); the public AdView (web and mobile) shows t(learn_more) when cta is empty; admin editor (TASK-37.3) no longer requires the button text for multi-locale ads and stores the empty value.

## Packet

Unblocks on: C14 1.3 (docs) in main.
Review: tech-lead code review; run pnpm verify before reporting done.
Branch: agent/task-114.39-empty-cta
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AdInput accepts cta '' on create and edit; blocked-terms check still runs on non-empty cta; tests.
- [x] #2 Web and mobile AdView render t(learn_more) for an empty cta (SL and EN); the web admin editor accepts an empty button text for multi-locale ads.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AdInput.cta: trimmed, max 24, may be empty (validation + openapi.json); API content check unchanged (cta still blocklisted when non-empty). Web/mobile AdView already fell back to t(learn_more) with tests (web SL, mobile EN). Admin form: cta optional for any number of locales; multi-locale saves ''; single-locale still saves its locale's default. Removed ads_cta_*_required keys (CH-616 for P20).
<!-- SECTION:NOTES:END -->
