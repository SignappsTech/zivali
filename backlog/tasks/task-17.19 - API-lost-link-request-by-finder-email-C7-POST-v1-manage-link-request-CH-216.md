---
id: TASK-17.19
title: >-
  API: lost-link request by finder email (C7 POST /v1/manage/link-request;
  CH-216)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:30'
labels:
  - be
  - 'est:S'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C7-anonymous-manage-link.md§REST
parent_task_id: TASK-17
priority: medium
ordinal: 478200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision CH-216: the P7 lost-link form (a neutral request form, content `report_found.resend_*`) gets an endpoint. It never reveals whether an address is on file.

## Packet
Unblocks on: -
Branch: agent/task-17.19-manage-link-request
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `POST /v1/manage/link-request { email }` (auth: anonymous or user) answers 202 for every well-formed body (unknown address, no manageable report, limits reached); VALIDATION only for a malformed body
- [ ] #2 The answer is sent before any lookup: job `manage.link_request` carries only the email HMAC and the request id (never a token or the address in clear) and, for at most the 5 newest manageable reports (not removed, within the reopen window) whose `report_contacts` email matches case-insensitively, issues a new token and emails it as resend does (hash written after a successful send; the 3 per report per day resend limit is shared)
- [ ] #3 Rate limits 5 per hour per IP and 3 per day per email HMAC → RATE_LIMITED; route and job tests (match, no match, limit)
<!-- AC:END -->
