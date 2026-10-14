---
id: TASK-7.4
title: 'QA: Analytics foundation: GA4 web, Firebase mobile, event taxonomy'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-0
dependencies:
  - TASK-7.1
  - TASK-7.2
  - TASK-7.3
references:
  - docs/tech/frontend.md
parent_task_id: TASK-7
priority: high
ordinal: 224000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-7 (Analytics foundation: GA4 web, Firebase mobile, event taxonomy) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-7 merged to main (TASK-7.1, TASK-7.2, TASK-7.3); leads add any later TASK-7 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the web app and no analytics consent, when pages load, then no GA script is fetched and no analytics cookie is set, and Consent Mode v2 defaults (analytics_storage, ad_storage, ad_user_data, ad_personalization) are denied before any tag.
- [ ] #2 Given consent is granted, when a user navigates, then GA4 receives page views on web and Firebase Analytics receives screen views on mobile in the same property through a separate data stream.
- [ ] #3 Given the taxonomy, when a developer calls track(), then only registered events with allowlisted parameters are accepted: report_lost_start, report_lost_submit, report_found_start, report_found_submit, match_suggested, match_confirmed, chat_started, reunited, boost_purchase, donation, supporter_subscribe, ad_impression, ad_click, share, poster_download, alert_opt_in.
- [ ] #4 Given any event, when sent, then it carries region or municipality and species dimensions where relevant and never contains names, emails, chip numbers, exact coordinates or free text, and a unit test rejects non-allowlisted parameters.
- [ ] #5 Given local development and tests, when running, then a mock adapter records events without network calls and GA4 DebugView setup is documented.
- [ ] #6 Given the client-provided GA4 property and Firebase project, when configured, then custom dimensions, key events, 14-month retention, Google signals off and data sharing off are documented in a setup checklist.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
