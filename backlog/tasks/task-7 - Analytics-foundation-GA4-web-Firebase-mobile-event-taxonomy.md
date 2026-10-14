---
id: TASK-7
title: 'Analytics foundation: GA4 web, Firebase mobile, event taxonomy'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:01'
labels:
  - story
  - 'req:FR-038'
  - 'req:NFR-PRIV'
milestone: m-0
dependencies:
  - TASK-3
priority: high
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GA4 drives product decisions and the sponsor pitch from day one; a typed track() wrapper and one event taxonomy let every feature emit the same events on web and mobile without leaking personal data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the web app and no analytics consent, when pages load, then no GA script is fetched and no analytics cookie is set, and Consent Mode v2 defaults (analytics_storage, ad_storage, ad_user_data, ad_personalization) are denied before any tag.
- [ ] #2 Given consent is granted, when a user navigates, then GA4 receives page views on web and Firebase Analytics receives screen views on mobile in the same property through a separate data stream.
- [ ] #3 Given the taxonomy, when a developer calls track(), then only registered events with allowlisted parameters are accepted: report_lost_start, report_lost_submit, report_found_start, report_found_submit, match_suggested, match_confirmed, chat_started, reunited, boost_purchase, donation, supporter_subscribe, ad_impression, ad_click, share, poster_download, alert_opt_in.
- [ ] #4 Given any event, when sent, then it carries region or municipality and species dimensions where relevant and never contains names, emails, chip numbers, exact coordinates or free text, and a unit test rejects non-allowlisted parameters.
- [ ] #5 Given local development and tests, when running, then a mock adapter records events without network calls and GA4 DebugView setup is documented.
- [ ] #6 Given the client-provided GA4 property and Firebase project, when configured, then custom dimensions, key events, 14-month retention, Google signals off and data sharing off are documented in a setup checklist.
<!-- AC:END -->

## Packet

Unblocks on: packages/analytics location and adapter pattern merged (TASK-3)
