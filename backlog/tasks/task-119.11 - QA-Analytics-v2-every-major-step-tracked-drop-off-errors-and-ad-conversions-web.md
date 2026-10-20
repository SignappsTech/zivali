---
id: TASK-119.11
title: >-
  QA: Analytics v2: every major step tracked, drop-off, errors and ad
  conversions (web)
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-19 23:54'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-119.1
  - TASK-119.2
  - TASK-119.3
  - TASK-119.4
  - TASK-119.5
  - TASK-119.6
  - TASK-119.7
  - TASK-119.8
  - TASK-119.9
  - TASK-119.10
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C12b-analytics-tracking-plan.md§3. Flows and steps
  - >-
    docs/tech/contracts/C12b-analytics-tracking-plan.md§8. GA4 property config
    (admin client; TASK-119 GA4 tasks)
  - >-
    docs/tech/contracts/C12-analytics-consent.md§Web wiring (basic Consent Mode
    v2)
parent_task_id: TASK-119
priority: high
ordinal: 522200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-119 on main and on najdimo.si (Stripe test mode). DebugView: open the site with ?debug_mode=1 after Accept; GA4 Admin -> DebugView for stream G-PKY4SCX3RL. Read-only GA checks: node <project root>/.secrets/ga-admin.mjs <project root> GET <path> (no writes, never print key material). Check every outgoing collect request for forbidden values (C12 §Parameters: names, emails, phones, chip numbers, coordinates, free text, short codes, payment or user ids, error messages).

## Packet
Unblocks on: TASK-119.1 to TASK-119.10 merged and deployed (web)
Branch: - (QA notes; bug tasks for failures)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given no analytics consent, when any flow is used on najdimo.si, then no request reaches Google and no _ga cookie is set (unchanged C12)
- [ ] #2 Given consent, when a person goes through each main flow (report lost, report found, sighting, sign-up with email verification, sign-in, reset password, match review, chat, mark reunited, share and poster, alert opt-in, shelter search, map and list, checkout, partner enquiry), then GA4 DebugView shows a flow_step for every step shown and the flow outcome event, with the params in C12b §3
- [ ] #3 Given a refused step or a failed request, when it happens, then flow_error carries flow, step, error_code and the field key only (never a value or message); photo upload and AI pre-fill outcomes are sent (C12b §4, §5)
- [ ] #4 Given a checkout, when it starts and settles, then begin_checkout and (on success, once per payment) purchase plus the product event are sent with value, currency and purpose; supporter_subscribe fires for a Podpornik subscription
- [ ] #5 Given a visit that lands with utm_* and grants consent after an in-app navigation, when the first page_view is sent, then it carries the landing utm_*; click ids are never sent
- [ ] #6 Given our own ad slots, when an ad is viewable for 1 s or pressed, then ad_slot_impression (once per ad per page view) and ad_slot_click are sent with ad_slot and ad_id
- [ ] #7 Given the GA4 property, when checked through the admin API, then Enhanced measurement is off, defaultUri is https://najdimo.si, the C12b §8 custom dimensions and key events exist, and the UI-only steps are recorded with who and when
- [ ] #8 Story gates pass on main: pnpm verify, plus pnpm quality for the pages this story touches; results recorded in the QA notes
<!-- AC:END -->
