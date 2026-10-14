---
id: TASK-59
title: Shelter API keys and import endpoint
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:05'
updated_date: '2026-10-14 22:01'
labels:
  - story
  - 'req:FR-028'
milestone: m-2
dependencies:
  - TASK-47
priority: low
ordinal: 59000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shelters with their own software want automatic sync instead of manual uploads; free for every verified organisation, like all shelter tools (mission first, no paid shelter tier).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a verified organisation owner, when they create an API key, then it is shown once, stored hashed, scoped to the organisation and revocable, with no plan, payment or entitlement check.
- [ ] #2 Given a valid key, when a client posts intake records (same schema as CSV), then they are validated and created idempotently by external id, with clear errors.
- [ ] #3 Given abuse protection, when a key exceeds the documented per-key rate limit (the same for every organisation), then it gets a clear 429 response.
- [ ] #4 Given the API, when documented, then an OpenAPI description and examples exist in the portal.
- [ ] #5 Given audit needs, when keys are used, then last used time and request counts are visible.
<!-- AC:END -->

## Packet

Unblocks on: intake record schema and validation from CSV import (TASK-47; organisation guard comes with it)
