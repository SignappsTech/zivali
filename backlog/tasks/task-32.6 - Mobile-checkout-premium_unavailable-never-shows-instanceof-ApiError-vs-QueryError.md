---
id: TASK-32.6
title: >-
  Mobile checkout: premium_unavailable never shows (instanceof ApiError vs
  QueryError)
status: In Progress
assignee: []
created_date: '2026-10-16 07:00'
updated_date: '2026-10-16 07:19'
labels:
  - bug
  - mobile
dependencies: []
parent_task_id: TASK-32
priority: low
ordinal: 352000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found during TASK-33.2: apps/mobile checkout.tsx checks error instanceof ApiError, but startCheckout rejects with an RTK QueryError ({ status, data: { code } }), so the premium_unavailable state never shows and the generic error appears instead. Map the error the way other mobile screens do (errorCode helper on QueryError) and add a jest test for the unavailable case.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A checkout rejected with the premium-unavailable code shows the premium_unavailable copy (jest), other errors unchanged
<!-- AC:END -->

Branch: agent/task-32.6-checkout-error-mob
