---
id: TASK-38.4
title: 'QA: Partners page: Oglašujte pri nas'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:16'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-38.2
  - TASK-38.3
  - TASK-38.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P22-partners.md
parent_task_id: TASK-38
priority: high
ordinal: 256000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-38 (Partners page: Oglašujte pri nas) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-38 merged to main (TASK-38.2, TASK-38.3, TASK-38.1); leads add any later TASK-38 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a visitor, when they open the Partners page (SL: Oglašujte pri nas), then they see the pitch, ad formats and slots (media kit), audience stats (registered users, active reports, reunions by region) and a contact form.
- [ ] #2 Given the stats, when computed, then they come from our DB (optionally enriched from the GA Data API behind a flag once credentials exist), are aggregated, cached for at most 1 hour and any figure below 5 is shown as under 5.
- [ ] #3 Given the contact form, when submitted, then company, contact, region of interest and message are validated, captcha and rate limiting apply, the lead is stored for admins and emailed to the client and consent to be contacted is explicit.
- [ ] #4 Given SL and EN, when switched, then copy is final (no placeholders) and the page has meta tags and an Open Graph image and is indexable.
- [ ] #5 Given a nearly empty database, when stats are low, then the page reads honestly (shows pilot status) and never shows invented numbers.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
