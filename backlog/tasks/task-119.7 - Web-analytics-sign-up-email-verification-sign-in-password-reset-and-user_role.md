---
id: TASK-119.7
title: >-
  Web analytics: sign-up, email verification, sign-in, password reset and
  user_role
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 23:53'
updated_date: '2026-10-20 09:44'
labels:
  - fe
  - 'est:M'
  - no-design
  - web
milestone: m-1
dependencies:
  - TASK-119.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C12b-analytics-tracking-plan.md§3. Flows and steps
  - >-
    docs/tech/contracts/C12b-analytics-tracking-plan.md§4. Errors (where people
    get stuck)
  - docs/tech/contracts/C12-analytics-consent.md§Event registry
parent_task_id: TASK-119
priority: high
ordinal: 518200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Auth funnel and the user_role user property (configured in GA4, never sent so far). Files owned: apps/web/components/auth/** (sign-up.tsx, sign-in.tsx, reset.tsx, provider-buttons.tsx, gate-dialog.tsx, session-sync.tsx and tests), apps/web/app/[locale]/auth/callback/route.ts and route.test.ts, apps/web/lib/auth.ts and lib/auth-light.ts if the provider redirect needs a provider marker.

Hints: a provider return is new when the user created_at is within a couple of minutes of the return; keep the public auth forms within their bundle rules (frontend.md §Standards, Auth bundle): @zivali/analytics is fine, no static @/lib/auth import. No new copy.

## Packet
Unblocks on: TASK-119.2 (registry: login, sign_up methods, flowTracker)
Branch: agent/TASK-119.7-analytics-auth
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 sign_up flow: flow_step form when the sign-up form shows (page or P16 dialog), sent when check-your-email shows, verified when a confirmation link lands; sign_up { method } fires with email on a successful sign-up request, convert as today, google or apple on the first provider return for a new account
- [ ] #2 sign_in and reset_password: flow_step sign_in form; login { method: password | google | apple } on success (provider: on return for an existing account); reset_password request, sent, new_password, done
- [ ] #3 Refusals send one flow_error with the field key and code: client checks on name, email, password; CONFLICT, CAPTCHA_FAILED, RATE_LIMITED, UNVERIFIED_EMAIL, NETWORK, invalid_credentials, link_expired, oauth_failed; never the address or a message
- [ ] #4 The callback marks a successful signup or provider exchange on its redirect with a query marker that the page removes after sending (history.replaceState) and that trackScreen never sends; route.test.ts covers the marker
- [ ] #5 setUserRole is called once the session is known: admin or shelter from the profile role, finder for an anonymous finder session (C7), else owner; component tests on the mock adapter cover each path and nothing without consent; pnpm verify passes
<!-- AC:END -->
