---
id: TASK-114.26
title: Auth e2e still expects the old taken-address behaviour (TASK-114.1)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 03:57'
labels:
  - bug
  - fe
  - 'est:XS'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 366200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
apps/web/e2e/auth.spec.ts:102 'sign-up: a taken address looks like a new one (check your email), in English' fails on main since TASK-114.1 (owner's choice 2026-10-16: a confirmed address is named on the email field with sign-in and forgot-password links instead of the check-your-email screen). The spec answers signup with 422 user_already_exists and expects 'Check your email'. Rewrite it for the new behaviour, in English as before: the email field shows the taken-address error (auth.error_email_taken, EN copy), focus moves to the field, the 'Sign in' link carries the email and next, the 'Forgot password?' link carries the email, axe clean. Keep a case for an unconfirmed address if the mock can express it (Supabase 200 with identities, which still goes to Check your email). Test-only; read components/auth/sign-up.tsx and lib/auth.ts for the exact strings and conditions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 auth.spec.ts covers the taken-address error and its links in EN, and the unconfirmed case if expressible; the lead runs it green on main
<!-- AC:END -->
