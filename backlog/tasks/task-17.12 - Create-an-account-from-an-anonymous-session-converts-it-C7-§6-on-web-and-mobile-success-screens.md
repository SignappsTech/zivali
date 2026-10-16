---
id: TASK-17.12
title: >-
  Create an account from an anonymous session converts it (C7 §6) on web and
  mobile success screens
status: In Progress
assignee: []
created_date: '2026-10-16 05:45'
updated_date: '2026-10-16 06:26'
labels:
  - fe
dependencies: []
parent_task_id: TASK-17
priority: medium
ordinal: 348000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-30.2 web review: the found success screen's 'Create an account' goes to /registracija, which calls signUp and starts a NEW user, so the anonymous report access is not kept as the copy promises. TASK-17.1 AC#5 already supports converting the anonymous user in place (same id, report_managers kept). Wire the conversion (Supabase updateUser with email and password on the anonymous session, then the email verification) from the web and mobile success screens of the found and lost flows, P16 copy, and keep the manage link valid.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 From an anonymous session, creating an account keeps the same user id and access to the reports made anonymously (web vitest and mobile jest with the auth client mocked; API test exists from TASK-17.1)
- [ ] #2 A signed-in (non-anonymous) viewer never sees the conversion offer; the plain sign-up page is unchanged
<!-- AC:END -->
