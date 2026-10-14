---
id: TASK-34
title: Admin console shell
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:03'
labels:
  - story
  - 'req:FR-019'
milestone: m-1
dependencies:
  - TASK-9
  - TASK-8
  - TASK-11
priority: high
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ads, abuse reports, organisation verification and orders all need an admin area; the shell with roles and an audit log must exist early so those stories can plug in.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a user with the admin or moderator role, when they open the admin area, then they see a navigation shell (Ads, Reports, Organisations, Users, Orders, KPIs) filtered by role and everyone else is redirected or gets 403.
- [ ] #2 Given any admin action, when performed, then an audit log entry (who, what, when, target) is stored and viewable by admins.
- [ ] #3 Given admin roles, when they sign in, then strong authentication (TOTP or equivalent, decided in the TDD) is required.
- [ ] #4 Given the first admin, when bootstrapping a new environment, then a documented script creates the initial admin without a public sign-up path.
- [ ] #5 Given the admin area, when used, then it is web-only, SL and EN, and core tables and forms meet WCAG 2.2 AA.
<!-- AC:END -->

## Packet

Unblocks on: role claims (TASK-9); primitives (TASK-8); admin route group and layout (TASK-11)
