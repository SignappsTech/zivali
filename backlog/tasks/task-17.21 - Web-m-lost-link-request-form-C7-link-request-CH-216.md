---
id: TASK-17.21
title: 'Web /m: lost-link request form (C7 link-request; CH-216)'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:36'
labels:
  - fe
  - 'est:S'
  - web
dependencies:
  - TASK-17.19
  - TASK-30.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C7-anonymous-manage-link.md§REST
  - docs/design/pages/P7-report-found.md
  - docs/content/pages/P7-report-found.md
parent_task_id: TASK-17
priority: medium
ordinal: 496200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
P7 'Lost link': a neutral request form with the generic answer, for finders whose link is missing or no longer works.

## Packet
Unblocks on: TASK-17.19 (POST /v1/manage/link-request) merged; design TASK-30.1 done
Branch: agent/task-17.21-web-m-lost-link-form
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /m without a usable token (none, unknown or gone) offers the form `report_found.resend_title`, `resend_body`, email field and `resend_button`; submit signs in anonymously with Turnstile as the claim does and calls POST /v1/manage/link-request; every 202 shows `report_found.resend_done`; RATE_LIMITED shows the generic rate text
- [ ] #2 Label above the field, errors tied with aria-describedby, works at 200 % text; component tests and an e2e for the 202 path
<!-- AC:END -->
