---
id: TASK-105
title: 'e2e: verifiable test session for signed-in and admin specs'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-15 20:10'
updated_date: '2026-10-15 18:12'
labels:
  - bug
  - web
  - e2e
  - 'est:S'
dependencies: []
references:
  - apps/web/e2e/admin-directory.spec.ts
  - apps/web/lib/viewer.ts
priority: high
ordinal: 327000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Since TASK-11.2 the (admin), (app) and (portal) layouts verify the Supabase session signature on the server (getClaims). The admin-directory e2e spec still fakes an unsigned session cookie, so the server redirects and 4 specs fail on CI; they are marked test.fixme to unblock the first staging deploy. Give e2e a verifiable session without weakening the guard: e.g. the e2e mock server signs test access tokens with a test key and serves the matching JWKS (or the /auth/v1 endpoints getClaims/getUser call), and the e2e web build points NEXT_PUBLIC_SUPABASE_URL at it. No test-only bypass in app code.

## Packet

Branch: agent/task-105-e2e-session
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A shared e2e helper signs in as a given role (user, moderator, admin with aal2) with a token the server guard accepts
- [ ] #2 The 4 admin-directory specs are re-enabled (test.fixme removed) and pass 3 runs in a row; the moderator access-denied spec still proves no directory data reaches the page
- [ ] #3 A spec proves a forged/unsigned cookie is still redirected (the guard isn't weakened)
- [ ] #4 No app-code bypass for tests (grep for E2E/test flags in apps/web/app and lib)
<!-- AC:END -->
