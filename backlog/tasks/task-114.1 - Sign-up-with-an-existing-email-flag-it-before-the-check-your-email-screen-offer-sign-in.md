---
id: TASK-114.1
title: >-
  Sign-up with an existing email: flag it before the check-your-email screen,
  offer sign-in
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 13:20'
updated_date: '2026-10-18 01:53'
labels:
  - bug
  - fe
  - auth
  - 'est:S'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: high
ordinal: 360100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: signing up on najdimo.si with an address that already has a confirmed account shows the "check your email" screen, but no email ever comes (Auth log: `user_repeated_signup`; Supabase sends nothing for an existing confirmed account, and "resend" sends nothing either). The user waits for a mail that never arrives.

Cause: apps/web/lib/auth.ts `signUp` treats every 200 as "confirmation sent". For an existing confirmed address Supabase answers 200 with a user whose `identities` array is empty (email enumeration protection).

Wanted (owner): flag the existing address on the sign-up form, before the verify-email step, or simply offer sign-in: e.g. "Ta e-naslov že ima račun" with "Vpiši se" (prefilled email) and "Pozabljeno geslo" actions. Trade-off to note in the PR: this tells anyone that an address is registered (the enumeration Supabase hides by default); the owner prefers the clearer UX. An unconfirmed existing address keeps today's behaviour (Supabase resends the confirmation).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sign-up with an existing confirmed email does not show the check-your-email screen; it shows a message that the address already has an account, with sign-in (email prefilled) and forgot-password actions, in SL and EN
- [ ] #2 Sign-up with a new email and with an existing unconfirmed email behave as today
- [ ] #3 The same check covers every sign-up entry (the sign-up page and the hand-off from the report flows, `next=`), and the anonymous-to-account conversion (C7) if it can hit an existing address
- [ ] #4 Unit tests for the three cases (new, existing confirmed via empty identities, existing unconfirmed)
<!-- AC:END -->

## Packet

Branch: agent/task-114.1-signup-existing-email
