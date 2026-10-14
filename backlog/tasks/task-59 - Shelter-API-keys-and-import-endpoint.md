---
id: TASK-59
title: Shelter API keys and import endpoint
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:05'
labels:
  - story
  - 'req:FR-028'
milestone: m-3
dependencies:
  - TASK-58
  - TASK-47
priority: low
ordinal: 59000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shelters with their own software want automatic sync instead of manual uploads.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a Pro organisation, when an owner creates an API key, then it is shown once, stored hashed, scoped to the organisation and revocable.
- [ ] #2 Given a valid key, when a client posts intake records (same schema as CSV), then they are validated and created idempotently by external id, with per-key rate limits and clear errors.
- [ ] #3 Given the API, when documented, then an OpenAPI description and examples exist in the portal.
- [ ] #4 Given audit needs, when keys are used, then last used time and request counts are visible.
<!-- AC:END -->

## Packet

Unblocks on: plan gating (TASK-58); intake record schema and validation from CSV import (TASK-47)
