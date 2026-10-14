---
id: TASK-76
title: Launch readiness and go-live checklist
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:05'
labels:
  - story
  - 'req:NFR-AVAIL'
milestone: m-4
dependencies:
  - TASK-68
  - TASK-69
  - TASK-70
  - TASK-71
  - TASK-74
  - TASK-72
priority: high
ordinal: 76000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A final gate ensures quality, legal and operational conditions are met before the pilot goes public.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the exit criteria of M1-M5, when reviewed, then all gates are green (CI, e2e, accessibility, performance, security) and the QA report is complete.
- [ ] #2 Given production, when prepared, then domain, DNS, TLS, environment variables, GA4 and Firebase production streams (client-provided), Stripe test-mode confirmation, monitoring and backups are verified.
- [ ] #3 Given go-live, when executed, then a rollback plan and on-call contact exist and a smoke test passes on production.
- [ ] #4 Given client UAT, when signed off, then the handover documents are complete.
<!-- AC:END -->

## Packet

Unblocks on: all hardening and legal stories complete (TASK-68, TASK-69, TASK-70, TASK-71, TASK-74, TASK-72)
