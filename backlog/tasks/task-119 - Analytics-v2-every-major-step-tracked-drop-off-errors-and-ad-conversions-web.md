---
id: TASK-119
title: >-
  Analytics v2: every major step tracked, drop-off, errors and ad conversions
  (web)
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-19 23:31'
updated_date: '2026-10-19 23:49'
labels:
  - story
  - 'req:FR-038'
  - 'req:NFR-PRIV'
milestone: m-1
dependencies: []
priority: high
ordinal: 511200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-10-20: GA4 implemented as fully as possible, to have stats for our ads and to see where people get stuck; every major step of every main flow is tracked. Builds on TASK-7 (packages/analytics, 17-event registry, consent-gated GA4 adapter). Web only for the pilot; mobile parity later.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given no analytics consent, when any flow is used on najdimo.si, then no request reaches Google and no _ga cookie is set (unchanged C12)
- [ ] #2 Given consent, when a person goes through each main flow (report lost, report found, sighting, sign-up with email verification, sign-in, reset password, match review, chat, mark reunited, share and poster, alert opt-in, shelter search, map and list, checkout, partner enquiry), then GA4 DebugView shows a flow_step for every step shown and the flow's outcome event, with the params in C12b §3
- [ ] #3 Given a refused step or a failed request, when it happens, then flow_error carries flow, step, error_code and the field key only (never a value or message); photo upload and AI pre-fill outcomes are sent (C12b §4, §5)
- [ ] #4 Given a checkout, when it starts and settles, then begin_checkout and (on success, once per payment) purchase plus the product event are sent with value, currency and purpose; supporter_subscribe fires for a Podpornik subscription
- [ ] #5 Given a visit that lands with utm_* and grants consent after an in-app navigation, when the first page_view is sent, then it carries the landing utm_*; click ids are never sent
- [ ] #6 Given our own ad slots, when an ad is viewable for 1 s or pressed, then ad_slot_impression (once per ad per page view) and ad_slot_click are sent with ad_slot and ad_id
- [ ] #7 Given the GA4 property, when checked through the admin API, then Enhanced measurement is off, defaultUri is https://najdimo.si, the C12b §8 custom dimensions and key events exist, and the UI-only steps are recorded with who and when
<!-- AC:END -->
