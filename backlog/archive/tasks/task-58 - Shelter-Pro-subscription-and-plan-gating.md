---
id: TASK-58
title: Shelter Pro subscription and plan gating
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:05'
labels:
  - story
  - 'req:FR-028'
milestone: m-3
dependencies:
  - TASK-52
  - TASK-44
priority: medium
ordinal: 58000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Basic shelter use is free; Shelter Pro (integrations, analytics, adoption page, municipality reports) needs a plan boundary enforced server-side.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a verified organisation owner, when they subscribe to Shelter Pro (test price EUR 29 per month, configurable), then the organisation entitlement is active for all members.
- [ ] #2 Given a free organisation, when it uses bulk upload, CSV, matches and chip lookup, then they stay free within fair use.
- [ ] #3 Given a Pro-only feature, when a free organisation uses it, then the UI shows an upgrade prompt and the API returns a gated error.
- [ ] #4 Given the subscription ends, when it lapses, then Pro data is retained read-only.
<!-- AC:END -->

## Packet

Unblocks on: hasEntitlement for organisations (TASK-52); organisation id and owner role (TASK-44)
