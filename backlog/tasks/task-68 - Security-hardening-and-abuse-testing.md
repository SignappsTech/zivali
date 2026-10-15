---
id: TASK-68
title: Security hardening and abuse testing
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:05'
updated_date: '2026-10-14 21:06'
labels:
  - story
  - 'req:NFR-SEC'
milestone: m-4
dependencies:
  - TASK-17
  - TASK-49
  - TASK-35
priority: high
ordinal: 68000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Anonymous endpoints, chip lookup, payments and API keys are the attack surface; a structured pass before launch finds what feature work missed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given every table, when RLS is audited, then a test matrix proves anonymous, user, organisation member, moderator and admin access per policy and no table is public by accident.
- [ ] #2 Given the anonymous, chip lookup, contact form and API endpoints, when load and abuse tests run, then documented rate limits hold, captcha is enforced and no personal data leaks in errors or logs.
- [ ] #3 Given dependencies and secrets, when scanned, then there are no high or critical findings and secrets are rotated and documented.
- [ ] #4 Given selected OWASP ASVS level 1 checks, when run, then findings are fixed or accepted with a written reason.
- [ ] #5 Given file uploads, URL fetches (CSV photos), ad redirects and webhooks, when tested, then SSRF, open redirect, unrestricted upload and signature checks are verified.
- [ ] #6 Given analytics on all key flows, when events are inspected, then no personal data reaches GA4 (automated check).
<!-- AC:END -->

## Packet

Unblocks on: attack surfaces implemented: anonymous submit (TASK-17), chip lookup (TASK-49), ad redirect (TASK-35); API keys (TASK-59) are audited too if shipped, but do not gate this story
